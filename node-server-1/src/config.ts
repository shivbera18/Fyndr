import "dotenv/config";
import fs from "fs";
import path from "path";

export const FLASK_URL = process.env.FLASK_URL || "http://127.0.0.1:5001";
export const FRONTEND_URL = (process.env.FRONTEND_URL || "http://localhost:3000").replace(/\/$/, "");
export const API_PUBLIC_URL = (
  process.env.API_PUBLIC_URL ||
  process.env.API_URL ||
  "http://localhost:5000"
).replace(/\/$/, "");
export const CORS_ORIGIN = process.env.CORS_ORIGIN || "*";
export const JWT_SECRET = process.env.JWT_SECRET || "dev_secret_fyndr_local";
export const PORT = Number(process.env.PORT) || 5000;
export const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/photo_sharing_db";

// NOTE: compiled output lives in dist/, so step one level up to reach the
// package dir (same folders index.js used via __dirname).
export const UPLOAD_DIR = path.join(__dirname, "..", "uploads");
export const EVENT_PROFILE_DIR = path.join(__dirname, "..", "event_profile");

fs.mkdirSync(UPLOAD_DIR, { recursive: true });
fs.mkdirSync(EVENT_PROFILE_DIR, { recursive: true });

export function corsOrigins(): string | string[] {
  if (CORS_ORIGIN === "*") return "*";
  return CORS_ORIGIN.split(",").map((s) => s.trim());
}
