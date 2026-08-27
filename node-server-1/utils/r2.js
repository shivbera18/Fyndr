// Fyndr — R2 presigned (P2) — falls back to local disk if no env
let s3 = null;
try {
  const { S3Client } = require('@aws-sdk/client-s3');
  if (process.env.R2_ENDPOINT && process.env.R2_ACCESS_KEY && process.env.R2_SECRET_KEY) {
    s3 = new S3Client({
      region: process.env.R2_REGION || 'auto',
      endpoint: process.env.R2_ENDPOINT,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY,
        secretAccessKey: process.env.R2_SECRET_KEY,
      },
      forcePathStyle: true,
    });
  } else {
    console.log('[r2] R2 env not set, using local fallback (set R2_ENDPOINT/R2_ACCESS_KEY/R2_SECRET_KEY to enable)');
  }
} catch (e) {
  console.log('[r2] @aws-sdk not installed, using local fallback:', e.message);
}

async function getPresignedPut(key, contentType = 'image/jpeg') {
  if (!s3) return null;
  if (!key || typeof key !== 'string' || key.includes('..') || key.length > 512) throw new Error('invalid key');
  const { PutObjectCommand } = require('@aws-sdk/client-s3');
  const { getSignedUrl } = require('@aws-sdk/s3-presigner');
  const cmd = new PutObjectCommand({
    Bucket: process.env.R2_BUCKET || 'fyndr',
    Key: key,
    ContentType: contentType,
    // P2: prevent abuse – limit to images, 10MB hint (actual enforcement at upload)
  });
  return getSignedUrl(s3, cmd, { expiresIn: 3600 });
}

module.exports = { getPresignedPut, hasR2: () => !!s3 };
