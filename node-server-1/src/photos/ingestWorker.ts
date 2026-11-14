import crypto from "crypto";
import fs from "fs";
import path from "path";
import FormData from "form-data";
import { FLASK_URL, UPLOAD_DIR } from "../config";
import Photo from "../models/Photo";
import { claimNext, markDone, markFailed, Job } from "../queue/mongoQueue";
import { getObjectBytes, g3Key, headObject, putObjectBytes, hasR2 } from "../utils/r2";
import { syncUploadToDrive } from "../utils/driveStore";
import { httpClient } from "../utils/http";
import logger from "../utils/logger";

interface QueuedClaim {
  event_id: string;
  photo_hash: string;
  lease: string;
  source?: "local" | "remote";
  photo_name?: string;
}

interface StubPhoto {
  _id: unknown;
  name: string;
  upload_by?: unknown;
  status?: unknown;
  embedding?: unknown;
  folder_name?: unknown;
}

interface WorkItem {
  photo: StubPhoto;
  photoId: string;
  eventId: string;
  hash: string;
  buffer: Buffer;
  lease: string;
}

let started = false;

// Two-stage ingest worker: POST /photo only stages queued stubs; this loop
// owns the heavy work (ML embedding, G3/Drive mirrors, thumbnails).
// Never throws — a bad tick logs and the next 2s poll retries.
export function startIngestWorker(): void {
  if (started) return;
  started = true;
  let inFlight = false;
  setInterval(() => {
    if (inFlight) return;
    inFlight = true;
    void pollOnce()
      .catch((e: unknown) => {
        logger.warn("[ingest] poll tick failed", { error: e instanceof Error ? e.message : String(e) });
      })
      .finally(() => {
        inFlight = false;
      });
  }, 2000);
}

