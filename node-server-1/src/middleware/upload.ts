import multer from "multer";
import path from "path";
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
  const storage = multer.diskStorage({
    destination: (_req, _file, cb) => {
      cb(null, dir);
    },
    filename: (_req, file, cb) => {
      const safe = path.basename(file.originalname).replace(/[^a-zA-Z0-9._-]/g, "_");
      cb(null, `${Date.now()}-${safe}`); // Unique filename
    },
  });
  return multer({
    storage,
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB size limit
    fileFilter: imageFilter,
  });
}

export const upload = diskUpload(UPLOAD_DIR);
export const eventProfileUpload = diskUpload(EVENT_PROFILE_DIR);
