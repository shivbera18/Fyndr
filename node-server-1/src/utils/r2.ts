// Fyndr — R2 presigned (P2) — falls back to local disk if no env.
// The SDK loads lazily so the API still boots on partial installs
// (same graceful degradation as the original require-in-try).
import type { S3Client } from "@aws-sdk/client-s3";
import type * as S3SDK from "@aws-sdk/client-s3";

let s3: S3Client | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const sdk: typeof S3SDK = require("@aws-sdk/client-s3");
  if (process.env.R2_ENDPOINT && process.env.R2_ACCESS_KEY && process.env.R2_SECRET_KEY) {
    s3 = new sdk.S3Client({
      region: process.env.R2_REGION || "auto",
      endpoint: process.env.R2_ENDPOINT,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY,
        secretAccessKey: process.env.R2_SECRET_KEY,
      },
      forcePathStyle: true,
    });
  } else {
    console.log("[r2] R2 env not set, using local fallback (set R2_ENDPOINT/R2_ACCESS_KEY/R2_SECRET_KEY to enable)");
  }
} catch (e) {
  console.log("[r2] @aws-sdk not installed, using local fallback:", (e as Error).message);
}

export async function getPresignedPut(key: string, contentType = "image/jpeg"): Promise<string | null> {
  if (!s3) return null;
  if (!key || typeof key !== "string" || key.includes("..") || key.length > 512) throw new Error("invalid key");
  const { PutObjectCommand } = require("@aws-sdk/client-s3");
  const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
  const cmd = new PutObjectCommand({
    Bucket: process.env.R2_BUCKET || "fyndr-photos",
    Key: key,
    ContentType: contentType,
    // P2: prevent abuse – limit to images, 10MB hint (actual enforcement at upload)
  });
  return getSignedUrl(s3, cmd, { expiresIn: 3600 });
}

export async function deleteObject(key: string): Promise<void> {
  if (!s3 || !key || typeof key !== "string") return;
  try {
    const { DeleteObjectCommand } = require("@aws-sdk/client-s3");
    await s3.send(
      new DeleteObjectCommand({
        Bucket: process.env.R2_BUCKET || "fyndr-photos",
        Key: key,
      })
    );
  } catch (err) {
    console.warn("[r2] DeleteObject failed for key", key, (err as Error).message);
  }
}

export function hasR2(): boolean {
  return !!s3;
}
