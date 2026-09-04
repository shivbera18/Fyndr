import mongoose, { InferSchemaType, Schema } from "mongoose";

const downloadItemSchema = new Schema(
  {
    photoId: { type: String, default: "" },
    photoName: { type: String, default: "" },
    downloadedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const guestAccessSchema = new Schema(
  {
    eventId: { type: String, required: true, index: true },
    guestName: { type: String, required: true, trim: true, maxlength: 100 },
    guestPhone: { type: String, required: true, trim: true, maxlength: 30, index: true },
    sessionId: { type: String, required: true, index: true },
    attempts: { type: Number, default: 1 },
    failedAttempts: { type: Number, default: 0 },
    verified: { type: Boolean, default: false, index: true },
    lastAttemptAt: { type: Date, default: Date.now },
    firstSeenAt: { type: Date, default: Date.now },
    lastSeenAt: { type: Date, default: Date.now },
    ip: { type: String, default: "" },
    userAgent: { type: String, default: "" },
    device: {
      type: { type: String, default: "mobile" },
      os: { type: String, default: "" },
      browser: { type: String, default: "" },
    },
    searchesCount: { type: Number, default: 0 },
    viewsCount: { type: Number, default: 0 },
    downloadsCount: { type: Number, default: 0 },
    downloads: { type: [downloadItemSchema], default: [] },
  },
  { timestamps: true }
);

guestAccessSchema.index({ eventId: 1, guestPhone: 1 });
guestAccessSchema.index({ eventId: 1, createdAt: -1 });
guestAccessSchema.index({ eventId: 1, verified: 1 });

export type GuestAccessDoc = InferSchemaType<typeof guestAccessSchema>;
export default mongoose.models.GuestAccess || mongoose.model("GuestAccess", guestAccessSchema);
