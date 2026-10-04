import fs from "fs";
import path from "path";
import Photo from "../models/Photo";
import Event from "../models/Event";
import Studio from "../models/Studio";
import { EVENT_PROFILE_DIR } from "../config";

// ponytail: 20-entry LRU keyed photo.updatedAt+logoUpdatedAt; logo change invalidates.
const cache = new Map<string, Buffer>();

// Composites studio logo bottom-right into image bytes. Null = serve original.
export async function watermarked(photoName: string, bytes: Buffer): Promise<Buffer | null> {
  try {
    const photo = await Photo.findOne({ name: photoName }).select("event_id updatedAt");
    if (!photo?.event_id) return null;
    const event = await Event.findById(photo.event_id).select("created_id");
    if (!event?.created_id) return null;
    const studio = await Studio.findOne({ create_by: event.created_id }).select("logoUrl logoUpdatedAt");
    if (!studio?.logoUrl) return null;
    const key = `${photoName}:${String(photo.updatedAt)}:${String(studio.logoUpdatedAt)}`;
    const hit = cache.get(key);
    if (hit) return hit;
    let sharp: (input: unknown) => { metadata: () => Promise<{ width?: number; height?: number }>; resize: (o: unknown) => { png: () => { toBuffer: () => Promise<Buffer> } }; composite: (o: unknown) => { toBuffer: () => Promise<Buffer> } };
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      sharp = require("sharp");
    } catch (e) { console.error("[watermark] sharp unavailable, serving original", e instanceof Error ? e.message : String(e)); return null; }
    const meta = await sharp(bytes).metadata();
    if (!meta.width || meta.width < 400) return null;
    await fs.promises.stat(path.join(EVENT_PROFILE_DIR, path.basename(studio.logoUrl)));
    const targetW = Math.round(meta.width * 0.12);
    const logo = await sharp(path.join(EVENT_PROFILE_DIR, path.basename(studio.logoUrl))).resize({ width: targetW }).png().toBuffer();
    const lmeta = await sharp(logo).metadata();
    const w = meta.width || 800;
    const h = meta.height || 600;
    const margin = Math.round(Math.min(w, h) * 0.03);
    const out = await sharp(bytes).composite([{
      input: logo,
      left: Math.max(0, w - (lmeta.width || targetW) - margin),
      top: Math.max(0, h - (lmeta.height || targetW) - margin),
    }]).toBuffer();
    if (cache.size >= 20) cache.delete(cache.keys().next().value as string);
    cache.set(key, out);
    return out;
  } catch {
    return null;
  }
}
