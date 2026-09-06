import crypto from "crypto";
import fs from "fs";
import path from "path";
import Event from "../models/Event";
import Photo from "../models/Photo";
import { UPLOAD_DIR } from "../config";
import { processUploadedFile } from "../photos/processUpload";
import logger from "../utils/logger";
import { emitLive } from "./live";
import { isValidUsername } from "./credentials";

// Camera-to-cloud drop watcher. Cameras never signal completion, so a file
// counts as complete when it is older than MIN_AGE_MS with identical size on
// two consecutive sweeps. Zero in-memory state worth keeping: every boot does
// a full sweep, so restarts delay photos but never lose them.

const IMAGE_EXTS = new Set([".jpg", ".jpeg"]);
const MIN_AGE_MS = 10_000;
const SWEEP_MS = 5_000;
const HEARTBEAT_MS = 30_000;

const seen = new Map<string, number>(); // path -> last observed size
const inflight = new Set<string>(); // paths currently inside ingestFile
const dirToEvent = new Map<string, string>(); // ftp username -> event _id
const beats = new Map<string, { at: number; bytes: number }>(); // heartbeat throttle
let diskSeq = 0;
let started = false;

async function resolveEvent(username: string): Promise<string | null> {
  const hit = dirToEvent.get(username);
  if (hit) return hit;
  const event = await Event.findOne({ "ftp.logins.username": username }).select("_id").catch(() => null);
  if (!event) return null;
  dirToEvent.set(username, event._id.toString());
  return event._id.toString();
}

function heartbeat(eventId: string, username: string, bytes: number): void {
  const now = Date.now();
  const b = beats.get(username) || { at: 0, bytes: 0 };
  b.bytes += bytes;
  if (now - b.at < HEARTBEAT_MS) {
    beats.set(username, b);
    return;
  }
  beats.set(username, { at: now, bytes: 0 });
  void Event.updateOne(
    { _id: eventId, "ftp.logins.username": username },
    { $set: { "ftp.logins.$.lastSeenAt": new Date() }, $inc: { "ftp.logins.$.bytesIn": b.bytes } }
  ).catch(() => {});
// processUploadedFile returns unknown (Photo doc or plain status object).
// Narrow with guards — never cast-and-read.
function resultStatus(result: unknown): string | null {
  if (typeof result !== "object" || result === null || !("status" in result)) return null;
  const s: unknown = result.status;
  return typeof s === "string" ? s : null;
}

function resultFailed(result: unknown): boolean {
  if (typeof result !== "object" || result === null) return false;
  return resultStatus(result) === "failed" || "error" in result;
}

}

// processUploadedFile returns unknown (Photo doc or plain status object).
// Narrow with guards — never cast-and-read.
function resultStatus(result: unknown): string | null {
  if (typeof result !== "object" || result === null || !("status" in result)) return null;
  const s: unknown = result.status;
  return typeof s === "string" ? s : null;
}

function resultFailed(result: unknown): boolean {
  if (typeof result !== "object" || result === null) return false;
  return resultStatus(result) === "failed" || "error" in result;
}

