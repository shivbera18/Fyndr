import { Router, type Request, type Response } from "express";
import mongoose from "mongoose";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import pLimit from "p-limit";
import { UPLOAD_DIR } from "../config";
import Photo from "../models/Photo";
import Event from "../models/Event";
import { Job, enqueue, markFailed } from "../queue/mongoQueue";
import { uploadDuration } from "../metrics";
import logger from "../utils/logger";
import { deleteObject, getObjectBytes, getPresignedPut, g3Key, headObject } from "../utils/r2";
import { watermarked } from "../utils/watermark";
import { IMAGE_MIMES, upload } from "../middleware/upload";
import { removeFaissVector } from "../photos/processUpload";

const router = Router();

//---------------------------------------------------------------------------------------------------------

// Stage-1 only: stream-hash -> Photo/queue dedupe -> queued stub. No ML, no G3,
// no Drive, no unlink — the ingest worker owns temp files and heavy work.
async function stagePhoto(
  file: Express.Multer.File,
  ctx: { event_id: string; upload_by?: string; folder_name: string }
): Promise<unknown> {
  const { event_id, upload_by, folder_name } = ctx;
  // Route owns the multer temp on every non-stub path: dup paths create no
  // Job (worker could never name the file), so only the staged stub's file
  // transfers ownership to the ingest worker.
  const unlinkQuiet = (p: string): Promise<void> => fs.promises.unlink(p).catch(() => {});
  let hash = "";
  try {
    hash = await new Promise<string>((resolve, reject) => {
      const h = crypto.createHash("sha256");
      const s = fs.createReadStream(file.path);
      s.on("error", reject);
      s.on("data", (d: string | Buffer) => h.update(d));
      s.on("end", () => resolve(h.digest("hex")));
    });
  } catch (e: unknown) {
    await unlinkQuiet(file.path);
    return { file: file.originalname, error: "hash failed: " + errMsg(e), status: "failed" };
  }

  // Per-event idempotency: check Photo first (fast path). A queued stub
  // without bytes anywhere (interrupted direct PUT) adopts this upload's
  // temp instead of discarding the only bytes — else the stub is
  // unrecoverable through either path.
  try {
    const existingPhoto = await Photo.findOne({ event_id, hash });
    if (existingPhoto) {
      // Re-upload targets a move: keep grouping truthful
      if (existingPhoto.folder_name !== folder_name) {
        existingPhoto.folder_name = folder_name;
        await existingPhoto.save();
      }
      if (existingPhoto.status === "queued") {
        const orphans = await stagedBytesPresent(event_id, existingPhoto.name).catch(() => false);
        if (!orphans) {
          await fs.promises.rename(file.path, path.join(UPLOAD_DIR, existingPhoto.name)).catch(() => {});
          return existingPhoto;
        }
      }
      await unlinkQuiet(file.path);
      return existingPhoto;
    }
  } catch { /* fall through to queue */ }

  let queued: { status: string; photo_hash: string } | null = null;
  try {
    const j = await enqueue(event_id, hash, file.filename);
    if (j) queued = { status: String(j.status), photo_hash: String(j.photo_hash) };
  } catch (e: unknown) {
    await unlinkQuiet(file.path);
    return { file: file.originalname, hash, error: errMsg(e), status: "failed" };
  }
  if (queued && queued.status === "done") {
    const existing = await Photo.findOne({ event_id, hash }).catch(() => null);
    await unlinkQuiet(file.path);
    return existing || { file: file.originalname, hash, status: "duplicate", photo_id: queued.photo_hash };
  }

  const photoId = new mongoose.Types.ObjectId();
  try {
    const stub = new Photo({
      _id: photoId,
      name: file.filename,
      event_id,
      upload_by,
      folder_name,
      hash,
      status: "queued",
    });
    await stub.save();
    return stub;
  } catch (e: unknown) {
    if (typeof e === "object" && e !== null && "code" in e && e.code === 11000) {
      const dup = await Photo.findOne({ event_id, hash }).catch(() => null);
      await unlinkQuiet(file.path);
      return dup || { file: file.originalname, hash, status: "duplicate" };
    }
    const msg = errMsg(e);
    await markFailed(event_id, hash, msg).catch(() => {});
    await unlinkQuiet(file.path);
    return { file: file.originalname, hash, error: msg, status: "failed" };
  }
}

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

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

        // ponytail: stage-1 only — hash + queued stub acks in seconds; ingestWorker owns ML/storage.
        const limit = pLimit(6);

        const results: unknown[] = await Promise.all(
            files.map(file => limit((): Promise<unknown> => stagePhoto(file, { event_id, upload_by, folder_name })))
        );

        const failed = results.filter((r) => typeof r === "object" && r !== null && "error" in r);
        endTimer();
        // 207 Multi-Status if partial failures, 422 if all failed, 202 queued stubs otherwise
        if (failed.length > 0 && failed.length < results.length) return res.status(207).send(results);
        if (failed.length === results.length) return res.status(422).send(results);
        res.status(202).send(results);
    } catch (error: any) {
        logger.error('[photo] upload error', error);
        endTimer();
        res.status(500).json({ result: 'An error occurred while uploading images', error: error.message });
    }
});
// Direct browser-to-G3: verify bytes, stage a queued stub, mint a PUT URL
// (browser never picks keys). Server never sees file bytes; worker pulls
// them from G3. R2 unconfigured → 200 via:"local" with ZERO db writes, so
// the caller falls back to a clean multer upload (no orphan stub).
const MAX_STAGE_BYTES = 50 * 1024 * 1024;
type StageBody = {
  event_id?: unknown; hash?: unknown; filename?: unknown; size?: unknown;
  contentType?: unknown; upload_by?: unknown; folder_name?: unknown;
};
async function resolveStageFolder(eventId: string, wantRaw: unknown): Promise<{ folder?: string; error?: string }> {
  const want = typeof wantRaw === "string" && wantRaw.trim() ? wantRaw.trim().slice(0, 60) : "General";
  const eventExists = await Event.findById(eventId).select("_id folders");
  if (!eventExists) return { error: "event not found" };
  const valid: string[] = ["General"];
  for (const f of eventExists.folders || []) valid.push(f.name);
  const canonical = valid.find((n) => n.toLowerCase() === want.toLowerCase());
  if (!canonical) return { error: `unknown folder_name. Valid: ${valid.join(", ")}` };
  return { folder: canonical };
}
// Tri-state: true = bytes present (local temp or object store), false =
// absent in both, null = store check errored (outage) — callers must not
// treat null as absent.
async function stagedBytesPresent(eventId: string, name: string): Promise<boolean | null> {
  try {
    await fs.promises.stat(path.join(UPLOAD_DIR, name));
    return true;
  } catch { /* fall through to object store */ }
  return headObject(`${eventId}/${name}`);
}
router.post("/photo/stage", async (req: Request, res: Response) => {
  try {
    const b = (req.body || {}) as StageBody;
    const { event_id, hash, filename, size, contentType, upload_by, folder_name: folderRaw } = b;
    if (typeof event_id !== "string" || !mongoose.Types.ObjectId.isValid(event_id))
      return res.status(400).send({ error: "invalid event_id" });
    if (typeof hash !== "string" || !/^[0-9a-f]{64}$/i.test(hash))
      return res.status(400).send({ error: "invalid hash (expect sha256 hex)" });
    if (typeof filename !== "string" || !filename.trim())
      return res.status(400).send({ error: "filename required" });
    if (typeof size !== "number" || !(size > 0) || size > MAX_STAGE_BYTES)
      return res.status(400).send({ error: "invalid size (max 50MB)" });
    if (typeof contentType !== "string" || !IMAGE_MIMES.includes(contentType))
      return res.status(400).send({ error: "unsupported contentType" });
    if (upload_by !== undefined && typeof upload_by !== "string")
      return res.status(400).send({ error: "upload_by must be a string" });
    const rf = await resolveStageFolder(event_id, folderRaw);
    if (rf.error === "event not found") return res.status(404).send({ error: rf.error });
    if (rf.error || !rf.folder) return res.status(400).send({ error: rf.error });
    const folder_name = rf.folder;
    const hex = hash.toLowerCase();
    // Duplicate with bytes → done, no upload. Queued stub without bytes
    // (interrupted PUT) → re-mint the SAME key so the retry overwrites.
    const dup = await Photo.findOne({ event_id, hash: hex }).catch(() => null);
    if (dup) {
      if (dup.folder_name !== folder_name) {
        dup.folder_name = folder_name;
        await dup.save().catch(() => {});
      }
      const bytes = await stagedBytesPresent(event_id, dup.name);
      if (dup.status === "done" || bytes === true) {
        return res.status(200).send({ duplicate: true, photo: dup });
      }
      const url = await getPresignedPut(`${event_id}/${dup.name}`, contentType).catch(() => null);
      if (!url) return res.status(200).send({ photo: dup, key: null, uploadUrl: null, via: "local" });
      return res.status(200).send({ photo: dup, key: `${event_id}/${dup.name}`, uploadUrl: url, via: "r2", expiresIn: 3600 });
    }
    const photoId = new mongoose.Types.ObjectId();
    const safe = path.basename(filename).replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80) || "photo";
    const key = `${event_id}/${photoId}-${safe}`;
    // Presign BEFORE any db write: R2-unconfigured must leave zero trace
    // so the multer fallback uploads cleanly (no orphan stub to collide with).
    let uploadUrl: string | null = null;
    try {
      uploadUrl = await getPresignedPut(key, contentType);
    } catch {
      uploadUrl = null;
    }
    if (!uploadUrl) return res.status(200).send({ photo: null, key: null, uploadUrl: null, via: "local" });
    try {
      const jobDoc = await enqueue(event_id, hex);
      const statusVal = jobDoc && typeof jobDoc === "object" && "status" in jobDoc ? jobDoc.status : undefined;
      if (statusVal === "done") {
        const existing = await Photo.findOne({ event_id, hash: hex }).catch(() => null);
        if (existing && (existing.status === "done" || (await stagedBytesPresent(event_id, existing.name)) === true)) {
          return res.status(200).send({ duplicate: true, photo: existing });
        }
        if (existing) {
          const retryUrl = await getPresignedPut(`${event_id}/${existing.name}`, contentType).catch(() => null);
          if (!retryUrl) return res.status(200).send({ photo: existing, key: null, uploadUrl: null, via: "local" });
          return res.status(200).send({ photo: existing, key: `${event_id}/${existing.name}`, uploadUrl: retryUrl, via: "r2", expiresIn: 3600 });
        }
        return res.status(200).send({ duplicate: true, photo: existing });
      }
    } catch (e: unknown) {
      return res.status(422).send({ error: errMsg(e) });
    }
    let stub;
    try {
      stub = new Photo({ _id: photoId, name: `${photoId}-${safe}`, event_id, upload_by, folder_name, hash: hex, status: "queued" });
      await stub.save();
    } catch (e: unknown) {
      if (typeof e === "object" && e !== null && "code" in e && e.code === 11000) {
        const d = await Photo.findOne({ event_id, hash: hex }).catch(() => null);
        if (d && (d.status === "done" || (await stagedBytesPresent(event_id, d.name)) === true)) {
          return res.status(200).send({ duplicate: true, photo: d });
        }
        if (d) {
          const raceUrl = await getPresignedPut(`${event_id}/${d.name}`, contentType).catch(() => null);
          if (!raceUrl) return res.status(200).send({ photo: d, key: null, uploadUrl: null, via: "local" });
          return res.status(200).send({ photo: d, key: `${event_id}/${d.name}`, uploadUrl: raceUrl, via: "r2", expiresIn: 3600 });
        }
        return res.status(200).send({ duplicate: true, photo: d });
      }
      const msg = errMsg(e);
      await markFailed(event_id, hex, msg).catch(() => {});
      // ponytail: enqueue ran before stub.save — non-dup failure leaves an
      // orphan Job pointing at nothing; drop it so it never burns claims.
      await Job.deleteOne({ event_id, photo_hash: hex }).catch(() => {});
      return res.status(422).send({ error: msg });
    }
    return res.status(200).send({ photo: stub, key, uploadUrl, via: "r2", expiresIn: 3600 });
  } catch (e: unknown) {
    logger.error("[photo] stage error", e instanceof Error ? e : new Error(String(e)));
    return res.status(500).send({ error: "stage failed" });
  }
});
// Browser confirms its PUT landed; worker needs no kick (the staged Job is already claimable).
// Outage-aware: null (store error) → 503 so the client falls back to multer
// instead of re-PUT-looping; revive a failed Job so the bytes get finished.
router.post("/photo/complete", async (req: Request, res: Response) => {
  try {
    const b = (req.body || {}) as { photo_id?: unknown; event_id?: unknown };
    if (typeof b.photo_id !== "string" || !mongoose.Types.ObjectId.isValid(b.photo_id))
      return res.status(400).send({ error: "invalid photo_id" });
    if (typeof b.event_id !== "string" || !mongoose.Types.ObjectId.isValid(b.event_id))
      return res.status(400).send({ error: "invalid event_id" });
    const photo = await Photo.findOne({ _id: b.photo_id, event_id: b.event_id });
    if (!photo) return res.status(404).send({ error: "photo not found" });
    const present = await headObject(`${b.event_id}/${photo.name}`);
    if (present === null)
      return res.status(503).send({ ok: false, reason: "store-unavailable" });
    if (!present) return res.status(200).send({ ok: false, reason: "object-missing" });
    if (photo.hash && typeof photo.hash === "string") {
      await Job.updateOne(
        { event_id: b.event_id, photo_hash: photo.hash, status: "failed" },
        { $set: { status: "queued", lastError: null } }
      ).catch(() => {});
    }
    return res.status(200).send({ ok: true });
  } catch (e: unknown) {
    logger.error("[photo] complete error", e instanceof Error ? e : new Error(String(e)));
    return res.status(500).send({ error: "complete failed" });
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
            try { await removeFaissVector(result.event_id, String(_id), 5000).catch(()=>{}); } catch(_){}
        }

        const fileName = result.name || name;
        if (fileName) {
            // ponytail: async unlink frees the event loop; no existsSync TOCTOU (unlink ENOENT is swallowed).
            fs.promises.unlink(path.join(UPLOAD_DIR, fileName)).catch((err) => logger.warn('[delete-image] unlink error', err));
            deleteObject(`${result.event_id}/${fileName}`).catch(() => {});
            deleteObject(g3Key(String(result.event_id), result.folder_name || "General", fileName)).catch(() => {});
            // Direct-Drive sibling of the G3 pool delete above (best-effort, never blocks).
            void syncDeletePhotoFromDrive(result.event_id, { driveFileId: result.driveFileId, filename: fileName, uploadBy: result.upload_by }).catch(() => {});
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
// P0: client proofing — PIN-gated select/star (the couple holds the PIN, not the owner id)
router.patch('/photos/:id/select', async (req: Request, res: Response) => {
    const { id } = req.params;
    if (typeof id !== "string" || !mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).send({ error: 'invalid photo id' });
    }
    try {
        const body: unknown = req.body || {};
        const event_id: unknown = body && typeof body === "object" && "event_id" in body ? body.event_id : undefined;
        const pin: unknown = body && typeof body === "object" && "pin" in body ? body.pin : undefined;
        const rawSelected: unknown = body && typeof body === "object" && "isSelected" in body ? body.isSelected : undefined;
        const rawNote: unknown = body && typeof body === "object" && "selectionNote" in body ? body.selectionNote : undefined;
        if (typeof event_id !== "string" || !mongoose.Types.ObjectId.isValid(event_id)) {
            return res.status(400).send({ error: 'event_id required' });
        }
        if (typeof rawSelected !== "boolean") {
            return res.status(400).send({ error: 'isSelected must be true or false' });
        }
        let note = "";
        if (rawNote !== undefined) {
            if (typeof rawNote !== "string") return res.status(400).send({ error: 'selectionNote must be a string' });
            note = rawNote.trim().slice(0, 500);
        }
        const event = await Event.findById(event_id).select('_id pin selectionLocked selectionLimit');
        if (!event) return res.status(404).send({ error: 'event not found' });
        const eventPin = String(event.pin || "").trim();
        if (eventPin && (typeof pin !== "string" || eventPin !== pin)) {
            return res.status(404).send({ error: 'Pin is wrong! Contact the photographer to provide the correct (Pin)' });
        }
        if (event.selectionLocked) {
            return res.status(403).send({ error: 'Selection is locked and cannot be changed' });
        }
        const photo = await Photo.findOne({ _id: id, event_id });
        if (!photo) return res.status(404).send({ error: 'photo not found in this event' });
        // ponytail: count-then-write can overshoot the limit by 1 under concurrent selects — exact cap needs a transaction
        if (rawSelected && !photo.isSelected && event.selectionLimit > 0) {
            const count = await Photo.countDocuments({ event_id, isSelected: true });
            if (count >= event.selectionLimit) {
                return res.status(409).send({ error: `Selection limit reached (${event.selectionLimit} photos)` });
            }
        }
        photo.isSelected = rawSelected;
        if (rawNote !== undefined) photo.selectionNote = note;
        await photo.save();
        return res.status(200).send({ _id: photo._id, isSelected: photo.isSelected, selectionNote: photo.selectionNote });
    } catch {
        logger.error('[photo] select error');
        return res.status(500).send({ error: 'Internal server error' });
    }
});


//-----------------------------------------------------------------------------------------------------

router.get('/download/:filename', async (req: Request, res: Response) => {
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
        let localPresent = true;
        try {
          await fs.promises.stat(safePath);
        } catch {
          localPresent = false;
        }
        // ROI counter — analytics must never break downloads, resolve owner first
        let ownerEventId: string | null = null;
        let ownerAlbum = "General";
        try {
          const owner = await Photo.findOne({ name: baseName }).select("event_id folder_name");
          if (owner && owner.event_id) {
            ownerEventId = String(owner.event_id);
            if (owner.folder_name) ownerAlbum = owner.folder_name;
            await Event.updateOne({ _id: owner.event_id }, { $inc: { downloadCount: 1 } });
          }
        } catch {}
        if (!localPresent) {
          // Direct-uploaded originals never touch disk — stream from the store.
          if (ownerEventId) {
            const bytes = (await getObjectBytes(g3Key(ownerEventId, ownerAlbum, baseName))) || (await getObjectBytes(`${ownerEventId}/${baseName}`));
            if (bytes) {
              const wm = await watermarked(baseName, bytes);
              const final = wm || bytes;
              let originalName = baseName;
              const match = originalName.match(/^\d+-(.+)$/);
              if (match && match[1]) originalName = match[1];
              const clean = originalName.replace(/[\r\n"\x00-\x1f\\]/g, "_").slice(0, 255);
              res.setHeader("Content-Type", "application/octet-stream");
              res.setHeader("Content-Disposition", `attachment; filename="${clean}"`);
              res.setHeader("Content-Length", String(final.length));
              return res.send(final);
            }
          }
          return res.status(404).json({ error: "File not found" });
        }
        const diskBytes = ownerEventId ? await fs.promises.readFile(safePath).catch(() => null) : null;
        const wmLocal = diskBytes ? await watermarked(baseName, diskBytes) : null;
        if (wmLocal) {
          let originalName = baseName;
          const m2 = originalName.match(/^\d+-(.+)$/);
          if (m2 && m2[1]) originalName = m2[1];
          res.setHeader("Content-Type", "application/octet-stream");
          res.setHeader("Content-Disposition", `attachment; filename="${originalName.replace(/[\r\n"\x00-\x1f\\]/g, "_").slice(0, 255)}"`);
          res.setHeader("Content-Length", String(wmLocal.length));
          return res.send(wmLocal);
        }
        let originalName = baseName;
        const match = originalName.match(/^\d+-(.+)$/);
        if (match && match[1]) originalName = match[1];
        const sanitizedOriginalName = originalName.replace(/[\r\n"\x00-\x1f\\]/g, "_").slice(0, 255);
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
