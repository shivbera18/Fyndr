import multer from "multer";
import { EVENT_PROFILE_DIR, UPLOAD_DIR } from "../config";

const IMAGE_MIMES = ["image/jpeg", "image/png", "image/gif", "image/webp", "image/bmp", "image/tiff"];

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
      cb(null, `${Date.now()}-${file.originalname}`); // Unique filename
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
