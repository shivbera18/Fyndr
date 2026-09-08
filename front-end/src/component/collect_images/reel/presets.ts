export interface ReelTrack {
  id: string;
  label: string;
  src: string | null;
  credit: string;
}

// ponytail: bundled src paths resolve when CC0 mp3s land in public/reel-music;
// missing files 404 and export proceeds silent (no new dep, no licensed audio shipped).
export const REEL_TRACKS: ReelTrack[] = [
  { id: "none", label: "No music", src: null, credit: "" },
  { id: "upbeat", label: "Upbeat Pop", src: "/reel-music/upbeat.mp3", credit: "Royalty-free (CC0)" },
  { id: "romantic", label: "Romantic", src: "/reel-music/romantic.mp3", credit: "Royalty-free (CC0)" },
  { id: "party", label: "Party", src: "/reel-music/party.mp3", credit: "Royalty-free (CC0)" },
  { id: "lofi", label: "Lo-Fi Chill", src: "/reel-music/lofi.mp3", credit: "Royalty-free (CC0)" },
];

export type ReelTransition = "none" | "fade" | "slide" | "zoom";

export const REEL_TRANSITIONS: { id: ReelTransition; label: string }[] = [
  { id: "none", label: "None" },
  { id: "fade", label: "Crossfade" },
  { id: "slide", label: "Slide" },
  { id: "zoom", label: "Zoom" },
];

export type ReelAnimation = "none" | "zoom-in" | "zoom-out" | "pan-left" | "pan-right";

export const REEL_ANIMATIONS: { id: ReelAnimation; label: string }[] = [
  { id: "none", label: "None" },
  { id: "zoom-in", label: "Zoom in" },
  { id: "zoom-out", label: "Zoom out" },
  { id: "pan-left", label: "Pan left" },
  { id: "pan-right", label: "Pan right" },
];

export const REEL_MIN_PHOTOS = 2;
export const REEL_MAX_PHOTOS = 12;
export const REEL_W = 1080;
export const REEL_H = 1920;
export const REEL_FPS = 30;
export const PHOTO_DUR_MIN = 1;
export const PHOTO_DUR_MAX = 4;
export const PHOTO_DUR_DEFAULT = 2.5;
export const TRANS_DUR_MIN = 0;
export const TRANS_DUR_MAX = 1.5;
export const TRANS_DUR_DEFAULT = 0.5;
export const MAX_UPLOAD_AUDIO_MB = 15;

export function clampTransitionDuration(t: number, photoDur: number): number {
  return Math.min(Math.max(0, t), TRANS_DUR_MAX, Math.max(0, photoDur - 0.1));
}

export function reelTotalDuration(photoCount: number, photoDur: number, transDur: number): number {
  if (photoCount <= 0) return 0;
  return photoCount * photoDur + Math.max(0, photoCount - 1) * clampTransitionDuration(transDur, photoDur);
}

export function coverDraw(
  srcW: number,
  srcH: number,
  dstW: number,
  dstH: number
): { dw: number; dh: number; dx: number; dy: number } {
  if (srcW <= 0 || srcH <= 0) return { dw: dstW, dh: dstH, dx: 0, dy: 0 };
  const scale = Math.max(dstW / srcW, dstH / srcH);
  const dw = srcW * scale;
  const dh = srcH * scale;
  return { dw, dh, dx: (dstW - dw) / 2, dy: (dstH - dh) / 2 };
}

export interface TrimRange {
  start: number;
  end: number;
}

export const TRIM_MIN_LEN = 3;

export function clampTrim(start: number, end: number, duration: number): TrimRange {
  const d = Math.max(0, duration);
  let s = Math.min(Math.max(0, start), d);
  let e = Math.min(Math.max(0, end), d);
  if (e - s < TRIM_MIN_LEN) {
    e = Math.min(d, s + TRIM_MIN_LEN);
    s = Math.max(0, e - TRIM_MIN_LEN);
  }
  return { start: s, end: e };
}

