import mongoose, { InferSchemaType } from "mongoose";

// P0: guest lead capture — one row per guest download gate submit
const leadSchema = new mongoose.Schema(
  {
    event_id: { type: String, required: true, index: true },
    photographer_id: { type: String, index: true },
    name: { type: String, required: true },
    phone: { type: String, required: true },
    photos_found: { type: Number, default: 0 },
  },
  { timestamps: true }
);

leadSchema.index({ event_id: 1, createdAt: -1 });

export type LeadDoc = InferSchemaType<typeof leadSchema>;
export default mongoose.models.Lead || mongoose.model("Lead", leadSchema);
