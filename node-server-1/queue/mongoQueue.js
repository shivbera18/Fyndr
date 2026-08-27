// Fyndr — Simple Mongo queue (P2) — $0, retries + idempotency via {event_id, photo_hash}
const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema({
  event_id: { type: String, required: true, index: true },
  photo_hash: { type: String, required: true },
  photo_name: String,
  status: { type: String, enum: ['queued','processing','done','failed'], default: 'queued', index: true },
  attempts: { type: Number, default: 0 },
  lastError: String,
}, { timestamps: true });

// Compound unique: same file in same event is idempotent, cross-event allowed
jobSchema.index({ event_id: 1, photo_hash: 1 }, { unique: true });
jobSchema.index({ status: 1, createdAt: 1 });

const Job = mongoose.models.FyndrJob || mongoose.model('FyndrJob', jobSchema);

// idempotency per-event: same {event_id, hash} → no duplicate
async function enqueue(event_id, photo_hash, photo_name) {
  if (!event_id || !photo_hash) throw new Error('event_id and photo_hash required');
  try {
    const j = await Job.create({ event_id, photo_hash, photo_name });
    return j;
  } catch (e) {
    if (e.code === 11000) {
      return Job.findOne({ event_id, photo_hash });
    }
    throw e;
  }
}

async function claimNext() {
  return Job.findOneAndUpdate(
    { status: 'queued', attempts: { $lt: 3 } },
    { $set: { status: 'processing' }, $inc: { attempts: 1 } },
    { sort: { createdAt: 1 }, new: true }
  );
}

async function markDone(event_id, photo_hash) {
  // backward compat: markDone(hash) single-arg
  if (photo_hash === undefined) {
    photo_hash = event_id;
    return Job.updateOne({ photo_hash }, { $set: { status: 'done' } });
  }
  return Job.updateOne({ event_id, photo_hash }, { $set: { status: 'done' } });
}
async function markFailed(event_id, photo_hash, err) {
  // support both signatures: markFailed(hash, err) and markFailed(event_id, hash, err)
  if (err === undefined && typeof photo_hash === 'string' && event_id) {
    err = photo_hash;
    photo_hash = event_id;
    event_id = null;
  }
  const q = event_id ? { event_id, photo_hash } : { photo_hash };
  const j = await Job.findOne(q);
  if (!j) return;
  const shouldRetry = j.attempts < 3;
  await Job.updateOne(q, { $set: { status: shouldRetry ? 'queued' : 'failed', lastError: String(err).slice(0,500) } });
}

async function stats(event_id) {
  if (!event_id) throw new Error('event_id required');
  const [queued, processing, done, failed] = await Promise.all([
    Job.countDocuments({ event_id, status: 'queued' }),
    Job.countDocuments({ event_id, status: 'processing' }),
    Job.countDocuments({ event_id, status: 'done' }),
    Job.countDocuments({ event_id, status: 'failed' }),
  ]);
  return { queued, processing, done, failed, total: queued+processing+done+failed };
}

async function listFailed(event_id, limit=50) {
  return Job.find({ event_id, status: 'failed' }).sort({ updatedAt: -1 }).limit(limit).lean();
}

async function retryFailed(event_id, photo_hash) {
  const q = photo_hash ? { event_id, photo_hash } : { event_id, status: 'failed' };
  if (photo_hash) {
    return Job.updateOne(q, { $set: { status: 'queued', lastError: null } });
  }
  return Job.updateMany(q, { $set: { status: 'queued', lastError: null } });
}

module.exports = { Job, enqueue, claimNext, markDone, markFailed, stats, listFailed, retryFailed };