export function smartStart(peaks: number[], duration: number, windowSec = 15): number {
  const d = Math.max(0, duration);
  if (!Array.isArray(peaks) || peaks.length === 0 || !(d > 0)) return d * 0.1;
  const n = peaks.length;
  const win = Math.max(1, Math.min(n, Math.round((windowSec / d) * n)));
  let best = 0;
  let bestSum = -Infinity;
  let sum = 0;
  for (let i = 0; i < n; i++) {
    const v = peaks[i];
    sum += typeof v === "number" && Number.isFinite(v) && v > 0 ? v : 0;
    if (i >= win) {
      const out = peaks[i - win];
      sum -= typeof out === "number" && Number.isFinite(out) && out > 0 ? out : 0;
    }
    if (i >= win - 1 && sum > bestSum) {
      bestSum = sum;
      best = i - win + 1;
    }
  }
  return Math.min(Math.max(0, (best / n) * d), Math.max(0, d - windowSec));
}

export function formatTrimTime(sec: number): string {
  const s = Math.max(0, sec);
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
}

export function withFragment(url: string, trim: TrimRange | null): string {
  if (!trim) return url;
  return `${url}#t=${trim.start.toFixed(1)},${trim.end.toFixed(1)}`;
}

export interface Timeline {
  holds: number[];
  joins: number[];
  total: number;
}

export function resolveTimeline(
  photoDur: number,
  transDur: number,
  transition: ReelTransition,
  perDur: (number | undefined)[]
): Timeline {
  const holds = perDur.map((d) => Math.min(PHOTO_DUR_MAX, Math.max(PHOTO_DUR_MIN, d ?? photoDur)));
  const joins: number[] = [];
  let total = 0;
  for (let i = 0; i < holds.length; i++) {
    total += holds[i];
    if (i < holds.length - 1) {
      const j = transition === "none" ? 0 : clampTransitionDuration(transDur, Math.min(holds[i], holds[i + 1]));
      joins.push(j);
      total += j;
    }
  }
  return { holds, joins, total };
}

// Holds align to selected order; loaded images are an in-order subset (partial
// failure). Use the matching prefix so pacing survives partial loads.
export function alignHolds(holds: number[] | undefined, n: number): number[] | null {
  if (!holds || n <= 0 || holds.length < n) return null;
  return holds.slice(0, n);
}

export type ReelRatio = "9:16" | "1:1" | "4:5";

export function reelDims(ratio: ReelRatio, hd720: boolean): { w: number; h: number } {
  const base =
    ratio === "1:1" ? { w: 1080, h: 1080 } : ratio === "4:5" ? { w: 1080, h: 1350 } : { w: 1080, h: 1920 };
  if (!hd720) return base;
  const k = 720 / 1080;
  return { w: Math.round(base.w * k), h: Math.round(base.h * k) };
}

export function reelBitrate(w: number, h: number): number {
  return Math.max(2_000_000, Math.round((8_000_000 * w * h) / (1080 * 1920)));
}

export type ReelFilter = "none" | "warm" | "vivid" | "soft" | "bw" | "vintage";

export const REEL_FILTERS: { id: ReelFilter; label: string; filter: string }[] = [
  { id: "none", label: "None", filter: "none" },
  { id: "warm", label: "Warm", filter: "saturate(1.15) sepia(0.15)" },
  { id: "vivid", label: "Vivid", filter: "saturate(1.25) contrast(1.05)" },
  { id: "soft", label: "Soft", filter: "brightness(1.05) saturate(0.9)" },
  { id: "bw", label: "B&W", filter: "grayscale(1)" },
  { id: "vintage", label: "Vintage", filter: "sepia(0.35) contrast(0.95)" },
];

export type TextStyle = "lower" | "center" | "minimal";

export interface ReelTemplate {
  id: string;
  label: string;
  hint: string;
  transition: ReelTransition;
  animation: ReelAnimation;
  photoDur: number;
  transDur: number;
  filter: ReelFilter;
  ratio: ReelRatio;
  mood?: string;
}

export const REEL_TEMPLATES: ReelTemplate[] = [
  { id: "wedding", label: "Wedding Romance", hint: "romantic", transition: "fade", animation: "zoom-in", photoDur: 2.5, transDur: 0.8, filter: "warm", ratio: "9:16", mood: "romantic" },
  { id: "party", label: "Party Energy", hint: "upbeat", transition: "slide", animation: "zoom-out", photoDur: 1.5, transDur: 0.5, filter: "vivid", ratio: "9:16", mood: "party" },
  { id: "chill", label: "Chill Highlights", hint: "lofi", transition: "fade", animation: "pan-left", photoDur: 3, transDur: 0.8, filter: "soft", ratio: "4:5", mood: "lofi" },
];
