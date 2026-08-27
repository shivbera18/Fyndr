const mongoose = require("mongoose");

const eventSchema = new mongoose.Schema({
    event_name: { type: String, required: true },
    pin: { type: String },
    created_id: { type: String, index: true },
    event_photo: { type: String },
    // P2/P4: expiry + status for auto-cleanup (90d default)
    expiresAt: { type: Date, default: () => new Date(Date.now() + 90*24*60*60*1000), index: true },
    status: { type: String, enum: ['active','expired','deleted'], default: 'active', index: true },
}, { timestamps: true });

// TTL-like index will not auto-delete; we handle via cron/job but keep indexed for queries
eventSchema.index({ expiresAt: 1 });
eventSchema.index({ created_id: 1, createdAt: -1 });

module.exports = mongoose.models.Event || mongoose.model("Event", eventSchema);
