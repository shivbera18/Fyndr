import { useEffect, useMemo, useRef, useState } from "react";
import { Pause, Play, Upload } from "lucide-react";
import { cn } from "../../../lib/utils";
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
}

function formatDuration(totalSec?: number): string {
  if (typeof totalSec !== "number" || !(totalSec > 0)) return "";
  const m = Math.floor(totalSec / 60);
  const s = Math.round(totalSec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

// List + inline preview + upload row. Validation and object-URL lifecycle stay in
// the modal (it owns the 15MB rule and revocation); this component only forwards Files.
export function MusicPicker({
  catalog,
  musicId,
  onSelect,
  customAudio,
  onUpload,
  loading,
}: MusicPickerProps): React.JSX.Element {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [chip, setChip] = useState("All");

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

  const togglePreview = (track: CatalogTrack): void => {
    if (!track.src) return;
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
    if (playingId === track.id) {
      setPlayingId(null);
      return;
    }
    el.src = track.src;
    setPlayingId(track.id);
    // A superseded play() rejects (AbortError) when pause() interrupts it — only
    // clear state if this track is still the active one.
    el.play().catch(() => setPlayingId((curr) => (curr === track.id ? null : curr)));
  };
  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold">Music</p>
      {loading && <p className="text-sm text-muted-foreground">Loading music…</p>}
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
            // Escape must clear the query, never bubble up and dismiss the modal.
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
                  onClick={() => togglePreview(t)}
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
    </div>
  );
}
