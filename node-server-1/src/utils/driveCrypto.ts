import crypto from "crypto";

function key(): Buffer {
  const raw = process.env.DRIVE_TOKEN_KEY || "";
  const buf = raw ? Buffer.from(raw, "base64") : Buffer.alloc(0);
  if (buf.length !== 32) throw new Error("DRIVE_TOKEN_KEY missing or not 32 bytes (base64)");
  return buf;
}

export function encryptRefreshToken(plain: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key(), iv);
  const data = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return `${iv.toString("hex")}:${cipher.getAuthTag().toString("hex")}:${data.toString("hex")}`;
}

export function decryptRefreshToken(enc: string): string {
  const [ivHex, tagHex, dataHex] = enc.split(":");
  if (!ivHex || !tagHex || !dataHex) throw new Error("malformed token payload");
  const decipher = crypto.createDecipheriv("aes-256-gcm", key(), Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(tagHex, "hex"));
  return decipher.update(dataHex, "hex", "utf8") + decipher.final("utf8");
}
