import mongoose, { InferSchemaType } from "mongoose";

// P0: guest lead capture — one row per guest download gate submit.
// PII retention: auto-expires 180d after capture (TTL index below).
const leadSchema = new mongoose.Schema(
  {
    event_id: { type: String, required: true, index: true },
    photographer_id: { type: String, index: true },
    name: { type: String, required: true, trim: true, minlength: 1, maxlength: 100 },
    phone: { type: String, required: true, trim: true, minlength: 5, maxlength: 20 },
    photos_found: { type: Number, default: 0 },
    expiresAt: { type: Date, default: () => new Date(Date.now() + 180 * 24 * 60 * 60 * 1000) },
  },
  { timestamps: true }
);

leadSchema.index({ event_id: 1, createdAt: -1 });
leadSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export type LeadDoc = InferSchemaType<typeof leadSchema>;
export default mongoose.models.Lead || mongoose.model("Lead", leadSchema);
