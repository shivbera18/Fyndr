// Browser recompression is optional: uncertain or oversized inputs upload unchanged.
export const MAX_LONG_EDGE = 8192;
export const MAX_DECODE_PIXELS = 4 * 1024 * 1024;
export const JPEG_QUALITY = 0.97;
export const PASSTHROUGH_BYTES = 8 * 1024 * 1024;
const JPEG_HEADER_BYTES = 64 * 1024;

// ponytail: inspect at most 64KiB, never decode to discover dimensions. Unsupported
// formats/long metadata pass through; add header readers only if upload savings justify them.
async function jpegDimensions(file: Blob): Promise<{ width: number; height: number } | null> {
  const header = new DataView(await file.slice(0, JPEG_HEADER_BYTES).arrayBuffer());
  if (header.byteLength < 4 || header.getUint16(0) !== 0xffd8) return null;
  let offset = 2;
  while (offset + 4 <= header.byteLength) {
    if (header.getUint8(offset++) !== 0xff) return null;
    while (offset < header.byteLength && header.getUint8(offset) === 0xff) offset++;
    if (offset + 3 > header.byteLength) return null;
    const marker = header.getUint8(offset++);
    if (marker === 0xda || marker === 0xd9) return null;
    const length = header.getUint16(offset);
    if (length < 2 || offset + length > header.byteLength) return null;
    // Baseline, extended sequential and progressive JPEG frames.
    if (marker >= 0xc0 && marker <= 0xc2) {
      if (length < 8) return null;
      return { width: header.getUint16(offset + 5), height: header.getUint16(offset + 3) };
    }
    offset += length;
  }
  return null;
}

export type PreparedImage = {
  blob: Blob;
  compressed: boolean;
  width: number;
  height: number;
};

export async function prepareUploadImage(file: File | Blob): Promise<PreparedImage> {
  const original: PreparedImage = { blob: file, compressed: false, width: 0, height: 0 };
  // Compressed byte size cannot bound decoded RAM. Only known JPEG dimensions
  // qualify; PNG/WebP/HEIC/RAW and unknown MIME types retain their original bytes.
  if (file.type !== "image/jpeg" || file.size <= PASSTHROUGH_BYTES) return original;
  let bitmap: ImageBitmap | undefined;
  let canvas: HTMLCanvasElement | undefined;
  try {
    if (typeof createImageBitmap !== "function") return original;
    const dimensions = await jpegDimensions(file);
    if (!dimensions) return original;
    const { width, height } = dimensions;
    // ponytail: at most 4MP (~16MiB per RGBA surface), not a total browser RAM
    // guarantee: decoder/encoder overhead is implementation-dependent. Never downscale.
    if (!width || !height || Math.max(width, height) > MAX_LONG_EDGE || width * height > MAX_DECODE_PIXELS) return original;
    bitmap = await createImageBitmap(file);
    // EXIF rotation may swap the dimensions, but must not change their pixel count.
    const w = bitmap.width;
    const h = bitmap.height;
    if (!w || !h || w * h !== width * height || Math.max(w, h) > MAX_LONG_EDGE) return original;
    canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return original;
    ctx.drawImage(bitmap, 0, 0);
    // Release the decoded source before allocating the encoded output.
    bitmap.close();
    bitmap = undefined;
    const blob = await new Promise<Blob | null>((resolve) => canvas!.toBlob(resolve, "image/jpeg", JPEG_QUALITY));
    if (!blob || blob.type !== "image/jpeg" || blob.size >= file.size) return original;
    return { blob, compressed: true, width: w, height: h };
  } catch {
    return original;
  } finally {
    bitmap?.close();
    // Dropping the JS reference alone need not promptly release a canvas backing store.
    if (canvas) {
      canvas.width = 0;
      canvas.height = 0;
    }
  }
}
