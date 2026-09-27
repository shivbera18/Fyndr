import fs from "fs";
import path from "path";
import FormData from "form-data";
import { FLASK_URL, UPLOAD_DIR } from "../config";
import Photo from "../models/Photo";
import { claimNext, markDone, markFailed } from "../queue/mongoQueue";
import { putObjectBytes } from "../utils/r2";
import { syncUploadToDrive } from "../utils/driveStore";
import { httpClient } from "../utils/http";
import logger from "../utils/logger";

interface QueuedClaim {
  event_id: string;
  photo_hash: string;
}

interface StubPhoto {
  _id: unknown;
  name: string;
  upload_by?: unknown;
}

interface WorkItem {
  photo: StubPhoto;
  photoId: string;
  eventId: string;
  hash: string;
  buffer: Buffer;
}

let started = false;

// Two-stage ingest worker: POST /photo only stages queued stubs; this loop
// owns the heavy work (ML embedding, G3/Drive mirrors, thumbnails).
// Never throws — a bad tick logs and the next 2s poll retries.
export function startIngestWorker(): void {
  if (started) return;
  started = true;
  setInterval(() => {
    void pollOnce().catch((e: unknown) => {
      logger.warn("[ingest] poll tick failed", { error: e instanceof Error ? e.message : String(e) });
    });
  }, 2000);
}

async function pollOnce(): Promise<void> {
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
  for (const job of jobs) {
    const hash = String(job.photo_hash);
    const photo = await Photo.findOne({ event_id: eventId, hash }).catch(() => null);
    if (!photo) {
      await markFailed(eventId, hash, "photo stub missing").catch(() => {});
      continue;
    }
    const tempPath = path.join(UPLOAD_DIR, photo.name);
    let buffer: Buffer;
    try {
      buffer = await fs.promises.readFile(tempPath);
    } catch (e: unknown) {
      await markFailed(eventId, hash, "temp file missing: " + (e instanceof Error ? e.message : String(e))).catch(() => {});
      await unlinkQuiet(tempPath);
      continue;
    }
    items.push({ photo, photoId: String(photo._id), eventId, hash, buffer });
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
      try {
        embeddings = await fetchSingleEmbedding(item);
      } catch (e: unknown) {
        failure = e instanceof Error ? e.message : String(e);
      }
    }
    if (!embeddings) {
      await markFailed(item.eventId, item.hash, failure || "embedding failed").catch(() => {});
      await unlinkQuiet(path.join(UPLOAD_DIR, item.photo.name));
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
  const tempPath = path.join(UPLOAD_DIR, item.photo.name);
  try {
    await Photo.updateOne({ _id: item.photo._id }, { embedding: JSON.stringify(embeddings), status: "done" });
  } catch (e: unknown) {
    await markFailed(item.eventId, item.hash, e instanceof Error ? e.message : String(e)).catch(() => {});
    await unlinkQuiet(tempPath);
    return;
  }
  // Best-effort mirrors: ingest survives storage outages, still markDone.
  try {
    const ok = await putObjectBytes(`${item.eventId}/${item.photo.name}`, item.buffer);
    if (!ok) logger.warn("[ingest] G3 mirror skipped", { event_id: item.eventId, name: item.photo.name });
  } catch (e: unknown) {
    logger.warn("[ingest] G3 mirror failed", {
      event_id: item.eventId,
      error: e instanceof Error ? e.message : String(e),
    });
  }
  try {
    const owner = typeof item.photo.upload_by === "string" ? item.photo.upload_by : undefined;
    await syncUploadToDrive(item.eventId, owner, {
      filename: item.photo.name,
      originalname: item.photo.name,
    }, item.buffer);
  } catch (e: unknown) {
    logger.warn("[ingest] Drive mirror failed", {
      event_id: item.eventId,
      error: e instanceof Error ? e.message : String(e),
    });
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
      await Photo.updateOne({ _id: item.photo._id }, { thumb: `${item.photo.name}.jpg` }).catch(() => {});
    }
  } catch { /* gallery falls back to original */ }
  await markDone(item.eventId, item.hash).catch(() => {});
  await unlinkQuiet(tempPath);
}

function unlinkQuiet(p: string): Promise<void> {
  return fs.promises.unlink(p).catch(() => {});
}
