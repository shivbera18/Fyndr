import mongoose, { InferSchemaType } from "mongoose";

const photoSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    event_id: { type: String, required: true, index: true },
    upload_by: { type: String },
    embedding: String,
    // P2: idempotency + fast dedup per-event
    hash: { type: String, index: true },
    status: { type: String, enum: ["queued", "done", "failed"], default: "done", index: true },
    // P0: sub-event folder — 'General' = unfiled, keeps old photos valid
    folder_name: { type: String, default: "General", index: true },
    // P0: client proofing selection
    isSelected: { type: Boolean, default: false, index: true },
    selectionNote: { type: String, default: "" },
  },
  { timestamps: true }
);

// Compound unique: same file hash in same event = one photo, cross-event allowed
photoSchema.index({ event_id: 1, hash: 1 }, { unique: true, sparse: true });
photoSchema.index({ event_id: 1, createdAt: -1 });

export type PhotoDoc = InferSchemaType<typeof photoSchema>;
export default mongoose.models.Photo || mongoose.model("Photo", photoSchema);
