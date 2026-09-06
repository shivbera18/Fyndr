import mongoose from "mongoose";
import axios from "axios";
import crypto from "crypto";
import fs from "fs";
import FormData from "form-data";
import { FLASK_URL } from "../config";
import Photo from "../models/Photo";
import { enqueue, markDone, markFailed } from "../queue/mongoQueue";

export interface UploadFile {
  path: string;
  filename: string;
  originalname: string;
}

export interface UploadContext {
  event_id: string;
  upload_by?: string;
  folder_name: string;
}

// Shared single-file ingest: stream-hash -> Photo/queue dedupe -> ML embedding
// -> Photo doc. Moved verbatim from POST /photo so the camera-to-cloud FTP
// watcher feeds the identical pipeline (same hashes, same dedupe, same FAISS flow).
export async function processUploadedFile(file: UploadFile, ctx: UploadContext): Promise<unknown> {
  const { event_id, upload_by, folder_name } = ctx;
  let hash = '';
  try {
    // non-blocking streaming hash (avoid fs.readFileSync blocking event loop)
    hash = await new Promise<string>((resolve, reject) => {
      const h = crypto.createHash('sha256');
      const s = fs.createReadStream(file.path);
      s.on('error', reject);
      s.on('data', d => h.update(d));
      s.on('end', () => resolve(h.digest('hex')));
    });
  } catch (e: any) {
    return { file: file.originalname, error: 'hash failed: ' + e.message, status: 'failed' };
  }

  // Per-event idempotency: check Photo first (fast path)
  try {
    const existingPhoto = await Photo.findOne({ event_id, hash });
    if (existingPhoto) {
      try { fs.unlinkSync(file.path); } catch(_){}
      await markDone(event_id, hash).catch(()=>{});
      // Re-upload targets a move: keep grouping truthful
      if (existingPhoto.folder_name !== folder_name) {
        existingPhoto.folder_name = folder_name;
        await existingPhoto.save();
      }
      return existingPhoto;
    }
  } catch(_){}

  const q: any = await enqueue(event_id, hash, file.filename);
  if (q && q.status === 'done') {
    try { fs.unlinkSync(file.path); } catch(_){}
    const existing = await Photo.findOne({ event_id, hash });
    return existing || { file: file.originalname, hash, status: 'duplicate', photo_id: q.photo_hash };
  }

  // Pre-generate photoId so we can index FAISS in single ML call
  const photoId = new mongoose.Types.ObjectId();
  const formData = new FormData();
  formData.append('image', fs.createReadStream(file.path));
  formData.append('event_id', event_id);
  formData.append('photo_id', photoId.toString());

  let embeddings: any[] = [];
  try {
    const response: any = await axios.post(`${FLASK_URL}/get_embedding`, formData, {
      headers: { ...formData.getHeaders() },
      maxContentLength: Infinity, maxBodyLength: Infinity, timeout: 60000
    });
    if (response.data.error) throw new Error(response.data.error);
    if (Array.isArray(response.data.embeddings)) {
      embeddings = response.data.embeddings;
    } else if (Array.isArray(response.data.embedding)) {
      embeddings = [response.data.embedding];
    }
  } catch (e: any) {
    await markFailed(event_id, hash, e.message).catch(()=>{});
    try { fs.unlinkSync(file.path); } catch(_){}
    return { file: file.originalname, hash, error: e.message, status: 'failed' };
  }

  try {
    const photo = new Photo({
      _id: photoId,
      name: file.filename,
      event_id, upload_by,
      embedding: JSON.stringify(embeddings),
      hash, status: 'done',
      folder_name,
    });
    await photo.save();
    await markDone(event_id, hash).catch(()=>{});
    return photo;
  } catch (e: any) {
    if (e.code === 11000) {
      // race: another worker saved same hash — clean orphan FAISS vector
      try { fs.unlinkSync(file.path); } catch(_){}
      try { await axios.post(`${FLASK_URL}/faiss_remove`, { event_id, photo_id: photoId.toString() }, { timeout: 3000 }); } catch(_){}
      const dup = await Photo.findOne({ event_id, hash });
      await markDone(event_id, hash).catch(()=>{});
      return dup || { file: file.originalname, hash, error: 'duplicate', status: 'duplicate' };
    }
    // on generic save failure, also try to clean orphan FAISS
    try { await axios.post(`${FLASK_URL}/faiss_remove`, { event_id, photo_id: photoId.toString() }, { timeout: 3000 }); } catch(_){}
    await markFailed(event_id, hash, e.message).catch(()=>{});
    return { file: file.originalname, hash, error: e.message, status: 'failed' };
  }
}
