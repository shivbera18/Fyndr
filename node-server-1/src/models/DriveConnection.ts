import mongoose, { InferSchemaType } from "mongoose";

const driveConnectionSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, unique: true },
    email: { type: String, required: true },
    refreshTokenEnc: { type: String, required: true },
    folderId: { type: String },
    scope: { type: String },
    connectedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export type DriveConnectionDoc = InferSchemaType<typeof driveConnectionSchema>;
export default mongoose.models.DriveConnection ||
  mongoose.model("DriveConnection", driveConnectionSchema);