export async function pollOnce(): Promise<void> {
  const claimed: QueuedClaim[] = [];
  for (let i = 0; i < 2; i++) {
    const j = await claimNext().catch(() => null);
    if (!j) break;
    claimed.push(j);
  }
  if (claimed.length === 0) return;
  const byEvent: Record<string, QueuedClaim[]> = {};
  for (const j of claimed) {
    const eid = String(j.event_id);
    if (byEvent[eid]) byEvent[eid].push(j);
    else byEvent[eid] = [j];
  }
  for (const eventId of Object.keys(byEvent)) {
    const jobs = byEvent[eventId];
    try {
      await processEventBatch(eventId, jobs);
    } catch (e: unknown) {
      logger.warn("[ingest] event batch failed", {
        event_id: eventId,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }
}

async function processEventBatch(eventId: string, jobs: QueuedClaim[]): Promise<void> {
  const items: WorkItem[] = [];
  // ponytail: a fresh direct-PUT is still uploading — don't burn one of 3
  // claims on it. Young Jobs with both stubs absent go back to queued with
  // attempts untouched (release, don't fail).
  const GRACE_MS = 10 * 60 * 1000;
  for (const job of jobs) {
    const hash = String(job.photo_hash);
    const created = (job as { createdAt?: unknown }).createdAt;
    const age = Date.now() - new Date((created as string | number) || 0).getTime();
    const photo = await Photo.findOne({ event_id: eventId, hash }).catch(() => null);
    if (age < GRACE_MS) {
      let ready = !!photo;
      if (photo) {
        try {
          await fs.promises.stat(path.join(UPLOAD_DIR, photo.name));
        } catch {
          const alb = typeof photo.folder_name === "string" ? photo.folder_name : "General";
          const present = (await headObject(g3Key(eventId, alb, photo.name)).catch(() => null))
            || (await headObject(eventId + "/" + photo.name).catch(() => null));
          ready = present === true;
        }
      }
      if (!ready) {
        // Still uploading: release the claim without consuming an attempt.
        await Job.updateOne(
          { event_id: eventId, photo_hash: hash, status: "processing", lease: job.lease },
          { $set: { status: "queued", lease: null }, $inc: { attempts: -1 } }
        ).catch(() => {});
        continue;
      }
    }
    if (!photo) {
      await markFailed(eventId, hash, "photo stub missing", job.lease).catch(() => {});
      continue;
    }
    // Already finished (re-claimed lease after a crash past save): close the
    // Job without touching fs — the winning tick owns temp cleanup.
    if (photo.status === "done" && photo.embedding) {
      await markDone(eventId, hash, job.lease).catch(() => {});
      continue;
    }
    const tempPath = path.join(UPLOAD_DIR, photo.name);
    let buffer: Buffer;
    try {
      if (job.source === "remote" && job.photo_name === photo.name) throw new Error("direct upload owns the remote source");
      buffer = await fs.promises.readFile(tempPath);
    } catch (e: unknown) {
      // Direct browser-to-G3 stubs never touch local disk: pull bytes back
      // from the store so they flow through the identical finish path.
      const alb2 = typeof photo.folder_name === "string" ? photo.folder_name : "General";
      const remote = job.source === "remote" && job.photo_name === photo.name
        ? await getObjectBytes(eventId + "/" + photo.name)
        : (await getObjectBytes(g3Key(eventId, alb2, photo.name))) || (await getObjectBytes(eventId + "/" + photo.name));
      if (remote) {
        buffer = remote;
      } else {
        await markFailed(
          eventId,
          hash,
          "temp file missing and G3 object absent (" + eventId + "/" + photo.name + "): " +
            (e instanceof Error ? e.message : String(e)),
          job.lease
        ).catch(() => {});
        continue;
      }
    }
    // Retain failed originals and stubs: a retry may already own this source.
    // Client-claimed hashes must still be checked before ML sees any bytes.
    const actual = crypto.createHash("sha256").update(buffer).digest("hex");
    if (actual !== hash.toLowerCase()) {
      await Job.updateOne(
        { event_id: eventId, photo_hash: hash, status: "processing", lease: job.lease },
        { $set: { status: "failed", lastError: "uploaded bytes do not match claimed sha256", lease: null } }
      );
      continue;
    }
    if (!await Job.findOne({ event_id: eventId, photo_hash: hash, status: "processing", lease: job.lease })) continue;
    items.push({ photo, photoId: String(photo._id), eventId, hash, buffer, lease: job.lease });
  }
  if (items.length === 0) return;

  // Batch embeddings first (input order), singular fallback per file on any error.
  let batchResults: Array<{ embeddings?: number[][]; embedding?: number[]; error?: string }> | null = null;
  try {
    batchResults = await fetchBatchEmbeddings(eventId, items);
  } catch (e: unknown) {
    logger.warn("[ingest] /get_embeddings failed, falling back to singular", {
      event_id: eventId,
      error: e instanceof Error ? e.message : String(e),
    });
    batchResults = null;
  }

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    let embeddings: number[][] | null = null;
    let failure: string | null = null;
    if (batchResults) {
      const r = batchResults[i];
      if (!r) failure = "batch result missing";
      else if (r.error) failure = String(r.error);
      else if (Array.isArray(r.embeddings)) embeddings = r.embeddings;
      else if (Array.isArray(r.embedding)) embeddings = [r.embedding];
      else failure = "batch result empty";
    } else {
      if (!await ownsLease(item)) continue;
      try {
        embeddings = await fetchSingleEmbedding(item);
      } catch (e: unknown) {
        failure = e instanceof Error ? e.message : String(e);
      }
    }
    if (!embeddings) {
      await markFailed(item.eventId, item.hash, failure || "embedding failed", item.lease).catch(() => {});
      continue;
    }
    await finishItem(item, embeddings);
  }
}

async function fetchBatchEmbeddings(
  eventId: string,
  items: WorkItem[]
): Promise<Array<{ embeddings?: number[][]; embedding?: number[]; error?: string }>> {
  const form = new FormData();
  form.append("event_id", eventId);
  for (const item of items) {
    form.append("images", item.buffer, { filename: item.photo.name, contentType: "image/jpeg" });
    form.append("photo_ids", item.photoId);
  }
  const resp = await httpClient.post(`${FLASK_URL}/get_embeddings`, form, {
    headers: { ...form.getHeaders() },
    maxContentLength: Infinity,
    maxBodyLength: Infinity,
    timeout: 120000,
  });
  const results = resp.data && resp.data.results;
  if (!Array.isArray(results) || results.length !== items.length) throw new Error("bad batch response");
  return results;
}

async function fetchSingleEmbedding(item: WorkItem): Promise<number[][]> {
  const form = new FormData();
  form.append("image", item.buffer, { filename: item.photo.name, contentType: "image/jpeg" });
  form.append("event_id", item.eventId);
  form.append("photo_id", item.photoId);
  const resp = await httpClient.post(`${FLASK_URL}/get_embedding`, form, {
    headers: { ...form.getHeaders() },
    maxContentLength: Infinity,
    maxBodyLength: Infinity,
    timeout: 120000,
  });
  if (resp.data && resp.data.error) throw new Error(String(resp.data.error));
  if (Array.isArray(resp.data && resp.data.embeddings)) return resp.data.embeddings;
  if (Array.isArray(resp.data && resp.data.embedding)) return [resp.data.embedding];
  throw new Error("empty embedding response");
}

async function finishItem(item: WorkItem, embeddings: number[][]): Promise<void> {
  if (!await ownsLease(item)) return;
  const tempPath = path.join(UPLOAD_DIR, item.photo.name);
  try {
    const saved = await Photo.updateOne(
      { _id: item.photo._id, name: item.photo.name },
      { embedding: JSON.stringify(embeddings), status: "done" }
    );
    if (!saved.matchedCount) return;
  } catch (e: unknown) {
    await markFailed(item.eventId, item.hash, e instanceof Error ? e.message : String(e), item.lease).catch(() => {});
    return;
  }
  if (!await ownsLease(item)) return;
  // Best-effort mirrors: ingest survives storage outages, still markDone.
  // When G3/R2 is configured (hasR2), G3 stores original bytes in Google Drive.
  // Direct Drive mirror (syncUploadToDrive) is only invoked as a fallback when
  // object storage is unconfigured to prevent uploading photos twice to Drive.
  let mirrored = false;
  if (hasR2()) {
    // Direct-uploaded originals already live in G3; skip the re-PUT whenever
    // the local temp is absent (unlinkQuiet no-op) to save a full re-upload.
    let localPresent = true;
    try {
      await fs.promises.stat(tempPath);
    } catch {
      localPresent = false;
    }
    if (localPresent) {
      try {
        const alb3 = typeof item.photo.folder_name === "string" ? item.photo.folder_name : "General";
        const ok = await putObjectBytes(g3Key(item.eventId, alb3, item.photo.name), item.buffer);
        if (!ok) {
          logger.warn("[ingest] G3 mirror skipped", { event_id: item.eventId, name: item.photo.name });
        } else {
          mirrored = true;
        }
      } catch (e: unknown) {
        logger.warn("[ingest] G3 mirror failed", {
          event_id: item.eventId,
          error: e instanceof Error ? e.message : String(e),
        });
      }
    } else {
      mirrored = true;
    }
  } else {
    try {
      const owner = typeof item.photo.upload_by === "string" ? item.photo.upload_by : undefined;
      await syncUploadToDrive(item.eventId, owner, {
        filename: item.photo.name,
        originalname: item.photo.name,
      }, item.buffer, typeof item.photo.folder_name === "string" ? item.photo.folder_name : "General");
      mirrored = !!(await Photo.findOne({ _id: item.photo._id, driveFileId: { $type: "string", $ne: "" } }).select("_id"));
    } catch (e: unknown) {
      logger.warn("[ingest] Drive mirror failed", {
        event_id: item.eventId,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }
  // Thumbnail: any failure skips silently (gallery falls back to original).
  try {
    const tform = new FormData();
    tform.append("image", item.buffer, { filename: item.photo.name, contentType: "image/jpeg" });
    const resp = await httpClient.post(`${FLASK_URL}/thumbnail`, tform, {
      headers: { ...tform.getHeaders() },
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
      timeout: 30000,
      responseType: "arraybuffer",
    });
    if (resp.status === 200 && resp.data) {
      const thumbsDir = path.join(UPLOAD_DIR, "thumbs");
      await fs.promises.mkdir(thumbsDir, { recursive: true });
      await fs.promises.writeFile(path.join(thumbsDir, `${item.photo.name}.jpg`), Buffer.from(resp.data));
      await Photo.updateOne({ _id: item.photo._id, name: item.photo.name }, { thumb: `${item.photo.name}.jpg` }).catch(() => {});
    }
  } catch { /* gallery falls back to original */ }
  const completed = await markDone(item.eventId, item.hash, item.lease).catch(() => null);
  // ponytail: only unlink temp when remote store confirmed landing; keep local file if mirror failed so photos are never lost.
  if (mirrored && completed?.matchedCount) {
    await unlinkQuiet(tempPath);
  }
}

function ownsLease(item: WorkItem) {
  return Job.findOne({ event_id: item.eventId, photo_hash: item.hash, status: "processing", lease: item.lease });
}

function unlinkQuiet(p: string): Promise<void> {
  return fs.promises.unlink(p).catch(() => {});
}
