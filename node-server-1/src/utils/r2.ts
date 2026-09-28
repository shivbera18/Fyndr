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

// Public-endpoint signer for direct browser-to-G3 PUTs: same credentials,
// browser-reachable origin. Null when R2_PUBLIC_ENDPOINT unset → multer fallback.
let s3Public: S3Client | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const sdkPub: typeof S3SDK = require("@aws-sdk/client-s3");
  if (process.env.R2_PUBLIC_ENDPOINT && process.env.R2_ACCESS_KEY && process.env.R2_SECRET_KEY) {
    s3Public = new sdkPub.S3Client({
      region: process.env.R2_REGION || "auto",
      endpoint: process.env.R2_PUBLIC_ENDPOINT,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY,
        secretAccessKey: process.env.R2_SECRET_KEY,
      },
      forcePathStyle: true,
    });
  }
} catch (e) {
  console.log("[r2] public endpoint client not configured, direct upload disabled:", (e as Error).message);
}

function isPrivateEndpoint(ep?: string): boolean {
  if (!ep) return true;
  try {
    const u = new URL(ep);
    const h = u.hostname.toLowerCase();
    if (h === "localhost" || h === "127.0.0.1" || h === "::1" || h === "0.0.0.0") return true;
    if (h.startsWith("10.") || h.startsWith("192.168.")) return true;
    if (/^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(h)) return true;
    if (h.endsWith(".local") || h.endsWith(".internal")) return true;
    return false;
  } catch {
    return true;
  }
}

export async function getPresignedPut(key: string, contentType = "image/jpeg"): Promise<string | null> {
  if (!s3 && !s3Public) return null;
  if (!key || typeof key !== "string" || key.includes("..") || key.length > 512) throw new Error("invalid key");
  const { PutObjectCommand } = require("@aws-sdk/client-s3");
  const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
  const cmd = new PutObjectCommand({
    Bucket: process.env.R2_BUCKET || "fyndr-photos",
    Key: key,
    ContentType: contentType,
  });
  // ponytail: browser needs a public origin; never hand a loopback/private URL to remote clients.
  const signer = s3Public || (isPrivateEndpoint(process.env.R2_ENDPOINT) ? null : s3);
  if (!signer) return null;
  return getSignedUrl(signer, cmd, { expiresIn: 3600 });
}

// Direct-upload finish path: worker pulls bytes back from G3 for ML/Drive/thumbs.
// Null when unconfigured or on any failure — caller keeps the existing markFailed path. Never throws.
export async function getObjectBytes(key: string): Promise<Buffer | null> {
  if (!s3 || !key || typeof key !== "string") return null;
  try {
    const { GetObjectCommand } = require("@aws-sdk/client-s3");
    // ponytail: lazy require is untyped, so send() returns the SDK union — any keeps the Body read compiling.
    // 50MB cap mirrors the stage/multer limits; a bigger object is corrupt, not a photo.
    const res: any = await s3.send(
      new GetObjectCommand({ Bucket: process.env.R2_BUCKET || "fyndr-photos", Key: key }),
      { abortSignal: AbortSignal.timeout(30000) }
    );
    if (!res || !res.Body || typeof res.Body.transformToByteArray !== "function") return null;
    const bytes = await res.Body.transformToByteArray();
    if (!bytes || bytes.length > 50 * 1024 * 1024) return null;
    return Buffer.from(bytes);
  } catch (err) {
    console.warn("[r2] GetObject failed for key", key, (err as Error).message);
    return null;
  }
}

// Stage-complete probe: true = PUT landed, false = absent, null = store
// error (outage/creds) — caller must NOT treat null as missing.
export async function headObject(key: string): Promise<boolean | null> {
  if (!s3 || !key || typeof key !== "string") return null;
  try {
    const { HeadObjectCommand } = require("@aws-sdk/client-s3");
    await s3.send(
      new HeadObjectCommand({ Bucket: process.env.R2_BUCKET || "fyndr-photos", Key: key }),
      { abortSignal: AbortSignal.timeout(15000) }
    );
    return true;
  } catch (e: unknown) {
    // ponytail: NotFound (404/NoSuchKey) is the only "absent"; everything
    // else is an outage — conflating them re-PUT-loops during downtime.
    const status = (e as { $metadata?: { httpStatusCode?: number }; $response?: { statusCode?: number } }) || {};
    const code = status.$metadata?.httpStatusCode ?? status.$response?.statusCode;
    const name = (e as { name?: string }).name || "";
    if (code === 404 || name === "NotFound" || name === "NoSuchKey") return false;
    return null;
  }
}

// Camera/dashboard ingest mirror: push one uploaded file's bytes into the
// object store (G3/Drive when R2_* points at it). Never throws — ingest must
// survive a storage outage. Fire-and-forget from processUpload.
export async function putObjectBytes(key: string, body: Buffer, contentType = "image/jpeg"): Promise<boolean> {
  if (!s3 || !key || typeof key !== "string") return false;
  try {
    const { PutObjectCommand } = require("@aws-sdk/client-s3");
    await s3.send(
      new PutObjectCommand({
        Bucket: process.env.R2_BUCKET || "fyndr-photos",
        Key: key,
        Body: body,
        ContentType: contentType,
      }),
      // ponytail: one stalled PUT must not pin a worker slot; ingest survives storage outage.
      { abortSignal: AbortSignal.timeout(30000) }
    );
    return true;
  } catch (err) {
    console.warn("[r2] PutObject failed for key", key, (err as Error).message);
    return false;
  }
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
