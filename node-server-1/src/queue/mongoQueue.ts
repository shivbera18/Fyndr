import crypto from "crypto";
import Job from "../models/Job";

// idempotency per-event: same {event_id, hash} → no duplicate
export async function enqueue(event_id: string, photo_hash: string, photo_name?: string) {
  if (!event_id || !photo_hash) throw new Error("event_id and photo_hash required");
  try {
    const j = await Job.create({ event_id, photo_hash, photo_name });
    return j;
  } catch (e: unknown) {
    if ((e as { code?: number }).code === 11000) {
      // A fresh upload/retry must receive a fresh attempt budget.
      const revived = await Job.findOneAndUpdate(
        { event_id, photo_hash, status: "failed" },
        { $set: { status: "queued", attempts: 0, lastError: null, lease: null, ...(photo_name ? { photo_name } : {}) } },
        { new: true }
      );
      return revived || Job.findOne({ event_id, photo_hash });
    }
    throw e;
  }
}

export function claimNext() {
  return Job.findOneAndUpdate(
    // Also reclaim crashed-worker leases: processing rows untouched for 10m
    // are retried (attempts<3 still bounds total tries). Sole caller is the
    // ingest worker.
    {
      $or: [{ status: "queued" }, { status: "processing", updatedAt: { $lt: new Date(Date.now() - 10 * 60 * 1000) } }],
      attempts: { $lt: 3 },
    },
    { $set: { status: "processing", lease: crypto.randomUUID() }, $inc: { attempts: 1 } },
    // Released direct PUTs move behind untouched jobs instead of blocking the queue.
    { sort: { updatedAt: 1, createdAt: 1 }, new: true }
  );
}

export function markDone(event_id: string, photo_hash: string, lease: string) {
  return Job.updateOne(
    { event_id, photo_hash, status: "processing", lease },
    { $set: { status: "done", lease: null } }
  );
}

export async function markFailed(event_id: string, photo_hash: string, err: string, lease: string) {
  const q = { event_id, photo_hash, status: "processing", lease };
  const j = await Job.findOne(q);
  if (!j) return;
  await Job.updateOne(q, {
    $set: { status: (j.attempts ?? 0) < 3 ? "queued" : "failed", lastError: String(err).slice(0, 500), lease: null },
  });
}

// A completed PUT or adopted multipart file owns the next attempt. Invalidating
// the old lease prevents a worker holding previous bytes from failing this retry.
export function retryUpload(event_id: string, photo_hash: string, photo_name: string, source: "local" | "remote") {
  return Job.updateOne(
    { event_id, photo_hash },
    { $set: { status: "queued", attempts: 0, lastError: null, lease: null, photo_name, source } },
    { upsert: true }
  );
}

export type QueueStats = { queued: number; processing: number; done: number; failed: number; total: number };

export async function stats(event_id: string): Promise<QueueStats> {
  if (!event_id) throw new Error("event_id required");
  const [queued, processing, done, failed] = await Promise.all([
    Job.countDocuments({ event_id, status: "queued" }),
    Job.countDocuments({ event_id, status: "processing" }),
    Job.countDocuments({ event_id, status: "done" }),
    Job.countDocuments({ event_id, status: "failed" }),
  ]);
  return { queued, processing, done, failed, total: queued + processing + done + failed };
}

export function listFailed(event_id: string, limit = 50) {
  return Job.find({ event_id, status: "failed" }).sort({ updatedAt: -1 }).limit(limit).lean();
}

export function retryFailed(event_id: string, photo_hash?: string) {
  const q = { event_id, status: "failed", ...(photo_hash ? { photo_hash } : {}) };
  const update = { $set: { status: "queued", attempts: 0, lastError: null, lease: null } };
  return photo_hash ? Job.updateOne(q, update) : Job.updateMany(q, update);
}

export { default as Job } from "../models/Job";
