import { REEL_TRACKS, ReelTrack } from "./presets";

export interface ManifestTrack {
  id: string;
  title: string;
  artist?: string;
  mood?: string[];
  src: string;
  duration: number;
  license: "CC0" | "CC-BY";
  credit?: string;
  bpm?: number;
  peaks?: number[];
}

export type CatalogTrack = ReelTrack & {
  license: "none" | "CC0" | "CC-BY";
  artist?: string;
  mood?: string[];
  duration?: number;
  bpm?: number;
  peaks?: number[];
};

export const TRACK_MANIFEST_URL = "/reel-music/manifest.json";

// Maintainer-approved https origins for streamed audio (R2 mirror). Same-origin
// paths need no entry. Empty until an R2 public host is configured — serve it with
// CORS (Access-Control-Allow-Origin + Range support) or the export mux breaks.
export const APPROVED_AUDIO_ORIGINS: string[] = [];

function isAllowedSrc(src: string): boolean {
  if (src.startsWith("/")) return true;
  try {
    const url = new URL(src);
    if (url.protocol !== "https:") return false;
    if (typeof window !== "undefined" && url.origin === window.location.origin) return true;
    return APPROVED_AUDIO_ORIGINS.includes(url.origin);
  } catch {
    return false;
  }
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function warn(msg: string): void {
  if (typeof process !== "undefined" && process.env.NODE_ENV !== "production") {
    console.warn(`[reel-tracks] ${msg}`);
  }
}

// Invalid entries are dropped (dev console.warn), never thrown — one bad track
// must not kill the picker. CC-BY without credit is always dropped.
export function validateManifest(data: unknown): ManifestTrack[] {
  if (!isRecord(data) || !Array.isArray(data.tracks)) {
    warn("manifest must be { tracks: [...] }");
    return [];
  }
  const seen = new Set<string>();
  const out: ManifestTrack[] = [];
  for (const entry of data.tracks) {
    if (!isRecord(entry)) continue;
    const { id, title, src, duration, license, credit } = entry;
    if (typeof id !== "string" || id === "" || seen.has(id)) {
      warn(`dropping track with missing/duplicate id: ${String(id)}`);
      continue;
    }
    if (typeof title !== "string" || title === "") continue;
    if (typeof src !== "string" || !isAllowedSrc(src)) {
      warn(`dropping track ${id}: disallowed src`);
      continue;
    }
    if (typeof duration !== "number" || !(duration > 0)) continue;
    if (license !== "CC0" && license !== "CC-BY") continue;
    if (license === "CC-BY" && (typeof credit !== "string" || credit.trim() === "")) {
      warn(`dropping track ${id}: CC-BY requires credit`);
      continue;
    }
    seen.add(id);
    const track: ManifestTrack = { id, title, src, duration, license };
    if (typeof entry.artist === "string") track.artist = entry.artist;
    if (Array.isArray(entry.mood) && entry.mood.every((m): m is string => typeof m === "string")) {
      track.mood = entry.mood;
    }
    if (typeof credit === "string" && credit !== "") track.credit = credit;
    if (typeof entry.bpm === "number" && entry.bpm > 0) track.bpm = entry.bpm;
    if (Array.isArray(entry.peaks) && entry.peaks.every((p): p is number => typeof p === "number")) {
      track.peaks = entry.peaks;
    }
    out.push(track);
  }
  return out;
}

export async function loadTrackManifest(): Promise<ManifestTrack[]> {
  try {
    const res = await fetch(TRACK_MANIFEST_URL, { headers: { Accept: "application/json" } });
    if (!res.ok) return [];
    return validateManifest(await res.json());
  } catch {
    return [];
  }
}

// Single source for the music-off entry — mirrors presets so the none-first
// contract pinned by reelPresets.test.ts cannot drift.
export function getNoneTrack(): ReelTrack {
  return REEL_TRACKS[0];
}

export function resolveCatalog(manifest: ManifestTrack[]): CatalogTrack[] {
  const none: CatalogTrack = { ...getNoneTrack(), license: "none" };
  return [
    none,
    ...manifest.map(
      (t): CatalogTrack => ({
        id: t.id,
        label: t.title,
        src: t.src,
        credit: t.credit ?? "",
        license: t.license,
        artist: t.artist,
        mood: t.mood,
        duration: t.duration,
        bpm: t.bpm,
        peaks: t.peaks,
      })
    ),
  ];
}