async function ingestFile(srcPath: string, username: string, filename: string, bytes: number): Promise<void> {
  const eventId = await resolveEvent(username);
  if (!eventId) {
    logger.error("[ftp] unknown login dir", { username, filename });
    return;
  }
  heartbeat(eventId, username, bytes);

  const ext = path.extname(filename).toLowerCase();
  if (!IMAGE_EXTS.has(ext)) {
    // v1 JPEG-only: RAW/HEIC/video counted visibly, never silently dropped.
    await Event.updateOne({ _id: eventId }, { $inc: { "ftp.skipped": 1 } }).catch(() => {});
    await fs.promises.unlink(srcPath).catch(() => {});
    return;
  }

  // Hash BEFORE moving: a re-sent card matches an existing Photo, so drop it
  // here (no second ML call) and stay silent — the gallery already has it.
  const hash = await new Promise<string>((resolve, reject) => {
    const h = crypto.createHash("sha256");
    const s = fs.createReadStream(srcPath);
    s.on("error", reject);
    s.on("data", (d) => h.update(d));
    s.on("end", () => resolve(h.digest("hex")));
  }).catch(() => "");
  if (!hash) {
    logger.error("[ftp] unreadable file", { filename });
    await Event.updateOne({ _id: eventId }, { $inc: { "ftp.failed": 1 } }).catch(() => {});
    await fs.promises.unlink(srcPath).catch(() => {});
    return;
  }
  const dupe = await Photo.findOne({ event_id: eventId, hash }).select("_id").catch(() => null);
  if (dupe) {
    await fs.promises.unlink(srcPath).catch(() => {});
    return;
  }

  const safe = path.basename(filename).replace(/[^a-zA-Z0-9._-]/g, "_").slice(-80) || "photo.jpg";
  const diskName = `${Date.now()}-${(diskSeq++).toString(36)}-${safe}`;
  const dest = path.join(UPLOAD_DIR, diskName);
  try {
    await fs.promises.rename(srcPath, dest);
  } catch {
    try {
      // Cross-volume (block vol -> app vol): copy + unlink.
      await fs.promises.copyFile(srcPath, dest);
      await fs.promises.unlink(srcPath);
    } catch {
      logger.error("[ftp] move failed", { filename });
      return;
    }
  }

  // Identical pipeline to POST /photo: same hashes, same dedupe, same FAISS flow.
  let result: unknown;
  try {
    result = await processUploadedFile(
      { path: dest, filename: diskName, originalname: filename },
      { event_id: eventId, folder_name: "General" }
    );
  } catch (e: unknown) {
    result = { status: "failed", error: e instanceof Error ? e.message : String(e) };
  }
  if (resultFailed(result)) {
    await Event.updateOne({ _id: eventId }, { $inc: { "ftp.failed": 1 } }).catch(() => {});
    emitLive(eventId, "photo.failed", { photoName: diskName });
    return;
  }
  if (resultStatus(result) === "duplicate") return; // lost a save race after our pre-check — nothing changed, stay silent
  emitLive(eventId, "photo.created", { photoName: diskName });
}

async function sweep(root: string): Promise<void> {
  const dirs = await fs.promises.readdir(root, { withFileTypes: true }).catch(() => []);
  for (const d of dirs) {
    if (!d.isDirectory() || !isValidUsername(d.name)) continue;
    const files = await fs.promises.readdir(path.join(root, d.name)).catch(() => [] as string[]);
    for (const f of files) {
      const fp = path.join(root, d.name, f);
      if (inflight.has(fp)) continue;
      const st = await fs.promises.stat(fp).catch(() => null);
      if (!st || !st.isFile()) {
        seen.delete(fp);
        continue;
      }
      if (Date.now() - st.mtimeMs < MIN_AGE_MS || seen.get(fp) !== st.size) {
        seen.set(fp, st.size);
        continue;
      }
      seen.delete(fp);
      inflight.add(fp);
      void ingestFile(fp, d.name, f, st.size)
        .catch((e: Error) => logger.error("[ftp] ingest failed", { file: f, error: e.message }))
        .finally(() => inflight.delete(fp));
    }
  }
}

export function startFtpWatcher(): void {
  if (started) return;
  started = true;
  const root = process.env.FTP_WATCH_DIR;
  if (!root) return; // off locally — set FTP_WATCH_DIR=/srv/fyndr-ftp on the VPS
  void fs.promises.mkdir(root, { recursive: true }).catch(() => {});
  void sweep(root).catch((e: Error) => logger.error("[ftp] boot sweep failed", { error: e.message }));
  // Root watch only notices new login dirs (Linux watches aren't recursive);
  // the interval does the real completion work.
  try {
    fs.watch(root, { persistent: false }, () => {
      void sweep(root).catch(() => {});
    }).on("error", (e: Error) => logger.error("[ftp] watch failed, interval continues", { error: e.message }));
  } catch (e: unknown) {
    logger.error("[ftp] watch unsupported, interval only", { error: (e as Error).message });
  }
  setInterval(() => {
    void sweep(root).catch(() => {});
  }, SWEEP_MS).unref();
}
