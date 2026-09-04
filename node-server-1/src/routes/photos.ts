import { Router, type Request, type Response } from "express";
import mongoose from "mongoose";
import axios from "axios";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import FormData from "form-data";
import pLimit from "p-limit";
import { FLASK_URL, UPLOAD_DIR } from "../config";
import Event from "../models/Event";
import Photo from "../models/Photo";
import { Job, enqueue, markDone, markFailed } from "../queue/mongoQueue";
import { uploadDuration } from "../metrics";
import logger from "../utils/logger";
import { deleteObject } from "../utils/r2";
import { upload } from "../middleware/upload";

const router = Router();

//---------------------------------------------------------------------------------------------------------

router.post('/photo', upload.array('name', 100), async (req: Request, res: Response) => {
    const endTimer = uploadDuration.startTimer();
    try {
        const files = (req.files as Express.Multer.File[] | undefined) || [];
        const body: unknown = req.body;
        const event_id: unknown = body && typeof body === "object" && "event_id" in body ? body.event_id : undefined;
        const upload_by: unknown = body && typeof body === "object" && "upload_by" in body ? body.upload_by : undefined;
        const folderRaw: unknown = body && typeof body === "object" && "folder_name" in body ? body.folder_name : undefined;
        const wantFolder = typeof folderRaw === "string" && folderRaw.trim() ? folderRaw.trim().slice(0, 60) : "General";
        if (!event_id) return res.status(400).send({ error: 'event_id required' });
        if (typeof event_id !== "string" || !mongoose.Types.ObjectId.isValid(event_id)) return res.status(400).send({ error: 'invalid event_id' });
        if (upload_by !== undefined && typeof upload_by !== "string") return res.status(400).send({ error: 'upload_by must be a string' });
        if (files.length === 0) return res.status(400).send({ error: 'no files uploaded' });
        const eventExists = await Event.findById(event_id).select('_id folders');
        if (!eventExists) return res.status(404).send({ error: 'event not found' });
        // Canonical folder spelling from the event taxonomy — rejects typos/phantoms, 'General' always valid
        const validFolders: string[] = ['General'];
        // Pre-PR1 events have no folders key — treat as empty taxonomy, not a crash
        for (const f of eventExists.folders || []) validFolders.push(f.name);
        const canonical = validFolders.find((n) => n.toLowerCase() === wantFolder.toLowerCase());
        if (!canonical) return res.status(400).send({ error: `unknown folder_name. Valid: ${validFolders.join(', ')}` });
        const folder_name = canonical;

        const limit = pLimit(6);

        const results: any[] = await Promise.all(
            files.map(file => limit(async (): Promise<any> => {
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
            }))
        );

        const failed = results.filter(r => r && r.error);
        endTimer();
        // 207 Multi-Status if partial failures, 200 if all ok
        if (failed.length > 0 && failed.length < results.length) return res.status(207).send(results);
        if (failed.length === results.length) return res.status(422).send(results);
        res.status(200).send(results);
    } catch (error: any) {
        logger.error('[photo] upload error', error);
        endTimer();
        res.status(500).json({ result: 'An error occurred while uploading images', error: error.message });
    }
});


//-----------------------------------------------------------------------------------------------------
const deleteImageHandler = async (req: Request, res: Response) => {
    try {
        const { name, _id } = req.body || {};
        if (!_id) return res.status(400).json({ success: false, message: "Missing image ID" });
        if (!mongoose.Types.ObjectId.isValid(_id)) return res.status(400).json({ success: false, message: "Invalid image ID" });

        const query = name ? { name, _id: new mongoose.Types.ObjectId(_id) } : { _id: new mongoose.Types.ObjectId(_id) };
        const result = await Photo.findOneAndDelete(query);
        if (!result) return res.status(404).json({ success: false, message: "Image not found in database" });

        if (result.event_id) {
            if (result.hash) {
                try { await Job.deleteOne({ event_id: result.event_id, photo_hash: result.hash }).catch(()=>{}); } catch(_){}
            }
            try { await axios.post(`${FLASK_URL}/faiss_remove`, { event_id: result.event_id, photo_id: _id }, { timeout: 5000 }).catch(()=>{}); } catch(_){}
        }

        const fileName = result.name || name;
        if (fileName) {
            const imagePath = path.join(UPLOAD_DIR, fileName);
            if (fs.existsSync(imagePath)) {
                try { fs.unlinkSync(imagePath); } catch (err) { logger.warn('[delete-image] unlink error', err); }
            }
            deleteObject(fileName).catch(() => {});
        }
        return res.json({ success: true, message: "Image deleted successfully" });
    } catch (error: any) {
        logger.error('[delete-image]', error);
        res.status(500).json({ success: false, message: "Error deleting image!" });
    }
};

router.delete('/delete-image', deleteImageHandler);
router.delete('/delete-img', deleteImageHandler);

//-----------------------------------------------------------------------------------------------------

router.get('/download/:filename', (req: Request, res: Response) => {
    try {
        const filename = req.params.filename;
        if (!filename || typeof filename !== 'string') {
            return res.status(400).json({ error: 'Filename is required' });
        }
        const baseName = path.basename(filename);
        const resolvedUploadDir = path.resolve(UPLOAD_DIR) + path.sep;
        const safePath = path.resolve(UPLOAD_DIR, baseName);
        if (!safePath.startsWith(resolvedUploadDir)) {
            return res.status(403).json({ error: 'Access denied' });
        }
        if (!fs.existsSync(safePath)) {
            return res.status(404).json({ error: 'File not found' });
        }
        let originalName = baseName;
        const match = originalName.match(/^\d+-(.+)$/);
        if (match && match[1]) {
            originalName = match[1];
        }
        const sanitizedOriginalName = originalName.replace(/[\r\n"\x00-\x1f\\]/g, '_').slice(0, 255);
        res.download(safePath, sanitizedOriginalName, (err) => {
            if (err && !res.headersSent) {
                logger.error('Download stream error', err);
                res.status(500).json({ error: 'Failed to stream download' });
            }
        });
    } catch (err) {
        logger.error('Download error', err);
        res.status(500).json({ error: 'Failed to download file' });
    }
});

export default router;
