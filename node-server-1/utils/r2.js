// Fyndr — R2 presigned stub (P1) — falls back to local disk if no env
// Uses @aws-sdk/client-s3 if R2_ vars present, else local

let s3 = null;
try {
  const { S3Client } = require('@aws-sdk/client-s3');
  if (process.env.R2_ENDPOINT && process.env.R2_ACCESS_KEY) {
    s3 = new S3Client({
      region: process.env.R2_REGION || 'auto',
      endpoint: process.env.R2_ENDPOINT,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY,
        secretAccessKey: process.env.R2_SECRET_KEY,
      },
      forcePathStyle: true,
    });
  }
} catch (e) {
  console.log('[r2] @aws-sdk not installed, using local fallback');
}

async function getPresignedPut(key, contentType = 'image/jpeg') {
  if (!s3) return null; // fallback to multer local
  const { PutObjectCommand } = require('@aws-sdk/client-s3');
  const { getSignedUrl } = require('@aws-sdk/s3-presigner');
  const cmd = new PutObjectCommand({
    Bucket: process.env.R2_BUCKET || 'fyndr',
    Key: key,
    ContentType: contentType,
  });
  return getSignedUrl(s3, cmd, { expiresIn: 3600 });
}

module.exports = { getPresignedPut, hasR2: () => !!s3 };
