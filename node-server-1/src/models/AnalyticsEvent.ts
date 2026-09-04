import mongoose, { InferSchemaType, Schema } from "mongoose";

const analyticsEventSchema = new Schema(
  {
    eventId: { type: String, required: true, index: true },
    guestAccessId: { type: Schema.Types.ObjectId, ref: "GuestAccess" },
    sessionId: { type: String, required: true, index: true },
    type: {
      type: String,
      enum: [
        "page_view",
        "pin_attempt",
        "pin_success",
        "pin_failure",
        "selfie_search",
        "photo_view",
        "photo_download",
        "retake_selfie",
      ],
      required: true,
      index: true,
    },
    metadata: { type: Schema.Types.Mixed, default: {} },
    ip: { type: String, default: "" },
    userAgent: { type: String, default: "" },
    device: {
      type: { type: String, default: "mobile" },
      os: { type: String, default: "" },
      browser: { type: String, default: "" },
    },
    timestamp: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

analyticsEventSchema.index({ timestamp: 1 }, { expireAfterSeconds: 180 * 24 * 60 * 60 });
analyticsEventSchema.index({ eventId: 1, timestamp: -1 });
analyticsEventSchema.index({ eventId: 1, type: 1 });

export type AnalyticsEventDoc = InferSchemaType<typeof analyticsEventSchema>;
export default mongoose.models.AnalyticsEvent || mongoose.model("AnalyticsEvent", analyticsEventSchema);
