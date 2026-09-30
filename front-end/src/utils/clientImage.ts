// ponytail: browser-only JPEG recompress, zero server CPU. Unsupported
// types (HEIC/RAW) return the original file untouched.

export const MAX_LONG_EDGE = 2560;
export const JPEG_QUALITY = 0.82;

const JPEG_SOURCES: Record<string, true> = { "image/jpeg": true, "image/png": true, "image/webp": true };

export type PreparedImage = {
  blob: Blob;
  compressed: boolean;
  width: number;
  height: number;
};

export async function prepareUploadImage(file: File | Blob): Promise<PreparedImage> {
  const type = file.type || "";
  if (type && !JPEG_SOURCES[type]) {
    return { blob: file, compressed: false, width: 0, height: 0 };
  }
  try {
    if (typeof createImageBitmap !== "function") return { blob: file, compressed: false, width: 0, height: 0 };
    const bitmap = await createImageBitmap(file);
    try {
      const { width, height } = bitmap;
      if (!width || !height) return { blob: file, compressed: false, width: 0, height: 0 };
      const scale = Math.min(1, MAX_LONG_EDGE / Math.max(width, height));
      const w = Math.max(1, Math.round(width * scale));
      const h = Math.max(1, Math.round(height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) return { blob: file, compressed: false, width: 0, height: 0 };
      ctx.drawImage(bitmap, 0, 0, w, h);
      const blob: Blob | null = await (typeof (canvas as HTMLCanvasElement & { convertToBlob?: (o?: object) => Promise<Blob> }).convertToBlob === "function"
        ? (canvas as HTMLCanvasElement & { convertToBlob: (o?: object) => Promise<Blob> }).convertToBlob({ type: "image/jpeg", quality: JPEG_QUALITY })
        : new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY)));
      if (!blob) return { blob: file, compressed: false, width: 0, height: 0 };
      // ponytail: recompress must never inflate bytes — keep original when larger.
      if (blob.size >= file.size) return { blob: file, compressed: false, width: w, height: h };
      return { blob, compressed: true, width: w, height: h };
    } finally {
      bitmap.close();
    }
  } catch {
    return { blob: file, compressed: false, width: 0, height: 0 };
  }
}
