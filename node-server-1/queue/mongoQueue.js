// Fyndr — Simple Mongo queue (P1) — no Postgres, $0, retries + idempotency via hash
// Collection: jobs { _id, event_id, photo_hash, status: queued|processing|done|failed, attempts, createdAt }
const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema({
  event_id: String,
  photo_hash: { type: String, unique: true },
  photo_name: String,
  status: { type: String, enum: ['queued','processing','done','failed'], default: 'queued' },
  attempts: { type: Number, default: 0 },
  lastError: String,
}, { timestamps: true });

const Job = mongoose.models.FyndrJob || mongoose.model('FyndrJob', jobSchema);

// idempotency: same hash → no duplicate
async function enqueue(event_id, photo_hash, photo_name) {
  try {
    const j = await Job.create({ event_id, photo_hash, photo_name });
    return j;
  } catch (e) {
    if (e.code === 11000) {
      // duplicate, return existing
      return Job.findOne({ photo_hash });
    }
    throw e;
  }
}

async function claimNext() {
  // atomic findAndModify queued → processing
  return Job.findOneAndUpdate(
    { status: 'queued', attempts: { $lt: 3 } },
    { $set: { status: 'processing' }, $inc: { attempts: 1 } },
    { sort: { createdAt: 1 }, new: true }
  );
}

async function markDone(photo_hash) {
  return Job.updateOne({ photo_hash }, { $set: { status: 'done' } });
}
async function markFailed(photo_hash, err) {
  const j = await Job.findOne({ photo_hash });
  if (!j) return;
  const shouldRetry = j.attempts < 3;
  await Job.updateOne({ photo_hash }, { $set: { status: shouldRetry ? 'queued' : 'failed', lastError: String(err).slice(0,500) } });
}

async function stats(event_id) {
  const queued = await Job.countDocuments({ event_id, status: 'queued' });
  const done = await Job.countDocuments({ event_id, status: 'done' });
  const failed = await Job.countDocuments({ event_id, status: 'failed' });
  return { queued, done, failed, total: queued+done+failed };
}

module.exports = { Job, enqueue, claimNext, markDone, markFailed, stats };
