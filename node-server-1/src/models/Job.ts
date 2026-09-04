import mongoose, { InferSchemaType } from "mongoose";

const jobSchema = new mongoose.Schema(
  {
    event_id: { type: String, required: true, index: true },
    photo_hash: { type: String, required: true },
    photo_name: String,
    status: {
      type: String,
      enum: ["queued", "processing", "done", "failed"],
      default: "queued",
      index: true,
    },
    attempts: { type: Number, default: 0 },
    lastError: String,
  },
  { timestamps: true }
);

// Compound unique: same file in same event is idempotent, cross-event allowed
jobSchema.index({ event_id: 1, photo_hash: 1 }, { unique: true });
jobSchema.index({ status: 1, createdAt: 1 });

export type JobDoc = InferSchemaType<typeof jobSchema>;
export default mongoose.models.FyndrJob || mongoose.model("FyndrJob", jobSchema);
