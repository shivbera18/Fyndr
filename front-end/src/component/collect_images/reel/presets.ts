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
