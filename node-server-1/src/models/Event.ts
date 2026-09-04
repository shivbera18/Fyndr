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
    folders: { type: [{ name: { type: String, required: true } }], default: [] },
    // P0: client proofing — 0 = unlimited
    selectionLimit: { type: Number, default: 0 },
    selectionLocked: { type: Boolean, default: false },
    // P0: lead gate — require name/phone before download
    requireLead: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// indexes: keep single expiresAt (was duplicate via field index:true), plus compound for dashboard queries
eventSchema.index({ expiresAt: 1 });
eventSchema.index({ created_id: 1, createdAt: -1 });

export type EventDoc = InferSchemaType<typeof eventSchema>;
export default mongoose.models.Event || mongoose.model("Event", eventSchema);
