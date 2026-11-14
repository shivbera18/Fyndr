import crypto from "crypto";
import fs from "fs";
import multer from "multer";
import path from "path";
import { pipeline, type Readable } from "stream";
import { EVENT_PROFILE_DIR, UPLOAD_DIR } from "../config";
export const IMAGE_MIMES = ["image/jpeg", "image/png", "image/gif", "image/webp", "image/bmp", "image/tiff"];

function imageFilter(
  _req: Express.Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
): void {
  // Allow only image files
  if (!IMAGE_MIMES.includes(file.mimetype)) {
    return cb(new Error("Only image files are allowed!"));
  }
  cb(null, true);
}

function diskUpload(dir: string) {
  const requests = new WeakMap<Express.Request, Set<{ path: string; stream: Readable }>>();
  const storage: multer.StorageEngine = {
    _handleFile(req, file, cb) {
      let pending = requests.get(req);
      if (!pending) {
        pending = new Set();
        requests.set(req, pending);
        const files = pending;
        const abort = () => {
          for (const item of files) {
            item.stream.destroy(new Error("Upload aborted"));
            void fs.promises.unlink(item.path).catch(() => {});
          }
        };
        req.once("aborted", abort);
        req.once("close", () => req.off("aborted", abort));
      }
      const safe = path.basename(file.originalname).replace(/[^a-zA-Z0-9._-]/g, "_").slice(-80) || "photo";
      const filename = `${Date.now()}-${crypto.randomBytes(8).toString("hex")}-${safe}`;
      const filePath = path.join(dir, filename);
      pending.add({ path: filePath, stream: file.stream });
      let size = 0;
      file.stream.on("data", (chunk: Buffer) => { size += chunk.length; });
      const output = fs.createWriteStream(filePath, { flags: "wx" });
      pipeline(file.stream, output, (error) => {
        if (error || req.aborted) {
          // pipeline closes the writer first, including on Windows, before unlink.
          void fs.promises.unlink(filePath).catch(() => {}).then(() => cb(error || new Error("Upload aborted")));
          return;
        }
        cb(null, { destination: dir, filename, path: filePath, size });
      });
      if (req.aborted) file.stream.destroy(new Error("Upload aborted"));
    },
    _removeFile(_req, file, cb) {
      fs.unlink(file.path, cb);
    },
  };
  return multer({
    storage,
    limits: { fileSize: 50 * 1024 * 1024, files: 100, fields: 32, parts: 132 },
    fileFilter: imageFilter,
  });
}

export const upload = diskUpload(UPLOAD_DIR);
export const eventProfileUpload = diskUpload(EVENT_PROFILE_DIR);
