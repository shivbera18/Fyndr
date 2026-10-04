import { httpClient as axios } from "./http";
import FormData from "form-data";
import pLimit from "p-limit";
import Event from "../models/Event";
import DriveConnection from "../models/DriveConnection";
import Photo from "../models/Photo";
import { decryptRefreshToken } from "./driveCrypto";
import { GOOGLE_DRIVE_CLIENT_ID, GOOGLE_DRIVE_CLIENT_SECRET } from "../config";
import logger from "./logger";

// Direct-Drive mirror: human-readable backup at
//   Fyndr Storage / <event name> / <filename>
// alongside the G3 pool (machine-readable .part blobs in G3 Storage).
// Every export never throws — ingest/delete must survive a Drive outage.

const ROOT = "Fyndr Storage";

export interface DriveMirrorFile {
  filename: string;
  originalname: string;
}

export interface StoredPhotoRef {
  driveFileId?: string;
  filename?: string;
  uploadBy?: string;
}

function sanitize(name: string): string {
  const clean = name
    .replace(/[\r\n"/\\]/g, "_")
    .trim()
    .replace(/\.+$/, "")
    .slice(0, 60);
  return clean || "Untitled event";
}

function mimeFor(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "png":
      return "image/png";
    case "webp":
      return "image/webp";
    case "gif":
      return "image/gif";
    case "bmp":
      return "image/bmp";
    case "tiff":
    case "tif":
      return "image/tiff";
    default:
      return "image/jpeg";
  }
}
interface TokenData {
  access_token?: unknown;
}

interface DriveFileId {
  id: string;
}

interface DriveFileList {
  files?: { id: string; name?: string }[];
}

async function tokenFor(ownerIds: (string | undefined)[]): Promise<string | null> {
  const seen: Record<string, true> = {};
  const candidates: (string | undefined)[] = [...ownerIds];
  // Multi-user fallback: any linked photographer token can host the folder.
  try {
    const docs = await DriveConnection.find({}).select("userId").lean();
    for (const d of docs) candidates.push(d.userId);
  } catch {}
  for (const ownerId of candidates) {
    if (!ownerId || seen[ownerId]) continue;
    seen[ownerId] = true;
    const doc = await DriveConnection.findOne({ userId: ownerId }).catch(() => null);
    if (!doc) continue;
    try {
      const r = await axios.post<TokenData>(
        "https://oauth2.googleapis.com/token",
        {
          client_id: GOOGLE_DRIVE_CLIENT_ID,
          client_secret: GOOGLE_DRIVE_CLIENT_SECRET,
          refresh_token: decryptRefreshToken(doc.refreshTokenEnc),
          grant_type: "refresh_token",
        },
        { timeout: 15000 }
      );
      const token = r.data.access_token;
      if (typeof token === "string" && token) return token;
    } catch (e: unknown) {
      logger.warn("[drive] token refresh failed", {
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }
  return null;
}

async function findFolder(token: string, name: string, parentId?: string): Promise<string | null> {
  const headers = { Authorization: `Bearer ${token}` };
  const parentClause = parentId ? ` and '${parentId}' in parents` : "";
  const q = encodeURIComponent(
    `mimeType='application/vnd.google-apps.folder' and name='${name.replace(/'/g, "\\'")}' and trashed=false${parentClause}`
  );
  const found = await axios.get<DriveFileList>(
    `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id)`,
    { headers, timeout: 15000 }
  );
  return found.data.files?.[0]?.id || null;
}

async function ensureAlbumFolder(token: string, eventName: string, album: string): Promise<string | null> {
  const eventId = await ensureEventFolder(token, eventName);
  if (!eventId) return null;
  const headers = { Authorization: `Bearer ${token}` };
  try {
    const folder = sanitize(album || "General");
    let folderId = await findFolder(token, folder, eventId);
    if (!folderId) {
      const created = await axios.post<DriveFileId>(
        "https://www.googleapis.com/drive/v3/files?fields=id",
        { name: folder, mimeType: "application/vnd.google-apps.folder", parents: [eventId] },
        { headers, timeout: 15000 }
      );
      folderId = created.data.id;
    }
    return folderId;
  } catch (e: unknown) {
    logger.warn("[drive] album folder ensure failed", { error: e instanceof Error ? e.message : String(e) });
    return null;
  }
}

export async function syncUploadToDrive(
  event_id: string,
  uploadBy: string | undefined,
  file: DriveMirrorFile,
  bytes: Buffer,
  album = "General"
): Promise<void> {
  try {
    const event = await Event.findById(event_id).select("created_id event_name");
    if (!event) return;
    const token = await tokenFor([event.created_id, uploadBy]);
    if (!token) return;
    const folderId = await ensureAlbumFolder(token, event.event_name || "Untitled event", album);
    if (!folderId) return;
    const headers = { Authorization: `Bearer ${token}` };
    const mime = mimeFor(file.filename);
    const form = new FormData();
    form.append("metadata", JSON.stringify({ name: file.filename, parents: [folderId], mimeType: mime }), {
      contentType: "application/json",
    });
    form.append("media", bytes, { filename: file.filename, contentType: mime });
    const created = await axios.post<DriveFileId>(
      "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id",
      form,
      {
        headers: { ...form.getHeaders(), ...headers },
        maxBodyLength: Infinity,
        timeout: 120000,
      }
    );
    if (created.data.id) {
      await Photo.updateOne({ event_id, name: file.filename }, { driveFileId: created.data.id }).catch(() => {});
    }
  } catch (e: unknown) {
    logger.warn("[drive] upload mirror failed", {
      error: e instanceof Error ? e.message : String(e),
      event_id,
      filename: file.filename,
    });
  }
}

async function deleteFile(token: string, fileId: string): Promise<void> {
  await axios.delete(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
    headers: { Authorization: `Bearer ${token}` },
    timeout: 15000,
  });
}

export async function syncDeletePhotoFromDrive(event_id: string, photo: StoredPhotoRef): Promise<void> {
  try {
    const event = await Event.findById(event_id).select("created_id event_name");
    const token = await tokenFor([event?.created_id, photo.uploadBy]);
    if (!token) return;
    if (photo.driveFileId) {
      await deleteFile(token, photo.driveFileId).catch(() => {});
      return;
    }
    // Legacy photo without a recorded id: find by name in the event folder.
    if (!photo.filename || !event) return;
    const folderId = await findFolder(token, sanitize(event.event_name || "Untitled event"), undefined);
    if (!folderId) return;
    const headers = { Authorization: `Bearer ${token}` };
    const q = encodeURIComponent(
      `name='${photo.filename.replace(/'/g, "\\'")}' and '${folderId}' in parents and trashed=false`
    );
    const found = await axios.get<DriveFileList>(
      `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id)`,
      { headers, timeout: 15000 }
    );
    for (const f of found.data.files || []) {
      await deleteFile(token, f.id).catch(() => {});
    }
  } catch (e: unknown) {
    logger.warn("[drive] photo delete failed", {
      error: e instanceof Error ? e.message : String(e),
      event_id,
    });
  }
}

export async function syncDeleteEventFromDrive(
  event_id: string,
  eventName: string | undefined,
  ownerId: string | undefined,
  photos: StoredPhotoRef[]
): Promise<void> {
  try {
    const token = await tokenFor([ownerId]);
    if (!token) return;
    const limit = pLimit(6);
    await Promise.allSettled(
      photos.map((p) =>
        limit(async () => {
          if (p.driveFileId) await deleteFile(token, p.driveFileId).catch(() => {});
        })
      )
    );
    // Remove the now-empty event folder so Drive stays classified.
    const folderId = await ensureEventFolder(token, eventName || "Untitled event");
    if (folderId) await deleteFile(token, folderId).catch(() => {});
    void event_id;
  } catch (e: unknown) {
    logger.warn("[drive] event delete failed", {
      error: e instanceof Error ? e.message : String(e),
      event_id,
    });
  }
}
