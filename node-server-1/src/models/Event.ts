import mongoose, { InferSchemaType } from "mongoose";

const eventSchema = new mongoose.Schema(
  {
    event_name: { type: String, required: true },
    pin: { type: String },
    created_id: { type: String, index: true },
    event_photo: { type: String },
    // P2/P4: expiry + status for auto-cleanup (90d default)
    expiresAt: { type: Date, default: () => new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) },
    status: { type: String, enum: ["active", "expired", "deleted"], default: "active", index: true },
    // P0: sub-event folders (e.g. Mehendi, Sangeet) — empty = single album
    folders: { type: [{ _id: false, name: { type: String, required: true, trim: true, maxlength: 60 } }], default: [] },
    // P0: client proofing — 0 = unlimited
    selectionLimit: { type: Number, default: 0, min: 0, max: 100000 },
    selectionLocked: { type: Boolean, default: false },
    // P0: lead gate — require name/phone before guest downloads
    requireLead: { type: Boolean, default: false },
    // P0: photographer ROI counters (increment-only analytics)
    scanCount: { type: Number, default: 0 },
    selfieCount: { type: Number, default: 0 },
    downloadCount: { type: Number, default: 0 },
    // P0: studio paywall monetization config & mock transactions
    paywall: {
      enabled: { type: Boolean, default: false },
      stage: {
        type: String,
        enum: ["download", "batch_download", "watermark_removal", "entry"],
        default: "download",
      },
      pricePerPhoto: { type: Number, default: 49, min: 0, max: 100000 },
      priceFullAlbum: { type: Number, default: 199, min: 0, max: 100000 },
      freePhotoLimit: { type: Number, default: 2, min: 0, max: 100 },
      currency: { type: String, enum: ["INR", "USD", "EUR", "GBP"], default: "INR" },
      customMessage: {
        type: String,
        default: "Support our photography studio & unlock full-resolution originals.",
        maxlength: 200,
      },
      unlockedCount: { type: Number, default: 0 },
      totalRevenue: { type: Number, default: 0 },
    },
    // Camera-to-cloud: per-event FTP logins (evt_<id>[_b..]), jailed to one dir each.
    // Passwords stored SHA256 (cf. token_hash) — plaintext shown once at creation.
    ftp: {
      enabled: { type: Boolean, default: false },
      logins: {
        type: [
          {
            _id: false,
            tag: { type: String, default: "a", maxlength: 8 },
            username: { type: String, required: true },
            passwordHash: { type: String, required: true },
            createdAt: { type: Date, default: Date.now },
            lastSeenAt: { type: Date, default: null },
            bytesIn: { type: Number, default: 0 },
            allowPlain: { type: Boolean, default: false },
          },
        ],
        default: [],
      },
    },
  },
  { timestamps: true }
);

// indexes: keep single expiresAt (was duplicate via field index:true), plus compound for dashboard queries
eventSchema.index({ expiresAt: 1 });
eventSchema.index({ created_id: 1, createdAt: -1 });

export type EventDoc = InferSchemaType<typeof eventSchema>;
export default mongoose.models.Event || mongoose.model("Event", eventSchema);
