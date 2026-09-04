import Job from "../models/Job";

// idempotency per-event: same {event_id, hash} → no duplicate
export async function enqueue(event_id: string, photo_hash: string, photo_name?: string) {
  if (!event_id || !photo_hash) throw new Error("event_id and photo_hash required");
  try {
    const j = await Job.create({ event_id, photo_hash, photo_name });
    return j;
  } catch (e: unknown) {
    if ((e as { code?: number }).code === 11000) {
      return Job.findOne({ event_id, photo_hash });
    }
    throw e;
  }
}

export function claimNext() {
  return Job.findOneAndUpdate(
    { status: "queued", attempts: { $lt: 3 } },
    { $set: { status: "processing" }, $inc: { attempts: 1 } },
    { sort: { createdAt: 1 }, new: true }
  );
}

export function markDone(event_id: string, photo_hash?: string) {
  // backward compat: markDone(hash) single-arg
  if (photo_hash === undefined) {
    photo_hash = event_id;
    return Job.updateOne({ photo_hash }, { $set: { status: "done" } });
  }
  return Job.updateOne({ event_id, photo_hash }, { $set: { status: "done" } });
}

export function markFailed(event_id: string, photo_hash?: string, err?: string) {
  // support both signatures: markFailed(hash, err) and markFailed(event_id, hash, err)
  let eid: string | null = event_id;
  let phash = photo_hash;
  let message = err;
  if (message === undefined && typeof phash === "string" && event_id) {
    message = phash;
    phash = event_id;
    eid = null;
  }
  const q = eid ? { event_id: eid, photo_hash: phash } : { photo_hash: phash };
  return (async () => {
    const j = await Job.findOne(q);
    if (!j) return;
    const shouldRetry = (j.attempts ?? 0) < 3;
    await Job.updateOne(q, {
      $set: { status: shouldRetry ? "queued" : "failed", lastError: String(message).slice(0, 500) },
    });
  })();
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
  const q = photo_hash ? { event_id, photo_hash } : { event_id, status: "failed" };
  if (photo_hash) {
    return Job.updateOne(q, { $set: { status: "queued", lastError: null } });
  }
  return Job.updateMany(q, { $set: { status: "queued", lastError: null } });
}

export { default as Job } from "../models/Job";
