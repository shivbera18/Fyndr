import { useEffect, useMemo, useRef, useState } from "react";
import { ExternalLink, Pause, Play, Search, Upload } from "lucide-react";
import { cn } from "../../../lib/utils";
import { isRecord } from "./tracks";
import type { CatalogTrack } from "./tracks";

export interface PickerAudio {
  url: string;
  name: string;
}

interface MusicPickerProps {
  catalog: CatalogTrack[];
  musicId: string;
  onSelect(id: string): void;
  customAudio: PickerAudio | null;
  onUpload(file: File): void;
  loading: boolean;
  onSelectRemote?(url: string, name: string): void;
}

function formatDuration(totalSec?: number): string {
  if (typeof totalSec !== "number" || !(totalSec > 0)) return "";
  const m = Math.floor(totalSec / 60);
  const s = Math.round(totalSec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

export interface FreeTrack {
  id: string;
  title: string;
  artist: string;
  duration: number;
  streamUrl: string;
  artwork?: string;
}

// --- Free-music search (Audius discovery API, no key) ---

const AUDIUS_API = "https://discoveryprovider.audius.co";
const AUDIUS_APP = "FYNDR";

// Defensive parse: one odd entry skips, never throws.
export function parseAudiusTracks(data: unknown): FreeTrack[] {
  if (!isRecord(data) || !Array.isArray(data.data)) return [];
  const out: FreeTrack[] = [];
  for (const entry of data.data) {
    if (!isRecord(entry)) continue;
    const { id, title } = entry;
    if ((typeof id !== "string" && typeof id !== "number") || typeof title !== "string" || title === "") {
      continue;
    }
    const artist = isRecord(entry.user) && typeof entry.user.name === "string" ? entry.user.name : "Audius artist";
    const duration = typeof entry.duration === "number" && entry.duration > 0 ? entry.duration : 0;
    const track: FreeTrack = {
      id: `audius-${String(id)}`,
      title,
      artist,
      duration,
      streamUrl: `${AUDIUS_API}/v1/tracks/${String(id)}/stream?app_name=${AUDIUS_APP}`,
    };
    if (isRecord(entry.artwork) && typeof entry.artwork["150x150"] === "string") {
      track.artwork = entry.artwork["150x150"];
    }
    out.push(track);
  }
  return out;
}

export async function searchAudius(query: string, signal: AbortSignal): Promise<FreeTrack[]> {
  const res = await fetch(
    `${AUDIUS_API}/v1/tracks/search?query=${encodeURIComponent(query)}&limit=12&app_name=${AUDIUS_APP}`,
    { headers: { Accept: "application/json" }, signal }
  );
  if (!res.ok) throw new Error(`Free-music search failed (${res.status}).`);
  return parseAudiusTracks(await res.json());
}

// --- YouTube / direct-link audio ---

const YT_RE = /(?:youtube\.com\/(?:watch\?[^#]*v=|shorts\/|embed\/)|youtu\.be\/)([\w-]{6,})/;

export function extractYoutubeId(url: string): string | null {
  const m = url.trim().match(YT_RE);
  return m ? m[1] : null;
}

type Source = "library" | "free" | "link";
const SOURCES: { id: Source; label: string }[] = [
  { id: "library", label: "Library" },
  { id: "free", label: "Free music" },
  { id: "link", label: "YouTube & link" },
];

// List + inline preview + upload row. Validation and object-URL lifecycle stay in
// the modal (it owns the 15MB rule and revocation); this component only forwards Files.
export function MusicPicker({
  catalog,
  musicId,
  onSelect,
  customAudio,
  onUpload,
  loading,
  onSelectRemote,
}: MusicPickerProps): React.JSX.Element {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [chip, setChip] = useState("All");
  const [source, setSource] = useState<Source>("library");

  const moods = useMemo(() => {
    const seen: string[] = [];
    for (const t of catalog) {
      for (const m of t.mood ?? []) {
        if (!seen.includes(m)) seen.push(m);
      }
    }
    return seen;
  }, [catalog]);

  const q = query.trim().toLowerCase();
  // The `none` row has no src and stays pinned; only audible tracks filter.
  const visible = useMemo(
    () =>
      catalog.filter((t) => {
        if (!t.src) return true;
        if (chip !== "All" && !(t.mood ?? []).includes(chip)) return false;
        if (q === "") return true;
        return t.label.toLowerCase().includes(q) || (t.artist ?? "").toLowerCase().includes(q);
      }),
    [catalog, chip, q]
  );
  const audibleTotal = useMemo(() => catalog.filter((t) => t.src).length, [catalog]);
  const audibleShown = useMemo(() => visible.filter((t) => t.src).length, [visible]);

  useEffect(
    () => () => {
      audioRef.current?.pause();
    },
    []
  );

  const togglePreview = (id: string, label: string, src: string | null): void => {
    if (!src) return;
    let el = audioRef.current;
    if (!el) {
      el = new Audio();
      el.preload = "none";
      el.onended = () => setPlayingId(null);
      el.onerror = () => setPlayingId(null);
      audioRef.current = el;
    } else {
      el.pause();
    }
    if (playingId === id) {
      setPlayingId(null);
      return;
    }
    el.src = src;
    setPlayingId(id);
    // A superseded play() rejects (AbortError) when pause() interrupts it — only
    // clear state if this track is still the active one.
    el.play().catch(() => setPlayingId((curr) => (curr === id ? null : curr)));
  };

  // --- Free-music search state (Audius) ---
  const [fq, setFq] = useState("");
  const [fresults, setFresults] = useState<FreeTrack[]>([]);
  const [floading, setFloading] = useState(false);
  const [ferr, setFerr] = useState("");

  useEffect(() => {
    if (source !== "free") return;
    const trimmed = fq.trim();
    if (trimmed.length < 2) {
      setFresults([]);
      setFerr("");
      setFloading(false);
      return;
    }
    const ctrl = new AbortController();
    const timer = setTimeout(() => {
      setFloading(true);
      setFerr("");
      searchAudius(trimmed, ctrl.signal)
        .then((tracks) => {
          if (!ctrl.signal.aborted) setFresults(tracks);
        })
        .catch((e: unknown) => {
          if (!ctrl.signal.aborted) {
            setFresults([]);
            setFerr(e instanceof Error ? e.message : "Search failed.");
          }
        })
        .finally(() => {
          if (!ctrl.signal.aborted) setFloading(false);
        });
    }, 450);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [fq, source]);

  // --- YouTube / direct-link state ---
  const [link, setLink] = useState("");
  const [linkErr, setLinkErr] = useState("");
  const ytId = extractYoutubeId(link);

  const useLink = (): void => {
    const url = link.trim();
    if (!/^https:\/\//.test(url)) {
      setLinkErr("Paste an https:// link.");
      return;
    }
    setLinkErr("");
    let name = url;
    if (ytId) {
      name = `YouTube ${ytId}`;
    } else {
      try {
        const u = new URL(url);
        const tail = u.pathname.split("/").filter(Boolean).pop();
        name = tail ? `${u.hostname} · ${decodeURIComponent(tail)}` : u.hostname;
      } catch {
        // Keep the raw URL as the display name.
      }
    }
    onSelectRemote?.(url, name);
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold">Music</p>
        {onSelectRemote && (
          <div role="group" aria-label="Music source" className="flex gap-1 rounded-full bg-muted p-1">
            {SOURCES.map((s) => (
              <button
                key={s.id}
                type="button"
                aria-pressed={source === s.id}
                onClick={() => setSource(s.id)}
                className={cn(
                  "min-h-[44px] rounded-full px-3 text-xs font-semibold transition-colors",
                  source === s.id ? "bg-background text-foreground shadow" : "text-muted-foreground"
                )}
              >
                {s.label}
              </button>
            ))}
          </div>
        )}
      </div>
      {loading && <p className="text-sm text-muted-foreground">Loading music…</p>}

      {source === "library" && (
        <>
          <div className="sticky top-0 z-10 space-y-2 bg-background pb-2">
            <label htmlFor="reel-music-search" className="sr-only">
              Search songs or artists
            </label>
            <input
              id="reel-music-search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  e.stopPropagation();
                  setQuery("");
                }
              }}
              placeholder="Search songs or artists"
              className="min-h-[44px] w-full rounded-xl border border-border bg-card px-3 text-base"
            />
            {moods.length > 0 && (
              <div className="flex gap-2 overflow-x-auto pb-1" data-vaul-no-drag>
                {["All", ...moods].map((m) => (
                  <button
                    key={m}
                    type="button"
                    aria-pressed={chip === m}
                    onClick={() => setChip(m)}
                    className={cn(
                      "min-h-[44px] min-w-[44px] shrink-0 rounded-full px-3 text-sm font-medium",
                      chip === m ? "bg-primary text-primary-foreground" : "bg-muted"
                    )}
                  >
                    {m}
                  </button>
                ))}
              </div>
            )}
            <p aria-live="polite" className="text-xs text-muted-foreground">
              {audibleShown} of {audibleTotal} tracks
            </p>
          </div>
          <div className="grid grid-cols-1 gap-2">
            {visible.map((t) => {
              const active = musicId === t.id;
              const playing = playingId === t.id;
              const meta = [t.artist, formatDuration(t.duration)].filter(Boolean).join(" · ");
              return (
                <div
                  key={t.id}
                  className={cn(
                    "flex min-h-[44px] items-center gap-2 rounded-xl border px-2 py-2 text-left",
                    active ? "border-primary bg-primary/10" : "border-border bg-card"
                  )}
                >
                  {t.src ? (
                    <button
                      type="button"
                      aria-label={playing ? `Pause ${t.label}` : `Play ${t.label}`}
                      aria-pressed={playing}
                      onClick={() => togglePreview(t.id, t.label, t.src)}
                      className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg bg-muted"
                    >
                      {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => onSelect(t.id)}
                    aria-pressed={active}
                    className="min-w-0 flex-1 text-left"
                  >
                    <span className="block truncate text-sm font-medium">{t.label}</span>
                    {meta !== "" && <span className="block truncate text-xs text-muted-foreground">{meta}</span>}
                    {t.credit !== "" && (
                      <span className="block truncate text-xs text-muted-foreground">{t.credit}</span>
                    )}
                  </button>
                </div>
              );
            })}
            <label
              className={cn(
                "flex min-h-[44px] cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium",
                musicId === "custom" ? "border-primary bg-primary/10" : "border-border bg-card"
              )}
            >
              <Upload className="h-4 w-4 shrink-0" />
              <span className="truncate">{customAudio ? `Your audio: ${customAudio.name}` : "Upload from device"}</span>
              <input
                type="file"
                accept="audio/*"
                className="sr-only"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  if (file) onUpload(file);
                }}
              />
            </label>
          </div>
          {!loading && audibleShown === 0 && audibleTotal > 0 && (
            <p className="flex min-h-[44px] items-center gap-2 text-sm text-muted-foreground">
              <span>No tracks match —</span>
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setChip("All");
                }}
                className="min-h-[44px] rounded-lg bg-muted px-3 font-medium text-foreground"
              >
                Clear search
              </button>
            </p>
          )}
          {!loading && catalog.length <= 1 && (
            <p className="text-xs text-muted-foreground">No bundled tracks yet — upload audio from your device.</p>
          )}
        </>
      )}

      {source === "free" && onSelectRemote && (
        <div className="space-y-2">
          <label htmlFor="reel-free-search" className="sr-only">
            Search free music
          </label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              id="reel-free-search"
              type="search"
              value={fq}
              onChange={(e) => setFq(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") e.stopPropagation();
              }}
              placeholder="Search Audius free music"
              className="min-h-[44px] w-full rounded-xl border border-border bg-card py-2 pl-9 pr-3 text-base"
            />
          </div>
          <p className="text-xs text-muted-foreground">Open tracks from Audius — no account or key needed.</p>
          {floading && <p className="text-sm text-muted-foreground">Searching…</p>}
          {ferr !== "" && (
            <p role="alert" className="text-sm text-destructive">
              {ferr}
            </p>
          )}
          {!floading && ferr === "" && fq.trim().length >= 2 && fresults.length === 0 && (
            <p className="text-sm text-muted-foreground">No free tracks found — try another search.</p>
          )}
          {!floading && ferr === "" && fq.trim().length < 2 && (
            <p className="text-sm text-muted-foreground">Type at least 2 characters to search.</p>
          )}
          <div className="grid grid-cols-1 gap-2">
            {fresults.map((t) => {
              const playing = playingId === t.id;
              const using = musicId === "custom" && customAudio?.url === t.streamUrl;
              const meta = [t.artist, formatDuration(t.duration)].filter(Boolean).join(" · ");
              return (
                <div
                  key={t.id}
                  className={cn(
                    "flex min-h-[44px] items-center gap-2 rounded-xl border px-2 py-2 text-left",
                    using ? "border-primary bg-primary/10" : "border-border bg-card"
                  )}
                >
                  <button
                    type="button"
                    aria-label={playing ? `Pause ${t.title}` : `Play ${t.title}`}
                    aria-pressed={playing}
                    onClick={() => togglePreview(t.id, t.title, t.streamUrl)}
                    className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg bg-muted"
                  >
                    {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  </button>
                  {t.artwork && (
                    <img src={t.artwork} alt="" aria-hidden="true" loading="lazy" className="h-10 w-10 shrink-0 rounded-lg object-cover" />
                  )}
                  <button
                    type="button"
                    onClick={() => onSelectRemote(t.streamUrl, `${t.title} — ${t.artist}`)}
                    aria-pressed={using}
                    className="min-w-0 flex-1 text-left"
                  >
                    <span className="block truncate text-sm font-medium">
                      {t.title}
                      {using ? " · Using" : ""}
                    </span>
                    {meta !== "" && <span className="block truncate text-xs text-muted-foreground">{meta}</span>}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {source === "link" && onSelectRemote && (
        <div className="space-y-2">
          <label htmlFor="reel-link-input" className="text-sm font-semibold">
            Audio or YouTube link
          </label>
          <input
            type="url"
            inputMode="url"
            value={link}
            onChange={(e) => setLink(e.target.value)}
            id="reel-link-input"
            onKeyDown={(e) => {
              if (e.key === "Escape") e.stopPropagation();
            }}
            placeholder="Paste https:// audio or YouTube link"
            className="min-h-[44px] w-full rounded-xl border border-border bg-card px-3 text-base"
          />
          {linkErr !== "" && (
            <p role="alert" className="text-sm text-destructive">
              {linkErr}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={useLink}
              disabled={link.trim() === ""}
              className="min-h-[44px] rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-40"
            >
              Use this audio
            </button>
            <a
              href={`https://www.youtube.com/results?search_query=${encodeURIComponent(link.trim() === "" ? "wedding slideshow background music" : link.trim())}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl bg-muted px-4 text-sm font-semibold"
            >
              <ExternalLink className="h-4 w-4" />
              Search YouTube
            </a>
          </div>
          {ytId && (
            <div className="space-y-1">
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${ytId}`}
                title="YouTube preview"
                loading="lazy"
                allow="accelerometer; clipboard-write; encrypted-media; picture-in-picture"
                allowFullScreen
                className="aspect-video w-full rounded-xl border border-border"
              />
              <p className="text-xs text-muted-foreground">
                YouTube audio previews here but can&apos;t be muxed into the export — the file exports muted. For sound
                in the video, use a Free-music track or upload the audio file.
              </p>
            </div>
          )}
          {!ytId && link.trim() !== "" && (
            <p className="text-xs text-muted-foreground">
              Direct file links need CORS enabled or the export goes muted — the picker tells you on export.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
