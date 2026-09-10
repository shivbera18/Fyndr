import React, { useEffect, useMemo, useRef, useState } from "react";
import { ResponsiveModal } from "../../../components/ui/responsive-modal";
import { Button, buttonVariants } from "../../../components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../../components/ui/tabs";
import { cn } from "../../../lib/utils";
import { toast } from "sonner";
import { trackEvent } from "../../../utils/analytics";
import {
  MAX_UPLOAD_AUDIO_MB,
  PHOTO_DUR_DEFAULT,
  PHOTO_DUR_MAX,
  PHOTO_DUR_MIN,
  REEL_ANIMATIONS,
  REEL_FILTERS,
  REEL_MAX_PHOTOS,
  REEL_MIN_PHOTOS,
  REEL_TEMPLATES,
  REEL_TRANSITIONS,
  TRANS_DUR_DEFAULT,
  TRANS_DUR_MAX,
  TRANS_DUR_MIN,
  ReelAnimation,
  ReelFilter,
  ReelRatio,
  ReelTemplate,
  ReelTransition,
  TextStyle,
  clampTransitionDuration,
  clampTrim,
  reelDims,
  resolveTimeline,
  smartStart,
  withFragment,
} from "./presets";
import { MusicPicker } from "./musicPicker";
import { Waveform } from "./waveform";
import { loadTrackManifest, resolveCatalog } from "./tracks";
import type { CatalogTrack, ManifestTrack } from "./tracks";
import {
  extensionForMime,
  isReelExportSupported,
  loadReelImages,
  pickMimeType,
  previewReel,
  ReelExportAbortedError,
  renderCoverFrame,
  renderReelToFile,
} from "./reelRenderer";

export interface ReelCreatorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: string;
  eventName: string;
  photos: { name: string; url: string }[];
  isPhotoEligible?: (name: string) => boolean;
  onGatedPhoto?: () => void;
  asPage?: boolean;
}
function pruneKeys<T>(m: Record<string, T>, keep: Set<string>): Record<string, T> {
  const stale = Object.keys(m).filter((k) => !keep.has(k));
  if (stale.length === 0) return m;
  const next = { ...m };
  stale.forEach((k) => delete next[k]);
  return next;
}

function prefersReducedMotion(): boolean {
  try {
    return window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches === true;
  } catch {
    return false;
  }
}

interface ReelDraft {
  v: 1;
  selected: string[];
  musicId: string;
  trim: { start: number; end: number } | null;
  volume: number;
  fadeOn: boolean;
  durations: Record<string, number>;
  anims?: Record<string, ReelAnimation>;
  joins?: Record<string, ReelTransition>;
  captions?: Record<string, string>;
  transition: ReelTransition;
  animation: ReelAnimation;
  photoDur: number;
  transDur: number;
  ratio: ReelRatio;
  filter: ReelFilter;
  textStyle: TextStyle;
  templateId: string | null;
}

function isValidDraft(d: unknown): d is ReelDraft {
  if (!d || typeof d !== "object") return false;
  if (!("v" in d) || d.v !== 1) return false;
  if (!("selected" in d) || !Array.isArray(d.selected)) return false;
  if (!d.selected.every((s: unknown): s is string => typeof s === "string")) return false;
  if (!("musicId" in d) || typeof d.musicId !== "string") return false;
  if (!("volume" in d) || typeof d.volume !== "number") return false;
  if (!("fadeOn" in d) || typeof d.fadeOn !== "boolean") return false;
    if (!("durations" in d) || typeof d.durations !== "object" || d.durations === null) return false;
    if ("anims" in d && (typeof d.anims !== "object" || d.anims === null)) return false;
    if ("captions" in d && (typeof d.captions !== "object" || d.captions === null)) return false;
    if ("joins" in d && (typeof d.joins !== "object" || d.joins === null)) return false;
  if (!("transition" in d) || typeof d.transition !== "string") return false;
  if (!("animation" in d) || typeof d.animation !== "string") return false;
  if (!("photoDur" in d) || typeof d.photoDur !== "number") return false;
  if (!("transDur" in d) || typeof d.transDur !== "number") return false;
  if (!("ratio" in d) || typeof d.ratio !== "string") return false;
  if (!("filter" in d) || typeof d.filter !== "string") return false;
  if (!("textStyle" in d) || typeof d.textStyle !== "string") return false;
  if (!("templateId" in d) || (d.templateId !== null && typeof d.templateId !== "string")) return false;
  if ("trim" in d && d.trim !== null) {
    if (typeof d.trim !== "object") return false;
    if (!("start" in d.trim) || typeof d.trim.start !== "number") return false;
    if (!("end" in d.trim) || typeof d.trim.end !== "number") return false;
  }
  return true;
}
type Step = "photos" | "music" | "style" | "export";
const STEPS: Step[] = ["photos", "music", "style", "export"];
const STEP_LABEL: Record<Step, string> = { photos: "Photos", music: "Music", style: "Style", export: "Preview & Export" };
// Mobile step indicator: numbered circles on a connected string. The active
// circle scales up with a ring and the trail fills, so progress reads as
// movement from 1 → 4. Desktop keeps the pill tabs below.
function ReelStepper({
  step,
  index,
  unlocked,
  onGo,
}: {
  step: Step;
  index: number;
  unlocked: boolean;
  onGo: (s: Step) => void;
}): React.JSX.Element {
  return (
    <div className="sm:hidden">
      <ol aria-label="Reel progress" className="flex items-center">
        {STEPS.map((s, i) => {
          const active = s === step;
          const done = i < index;
          const reachable = i === 0 || unlocked;
          return (
            <li key={s} className={i < STEPS.length - 1 ? "flex flex-1 items-center" : "flex items-center"}>
              <button
                type="button"
                onClick={() => onGo(s)}
                disabled={!reachable}
                aria-label={`Step ${i + 1}: ${STEP_LABEL[s]}`}
                aria-current={active ? "step" : undefined}
                className={cn(
                  "flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-bold transition-all duration-300 motion-reduce:transition-none",
                  active && "scale-110 bg-primary text-primary-foreground ring-4 ring-primary/25",
                  !active && done && "bg-primary/70 text-primary-foreground",
                  !active && !done && "bg-muted text-muted-foreground",
                  !reachable && "opacity-40"
                )}
              >
                {done && !active ? <span aria-hidden="true">✓</span> : i + 1}
              </button>
              {i < STEPS.length - 1 && (
                <span
                  aria-hidden="true"
                  className={cn(
                    "mx-1.5 h-0.5 flex-1 rounded-full transition-colors duration-300 motion-reduce:transition-none",
                    i < index ? "bg-primary" : "bg-muted"
                  )}
                />
              )}
            </li>
          );
        })}
      </ol>
      <p aria-hidden="true" className="mt-1.5 text-center text-xs font-medium text-muted-foreground">
        Step {index + 1} of 4 · {STEP_LABEL[step]}
      </p>
    </div>
  );
}

const ReelCreatorModal = ({
  open,
  onOpenChange,
  eventId,
  eventName,
  photos,
  isPhotoEligible,
  onGatedPhoto,
  asPage = false,
}: ReelCreatorModalProps): React.JSX.Element => {
  const [step, setStep] = useState<Step>("photos");
  const [selected, setSelected] = useState<string[]>(() =>
    photos.slice(0, Math.min(4, photos.length)).map((p) => p.name)
  );
  // Photos arrive after mount (matched search / page deep link): seed the
  // first photos per event instead of leaving a stale empty selection that
  // renders a black preview with no way forward. Keyed by event so
  // /reel/evt1 -> /reel/evt2 (same mounted route) reselects instead of
  // keeping evt1 names that match nothing.
  const seededForRef = useRef("");
  useEffect(() => {
    if (photos.length === 0 || seededForRef.current === eventId) return;
    seededForRef.current = eventId;
    setSelected(photos.slice(0, Math.min(4, photos.length)).map((p) => p.name));
  }, [photos, eventId]);
  const [musicId, setMusicId] = useState<string>("none");
  const [customMusicUrl, setCustomMusicUrl] = useState<string | null>(null);
  const [customMusicName, setCustomMusicName] = useState<string>("");
  const [manifest, setManifest] = useState<ManifestTrack[]>([]);
  const [musicLoading, setMusicLoading] = useState<boolean>(false);
  const catalog = useMemo(() => resolveCatalog(manifest), [manifest]);
  const [trim, setTrim] = useState<{ start: number; end: number } | null>(null);
  const [volume, setVolume] = useState<number>(0.8);
  const [fadeOn, setFadeOn] = useState<boolean>(true);
  const [muted, setMuted] = useState<boolean>(false);
  const [uploadDuration, setUploadDuration] = useState<number>(0);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const previewSrcRef = useRef<string>("");
  const [transition, setTransition] = useState<ReelTransition>("fade");
  const [animation, setAnimation] = useState<ReelAnimation>(() =>
    prefersReducedMotion() ? "none" : "zoom-in"
  );
  const [photoDur, setPhotoDur] = useState<number>(PHOTO_DUR_DEFAULT);
  const [transDur, setTransDur] = useState<number>(TRANS_DUR_DEFAULT);
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [filter, setFilter] = useState<ReelFilter>("none");
  const [ratio, setRatio] = useState<ReelRatio>("9:16");
  const [hd720, setHd720] = useState<boolean>(false);
  const [textStyle, setTextStyle] = useState<TextStyle>("lower");
  const [coverIndex, setCoverIndex] = useState<number>(0);
  const [poster, setPoster] = useState<string | null>(null);
  const [draft, setDraft] = useState<ReelDraft | null>(null);
  const [durations, setDurations] = useState<Record<string, number>>({});
  const [anims, setAnims] = useState<Record<string, ReelAnimation>>({});
  const [joins, setJoins] = useState<Record<string, ReelTransition>>({});
  const [captions, setCaptions] = useState<Record<string, string>>({});
  const [liveMsg, setLiveMsg] = useState<string>("");
  const stepIndex = STEPS.indexOf(step);
  const prevStep: Step = STEPS[Math.max(0, stepIndex - 1)] ?? "photos";
  const nextStep: Step = STEPS[Math.min(STEPS.length - 1, stepIndex + 1)] ?? "export";
  const [navMsg, setNavMsg] = useState<string>("");
  useEffect(() => {
    // Screen-reader step announcements fire on step/count change only —
    // slider drags update the visual summary without flooding speech.
    setNavMsg(`Step ${stepIndex + 1} of 4: ${STEP_LABEL[step]} · ${selected.length} photos`);
  }, [step, stepIndex, selected.length]);
  const imageCacheRef = useRef(new Map<string, HTMLImageElement>());
  const [images, setImages] = useState<HTMLImageElement[]>([]);
  const [loadingPhotos, setLoadingPhotos] = useState<boolean>(false);
  const [playing, setPlaying] = useState<boolean>(true);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [resultExt, setResultExt] = useState<"mp4" | "webm">("mp4");
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [mutedNotice, setMutedNotice] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const customUrlRef = useRef<string | null>(null);
  const abortRef = useRef<"hidden" | "closed" | null>(null);
  // Page back-navigation unmounts mid-export without going through the modal
  // close handler — abort through the same flag so no phantom success toast
  // fires after the result state is gone.
  useEffect(() => () => {
    if (abortRef.current === null) abortRef.current = "closed";
  }, []);

  const exportSupported = useMemo(() => isReelExportSupported(), []);
  const selectedPhotos = useMemo(
    () => selected.map((n) => photos.find((p) => p.name === n)).filter(Boolean) as { name: string; url: string }[],
    [selected, photos]
  );
  const musicUrl = useMemo(() => {
    if (musicId === "custom") return customMusicUrl;
    return catalog.find((t) => t.id === musicId)?.src ?? null;
  }, [musicId, customMusicUrl, catalog]);
  const clampedTrans = clampTransitionDuration(transDur, photoDur);
  const timeline = useMemo(
    () =>
      resolveTimeline(
        photoDur,
        transDur,
        transition,
        selected.map((n) => durations[n]),
        selected.slice(0, -1).map((n) => joins[n])
      ),
    [photoDur, transDur, transition, selected, durations, joins]
  );
  const total = timeline.total;
  const joinList = useMemo(() => selected.slice(0, -1).map((n) => joins[n]), [selected, joins]);
  const animList = useMemo(() => selected.map((n) => anims[n]), [selected, anims]);
  const captionList = useMemo(() => selected.map((n) => captions[n] ?? ""), [selected, captions]);

  const activeTrack: CatalogTrack | undefined = useMemo(
    () => catalog.find((t) => t.id === musicId),
    [catalog, musicId]
  );
  const trackDuration = musicId === "custom" ? uploadDuration : activeTrack?.duration ?? 0;
  const dims = useMemo(() => reelDims(ratio, hd720), [ratio, hd720]);
  const filterValue = useMemo(
    () => REEL_FILTERS.find((f) => f.id === filter)?.filter ?? "none",
    [filter]
  );
  const titleOpt = useMemo(
    () => (eventName !== "" ? { text: eventName, style: textStyle } : null),
    [eventName, textStyle]
  );
  const endCard =
    activeTrack?.license === "CC-BY" && activeTrack.credit ? `Music: ${activeTrack.credit}` : null;


  const movePhoto = (name: string, dir: -1 | 1): void => {
    const i = selected.indexOf(name);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= selected.length) return;
    const next = selected.filter((n) => n !== name);
    next.splice(j, 0, name);
    setSelected(next);
    setLiveMsg(`${name}, position ${j + 1} of ${next.length}`);
  };

  const DUR_CYCLE: (number | undefined)[] = [undefined, 1, 2, 3, 4];
  const cycleDuration = (name: string): void => {
    setDurations((d) => {
      const nextVal = DUR_CYCLE[(DUR_CYCLE.indexOf(d[name]) + 1) % DUR_CYCLE.length];
      const next = { ...d };
      if (nextVal === undefined) delete next[name];
      else next[name] = nextVal;
      return next;
    });
  };

  useEffect(() => {
    const keep = new Set(selected);
    setDurations((d) => pruneKeys(d, keep));
    setAnims((a) => pruneKeys(a, keep));
    setJoins((j) => pruneKeys(j, keep));
    setCaptions((c) => pruneKeys(c, keep));
  }, [selected]);

  const ANIM_CYCLE: (ReelAnimation | undefined)[] = [undefined, "none", "zoom-in", "zoom-out", "pan-left", "pan-right"];
  const cycleAnim = (name: string): void => {
    setAnims((a) => {
      const nextVal = ANIM_CYCLE[(ANIM_CYCLE.indexOf(a[name]) + 1) % ANIM_CYCLE.length];
      const next = { ...a };
      if (nextVal === undefined) delete next[name];
      else next[name] = nextVal;
      return next;
    });
  };

  const cycleJoin = (name: string): void => {
    setJoins((j) => {
      const order: ReelTransition[] = ["fade", "slide", "zoom", "none"];
      const nextVal = order[(order.indexOf(j[name] ?? transition) + 1) % order.length];
      return { ...j, [name]: nextVal };
    });
  };

  const applyTemplate = (t: ReelTemplate): void => {
    setTemplateId(t.id);
    setTransition(t.transition);
    setAnimation(t.animation);
    setPhotoDur(t.photoDur);
    setTransDur(t.transDur);
    setFilter(t.filter);
    setRatio(t.ratio);
    setAnims({});
    setJoins({});
    if (t.mood && musicId === "none") {
      const match = catalog.find((c) => (c.mood ?? []).includes(t.mood as string));
      if (match) setMusicId(match.id);
    }
  };

  const applyDraft = (d: ReelDraft): void => {
    const valid = d.selected.filter(
      (n) => photos.some((p) => p.name === n) && (!isPhotoEligible || isPhotoEligible(n))
    );
    if (valid.length < REEL_MIN_PHOTOS) {
      toast.error("Saved draft no longer matches this event.");
      return;
    }
    setSelected(valid);
    if (d.musicId === "custom") {
      setMusicId("none");
      toast("Re-upload your audio — files can't be saved in drafts.");
    } else {
      setMusicId(d.musicId);
    }
    setTrim(d.trim);
    setVolume(d.volume);
    setFadeOn(d.fadeOn);
    setDurations(d.durations);
    setAnims(d.anims ?? {});
    setJoins(d.joins ?? {});
    setCaptions(d.captions ?? {});
    setTransition(d.transition);
    setAnimation(d.animation);
    setPhotoDur(d.photoDur);
    setTransDur(d.transDur);
    setRatio(d.ratio);
    setFilter(d.filter);
    setTextStyle(d.textStyle);
    setTemplateId(d.templateId);
    suppressSaveRef.current = false;
    setDraft(null);
  };

  // Suppresses auto-save while a loaded draft awaits Resume/Discard, and on the
  // mounting commit where effects observe pre-load state. Cleared on decision.
  const suppressSaveRef = useRef(false);

  useEffect(() => {
    if (!open) {
      setDraft(null);
      return;
    }
    suppressSaveRef.current = false;
    try {
      const raw = localStorage.getItem(`fyndr:reel:draft:${eventId}`);
      const parsed: unknown = raw ? JSON.parse(raw) : null;
      const d = isValidDraft(parsed) ? parsed : null;
      setDraft(d);
      suppressSaveRef.current = d !== null;
    } catch {
      setDraft(null);
    }
  }, [open, eventId]);

  useEffect(() => {
    if (!open || suppressSaveRef.current || selected.length < REEL_MIN_PHOTOS) return;
    try {
      const d: ReelDraft = {
        v: 1, selected, musicId, trim, volume, fadeOn, durations, anims, joins, captions,
        transition, animation, photoDur, transDur, ratio, filter, textStyle, templateId,
      };
      localStorage.setItem(`fyndr:reel:draft:${eventId}`, JSON.stringify(d));
    } catch {
      // Quota/private mode — drafts are best-effort.
    }
  }, [open, eventId, draft, selected, musicId, trim, volume, fadeOn, durations, anims, joins, captions, transition, animation, photoDur, transDur, ratio, filter, textStyle, templateId]);

  useEffect(() => {
    if (step !== "export" || images.length === 0) return;
    const off = document.createElement("canvas");
    const url = renderCoverFrame(off, images, Math.min(coverIndex, images.length - 1), {
      photoDuration: photoDur,
      transition,
      transitionDuration: transDur,
      animation,
      musicUrl: null,
      holds: timeline.holds,
      joinTransitions: joinList,
      anims: animList,
      width: dims.w,
      height: dims.h,
      filter: filterValue,
      title: titleOpt,
      endCard,
    });
    setPoster(url);
  }, [step, coverIndex, images, photoDur, transition, transDur, animation, timeline.holds, joinList, animList, dims, filterValue, titleOpt, endCard]);
  useEffect(() => {
    if (!open) return;
    setStep("photos");
    setError("");
    setResultUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setResultBlob(null);
    setMutedNotice(false);
    setProgress(0);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setMusicLoading(true);
    loadTrackManifest()
      .then((tracks) => {
        if (!cancelled) setManifest(tracks);
      })
      .finally(() => {
        if (!cancelled) setMusicLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    setMusicId((c) => (c === "custom" || catalog.some((t) => t.id === c) ? c : "none"));
  }, [catalog]);

  useEffect(() => {
    return () => {
      if (customUrlRef.current) URL.revokeObjectURL(customUrlRef.current);
    };
  }, []);

  useEffect(() => {
    setTrim(null);
  }, [musicId, customMusicUrl]);

  useEffect(() => {
    // Reset first: a dead remote URL must not keep the previous track's
    // duration in the trim UI and export end.
    setUploadDuration(0);
    if (musicId !== "custom" || !customMusicUrl) return;
    const el = new Audio(customMusicUrl);
    el.preload = "metadata";
    const onMeta = (): void => setUploadDuration(Number.isFinite(el.duration) ? el.duration : 0);
    const onErr = (): void => setUploadDuration(0);
    el.addEventListener("loadedmetadata", onMeta);
    el.addEventListener("error", onErr);
    return () => {
      el.removeEventListener("loadedmetadata", onMeta);
      el.removeEventListener("error", onErr);
      el.removeAttribute("src");
    };
  }, [musicId, customMusicUrl]);

  useEffect(() => {
    if (!open) {
      setImages([]);
      return;
    }
    const urls = selectedPhotos.map((p) => p.url);
    if (urls.length === 0) {
      setImages([]);
      return;
    }
    // URL-keyed cache: reorder re-sorts in place, only new URLs fetch.
    const cache = imageCacheRef.current;
    const missing = urls.filter((u) => !cache.has(u));
    if (missing.length === 0) {
      setImages(urls.map((u) => cache.get(u) as HTMLImageElement));
      return;
    }
    let cancelled = false;
    setLoadingPhotos(true);
    loadReelImages(missing)
      .then((imgs) => {
        if (cancelled) return;
        missing.forEach((u, i) => cache.set(u, imgs[i]));
        setImages(urls.map((u) => cache.get(u) as HTMLImageElement));
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setImages(urls.map((u) => cache.get(u)).filter((img): img is HTMLImageElement => Boolean(img)));
          toast.error(e instanceof Error ? e.message : "Could not load photos.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingPhotos(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, selectedPhotos]);

  // Visual loop: restarts only when the reel itself changes — never on audio tweaks.
  useEffect(() => {
    if (step !== "export" || !playing || images.length === 0) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const handle = previewReel(
      canvas,
      images,
      { photoDuration: photoDur, transition, transitionDuration: transDur, animation, musicUrl: null, holds: timeline.holds, joinTransitions: joinList, anims: animList, captions: captionList, width: dims.w, height: dims.h, filter: filterValue, title: titleOpt, endCard }
    );
    return () => handle.stop();
  }, [step, playing, images, photoDur, transition, transDur, clampedTrans, animation, timeline.holds, joinList, animList, captionList, dims, filterValue, titleOpt, endCard]);

  // Audible preview: plain element semantics (no AudioContext — the export owns
  // the single createMediaElementSource graph). Same fragment-loop as export.
  // Volume/mute apply live without restarting the canvas loop above.
  useEffect(() => {
    if (step !== "export" || images.length === 0) {
      previewAudioRef.current?.pause();
      return;
    }
    let el = previewAudioRef.current;
    if (!el) {
      el = new Audio();
      el.loop = true;
      el.preload = "auto";
      previewAudioRef.current = el;
    }
    const preview = el;
    if (playing && musicUrl) {
      const want = withFragment(musicUrl, trim);
      if (previewSrcRef.current !== want) {
        previewSrcRef.current = want;
        preview.src = want;
      }
      preview.volume = muted ? 0 : volume;
      preview.play()?.catch(() => undefined);
    } else {
      preview.pause();
    }
    return () => {
      preview.pause();
    };
  }, [step, playing, images.length, musicUrl, trim, volume, muted]);

  const toggleSelect = (name: string): void => {
    setSelected((prev) => {
      if (prev.includes(name)) return prev.filter((n) => n !== name);
      if (prev.length >= REEL_MAX_PHOTOS) {
        toast.error(`Pick up to ${REEL_MAX_PHOTOS} photos for a reel.`);
        return prev;
      }
      return [...prev, name];
    });
  };

  const handleAudioUpload = (file?: File | null): void => {
    if (!file) return;
    if (file.size > MAX_UPLOAD_AUDIO_MB * 1024 * 1024) {
      toast.error(`Audio must be under ${MAX_UPLOAD_AUDIO_MB}MB.`);
      return;
    }
    if (customUrlRef.current) URL.revokeObjectURL(customUrlRef.current);
    const url = URL.createObjectURL(file);
    customUrlRef.current = url;
    setCustomMusicUrl(url);
    setCustomMusicName(file.name);
    setMusicId("custom");
  };
  // Remote picks (free-music search, pasted links) reuse the custom slot: the
  // trim/volume/mute/export path already handles any URL, degrading to a
  // muted export with a notice when the host blocks audio reads (no CORS).
  const handleRemoteAudio = (url: string, name: string): void => {
    if (customUrlRef.current) {
      URL.revokeObjectURL(customUrlRef.current);
      customUrlRef.current = null;
    }
    setCustomMusicUrl(url);
    setCustomMusicName(name);
    setMusicId("custom");
  }

  const handleExport = async (): Promise<void> => {
    if (isExporting || images.length < REEL_MIN_PHOTOS) return;
    if (isPhotoEligible && selected.some((n) => !isPhotoEligible(n))) {
      onGatedPhoto?.();
      return;
    }
    // Export on an offscreen canvas: reusing the live preview canvas resizes
    // it mid-playback and races the preview rAF for the same pixels, which
    // froze or blanked the recording. Pause the preview loop (and its audio
    // element) for the export duration — one paint loop, no doubled music.
    const canvas = document.createElement("canvas");
    const wasPlaying = playing;
    setPlaying(false);
    setIsExporting(true);
    setError("");
    setMutedNotice(false);
    setProgress(0);
    abortRef.current = null;
    const onHide = (): void => {
      if (document.hidden) abortRef.current ??= "hidden";
    };
    document.addEventListener("visibilitychange", onHide);
    try {
      const blob = await renderReelToFile(canvas, images, {
        photoDuration: photoDur,
        transition,
        transitionDuration: transDur,
        animation,
        width: dims.w,
        height: dims.h,
        filter: filterValue,
        title: titleOpt,
        endCard,
        holds: timeline.holds,
        joinTransitions: joinList,
        anims: animList,
        captions: captionList,
        musicUrl,
        mix: musicUrl
          ? {
              url: musicUrl,
              start: trim?.start ?? 0,
              end: trim?.end ?? (trackDuration > 0 ? trackDuration : total),
              volume,
              fade: fadeOn ? 0.8 : 0,
              reelDuration: total,
            }
          : null,
        onProgress: (r) => setProgress(r),
        shouldAbort: () => abortRef.current !== null,
      });
      const ext = extensionForMime(blob.type || pickMimeType());
      const url = URL.createObjectURL(blob);
      setResultUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return url;
      });
      setResultExt(ext);
      setResultBlob(blob);
      try {
        localStorage.removeItem(`fyndr:reel:draft:${eventId}`);
      } catch {
        // Best-effort cleanup.
      }
      const muted = "muted" in blob && blob.muted === true;
      if (muted) {
        setMutedNotice(true);
      }
      trackEvent(eventId, "reel_export", {
        photoCount: images.length,
        durationMs: Math.round(total * 1000),
        transition,
        animation,
        musicId: musicUrl ? musicId : "none",
        hasMusic: Boolean(musicUrl),
        trimLen: trim ? Math.round((trim.end - trim.start) * 10) / 10 : null,
      });
      if (muted) {
        toast("Reel exported without music — the track couldn't load.");
      } else {
        toast.success(musicUrl ? "Reel exported." : "Reel exported without music.");
      }
    } catch (e: unknown) {
      if (e instanceof ReelExportAbortedError) {
        toast(abortRef.current === "closed" ? "Export cancelled." : "Export stopped — keep this tab visible.");
      } else {
        const msg = e instanceof Error ? e.message : "Video export failed in this browser. Try Chrome or Safari 17+.";
        setError(msg);
        toast.error(msg);
      }
    } finally {
      document.removeEventListener("visibilitychange", onHide);
      setIsExporting(false);
      setPlaying(wasPlaying);
    }
  };

  const handleShareFile = async (): Promise<void> => {
    if (!resultBlob) return;
    try {
      const file = new File([resultBlob], `fyndr-reel-${eventId}.${resultExt}`, { type: resultBlob.type });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: `${eventName || "Event"} reel` });
      }
    } catch {
      // User dismissed or share aborted — download remains available.
    }
  };
  const canNativeShare =
    typeof navigator !== "undefined" && typeof navigator.canShare === "function" && resultBlob !== null;

  const stepNav: React.JSX.Element = (
        <nav aria-label="Reel steps" className="flex items-center gap-2">
          <div aria-live="polite" className="sr-only">
            {navMsg}
          </div>
          <Button
            type="button"
            variant="outline"
            className="min-h-[44px] shrink-0 px-4 font-semibold"
            disabled={stepIndex === 0}
            aria-label={stepIndex === 0 ? "Back" : `Back to ${STEP_LABEL[prevStep]}`}
            onClick={() => setStep(prevStep)}
          >
            ← Back
          </Button>
          <p className="min-w-0 flex-1 truncate text-center text-xs text-muted-foreground sm:text-sm">
            {selected.length < REEL_MIN_PHOTOS
              ? `Select at least ${REEL_MIN_PHOTOS} photos`
              : `≈${total.toFixed(1)}s · ${selected.length} photos`}
          </p>
          {step === "export" ? (
            <Button
              type="button"
              className="min-h-[44px] shrink-0 px-4 font-semibold"
              loading={isExporting}
              disabled={!exportSupported || images.length < REEL_MIN_PHOTOS}
              aria-label="Export Reel"
              onClick={() => void handleExport()}
            >
              {isExporting ? "Exporting…" : "Export"}
            </Button>
          ) : (
            <Button
              type="button"
              className="min-h-[44px] shrink-0 px-4 font-semibold"
              disabled={selected.length < REEL_MIN_PHOTOS}
              aria-label={`Continue to ${STEP_LABEL[nextStep]}`}
              onClick={() => setStep(nextStep)}
            >
              Next →
            </Button>
          )}
        </nav>
  );
  const body: React.JSX.Element = (
      <Tabs value={step} onValueChange={(v) => setStep(v as Step)} className="space-y-3 pt-2">
        <ReelStepper step={step} index={stepIndex} unlocked={selected.length >= REEL_MIN_PHOTOS} onGo={setStep} />
        <TabsList className="hidden h-auto w-full grid-cols-4 gap-1 p-1 sm:grid">
          <TabsTrigger value="photos" className="min-h-[44px] px-2 py-2 text-xs lg:text-sm">1. Photos</TabsTrigger>
          <TabsTrigger value="music" disabled={selected.length < REEL_MIN_PHOTOS} className="min-h-[44px] px-2 py-2 text-xs lg:text-sm">2. Music</TabsTrigger>
          <TabsTrigger value="style" disabled={selected.length < REEL_MIN_PHOTOS} className="min-h-[44px] px-2 py-2 text-xs lg:text-sm">3. Style</TabsTrigger>
          <TabsTrigger value="export" disabled={selected.length < REEL_MIN_PHOTOS} className="min-h-[44px] px-2 py-2 text-xs lg:text-sm">
            4. Preview &amp; Export
          </TabsTrigger>
        </TabsList>

        <TabsContent value="photos" className="space-y-3">
          {draft && (
            <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card px-3 py-2">
              <span className="text-sm">Resume your saved draft?</span>
              <Button type="button" size="sm" className="min-h-[44px]" onClick={() => applyDraft(draft)}>
                Resume
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="min-h-[44px]"
                onClick={() => {
                  try {
                    localStorage.removeItem(`fyndr:reel:draft:${eventId}`);
                  } catch {
                    // Best-effort cleanup.
                  }
                  suppressSaveRef.current = false;
                  setDraft(null);
                }}
              >
                Discard
              </Button>
            </div>
          )}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <p className="text-sm text-muted-foreground">
              {selected.length} / {REEL_MAX_PHOTOS} selected — photos play in matched order.
            </p>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="min-h-[44px]"
                onClick={() => setSelected(photos.slice(0, REEL_MAX_PHOTOS).map((p) => p.name))}
              >
                Select all
              </Button>
              <Button type="button" variant="ghost" size="sm" className="min-h-[44px]" onClick={() => setSelected([])}>
                Clear
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 max-h-[46vh] overflow-y-auto pr-0.5">
            {photos.map((p, idx) => {
              const order = selected.indexOf(p.name);
              const checked = order >= 0;
              return (
                <label
                  key={p.name}
                  className={cn(
                    "relative aspect-square rounded-xl overflow-hidden bg-muted border cursor-pointer",
                    checked ? "border-primary ring-2 ring-primary/40" : "border-border"
                  )}
                >
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={checked}
                    onChange={() => toggleSelect(p.name)}
                    aria-label={`Select photo ${idx + 1}`}
                  />
                  <img src={p.url} alt={`Candidate ${idx + 1}`} loading="lazy" className="h-full w-full object-cover" />
                  <span
                    aria-hidden="true"
                    className={cn(
                      "absolute top-2 left-2 flex items-center justify-center min-h-[44px] min-w-[44px] rounded-lg text-sm font-bold",
                      checked ? "bg-primary text-primary-foreground" : "bg-black/50 text-white"
                    )}
                  >
                    {checked ? order + 1 : "+"}
                  </span>
                </label>
              );
            })}
          </div>
          {selected.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-semibold">Order &amp; pacing</p>
              <div aria-live="polite" className="sr-only">{liveMsg}</div>
              {selected.map((name, i) => {
                const photo = photos.find((p) => p.name === name);
                const override = durations[name];
                const anim = anims[name];
                return (
                  <div key={name} className="space-y-1 rounded-xl border border-border bg-card px-2 py-1">
                    <div className="flex min-h-[44px] items-center gap-1">
                      <span className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
                        {i + 1}
                      </span>
                      {photo && <img src={photo.url} alt="" aria-hidden="true" className="h-10 w-10 rounded-lg object-cover" />}
                      <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">{name}</span>
                      <button
                        type="button"
                        aria-label={`Move ${name} earlier`}
                        disabled={i === 0}
                        onClick={() => movePhoto(name, -1)}
                        className="min-h-[44px] min-w-[44px] rounded-lg bg-muted text-sm disabled:opacity-40"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        aria-label={`Move ${name} later`}
                        disabled={i === selected.length - 1}
                        onClick={() => movePhoto(name, 1)}
                        className="min-h-[44px] min-w-[44px] rounded-lg bg-muted text-sm disabled:opacity-40"
                      >
                        ↓
                      </button>
                    </div>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        aria-label={`Duration for ${name}: ${override ?? "auto"}`}
                        aria-pressed={override !== undefined}
                        onClick={() => cycleDuration(name)}
                        className="min-h-[44px] flex-1 rounded-lg bg-muted px-2 text-xs font-semibold"
                      >
                        {override !== undefined ? `${override}s` : "Auto"}
                      </button>
                      <button
                        type="button"
                        aria-label={`Animation for ${name}: ${anim ?? "global"}`}
                        aria-pressed={anim !== undefined}
                        onClick={() => cycleAnim(name)}
                        className="min-h-[44px] flex-1 rounded-lg bg-muted px-2 text-xs font-semibold"
                      >
                        FX: {anim ?? "Global"}
                      </button>
                    </div>
                    <label htmlFor={`caption-${i}`} className="sr-only">
                      {`Caption for ${name}`}
                    </label>
                    <input
                      id={`caption-${i}`}
                      value={captions[name] ?? ""}
                      maxLength={80}
                      placeholder="Add a caption…"
                      onChange={(e) => {
                        const v = e.target.value;
                        setCaptions((c) => {
                          const next = { ...c };
                          if (v === "") delete next[name];
                          else next[name] = v;
                          return next;
                        });
                      }}
                      className="min-h-[44px] w-full rounded-lg bg-muted px-2 text-base"
                    />
                  </div>
                );
              })}
              {selected.length > 1 && (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Transitions between photos</p>
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {selected.slice(0, -1).map((name, j) => {
                      const jt = joins[name] ?? transition;
                      const label = REEL_TRANSITIONS.find((t) => t.id === jt)?.label ?? jt;
                      return (
                        <button
                          key={name}
                          type="button"
                          onClick={() => cycleJoin(name)}
                          aria-label={`Transition after photo ${j + 1}: ${jt}`}
                          aria-pressed={joins[name] !== undefined}
                          className="min-h-[44px] shrink-0 rounded-lg bg-muted px-2 text-xs font-semibold"
                        >
                          {j + 1}→{j + 2}: {label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </TabsContent>
        <TabsContent value="music" className="space-y-4">
          <MusicPicker
            catalog={catalog}
            musicId={musicId}
            onSelect={setMusicId}
            customAudio={customMusicUrl ? { url: customMusicUrl, name: customMusicName } : null}
            onUpload={(file) => handleAudioUpload(file)}
            onSelectRemote={handleRemoteAudio}
            loading={musicLoading}
          />
          {musicUrl && trackDuration > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-semibold">Trim &amp; volume</p>
              <Waveform
                peaks={activeTrack?.peaks}
                duration={trackDuration}
                start={trim?.start ?? 0}
                end={trim?.end ?? trackDuration}
                onChange={(s, e) => setTrim({ start: s, end: e })}
                onChorus={() => {
                  const p = activeTrack?.peaks;
                  if (!p || p.length === 0) return;
                  const s = smartStart(p, trackDuration);
                  const c = clampTrim(s, s + 15, trackDuration);
                  setTrim({ start: c.start, end: c.end });
                }}
                onReset={() => setTrim(null)}
                canChorus={(activeTrack?.peaks?.length ?? 0) > 0}
              />
              <div className="space-y-1">
                <label htmlFor="reel-volume" className="text-sm font-semibold">
                  Volume {Math.round(volume * 100)}%
                </label>
                <input
                  id="reel-volume"
                  type="range"
                  min={0}
                  max={1}
                  step={0.1}
                  value={volume}
                  onChange={(e) => setVolume(Number(e.target.value))}
                  className="w-full accent-primary"
                />
              </div>
              <Button
                type="button"
                size="sm"
                variant={fadeOn ? "default" : "outline"}
                className="min-h-[44px]"
                onClick={() => setFadeOn((f) => !f)}
                aria-pressed={fadeOn}
              >
                Fade in/out
              </Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="style" className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm font-semibold">Template</p>
            <div className="grid grid-cols-1 gap-2">
              {REEL_TEMPLATES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => applyTemplate(t)}
                  aria-pressed={templateId === t.id}
                  className={cn(
                    "min-h-[44px] rounded-xl border px-3 py-2 text-left text-sm font-medium",
                    templateId === t.id ? "border-primary bg-primary/10" : "border-border bg-card"
                  )}
                >
                  {t.label}
                  <span className="block text-xs font-normal text-muted-foreground">
                    Try with {t.hint} music
                  </span>
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-semibold">Transition</p>
            <div className="flex flex-wrap gap-2">
              {REEL_TRANSITIONS.map((t) => (
                <Button
                  key={t.id}
                  type="button"
                  size="sm"
                  variant={transition === t.id ? "default" : "outline"}
                  className="min-h-[44px]"
                  onClick={() => setTransition(t.id)}
                >
                  {t.label}
                </Button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-semibold">Animation</p>
            <div className="flex flex-wrap gap-2">
              {REEL_ANIMATIONS.map((a) => (
                <Button
                  key={a.id}
                  type="button"
                  size="sm"
                  variant={animation === a.id ? "default" : "outline"}
                  className="min-h-[44px]"
                  onClick={() => setAnimation(a.id)}
                >
                  {a.label}
                </Button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-semibold">Filter</p>
            <div className="flex flex-wrap gap-2">
              {REEL_FILTERS.map((f) => (
                <Button
                  key={f.id}
                  type="button"
                  size="sm"
                  variant={filter === f.id ? "default" : "outline"}
                  className="min-h-[44px]"
                  onClick={() => setFilter(f.id)}
                >
                  {f.label}
                </Button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-semibold">Title card</p>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  ["lower", "Lower third"],
                  ["center", "Centered"],
                  ["minimal", "Minimal"],
                ] as [TextStyle, string][]
              ).map(([id, label]) => (
                <Button
                  key={id}
                  type="button"
                  size="sm"
                  variant={textStyle === id ? "default" : "outline"}
                  className="min-h-[44px]"
                  onClick={() => setTextStyle(id)}
                >
                  {label}
                </Button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-semibold">Aspect ratio</p>
            <div className="flex flex-wrap gap-2">
              {(["9:16", "1:1", "4:5"] as ReelRatio[]).map((r) => (
                <Button
                  key={r}
                  type="button"
                  size="sm"
                  variant={ratio === r ? "default" : "outline"}
                  className="min-h-[44px]"
                  onClick={() => setRatio(r)}
                >
                  {r}
                </Button>
              ))}
              <Button
                type="button"
                size="sm"
                variant={hd720 ? "default" : "outline"}
                className="min-h-[44px]"
                onClick={() => setHd720((v) => !v)}
                aria-pressed={hd720}
              >
                720p
              </Button>
            </div>
          </div>
          <div className="space-y-1">
            <label htmlFor="reel-photo-dur" className="text-sm font-semibold">
              {photoDur.toFixed(1)}s per photo
            </label>
            <input
              id="reel-photo-dur"
              type="range"
              min={PHOTO_DUR_MIN}
              max={PHOTO_DUR_MAX}
              step={0.5}
              value={photoDur}
              onChange={(e) => setPhotoDur(Number(e.target.value))}
              className="w-full accent-primary py-2"
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="reel-trans-dur" className="text-sm font-semibold">
              {clampedTrans.toFixed(1)}s transition
            </label>
            <input
              id="reel-trans-dur"
              type="range"
              min={TRANS_DUR_MIN}
              max={TRANS_DUR_MAX}
              step={0.1}
              value={transDur}
              onChange={(e) => setTransDur(Number(e.target.value))}
              className="w-full accent-primary py-2"
            />
          </div>
          <p className="text-sm text-muted-foreground">≈ {total.toFixed(1)}s reel</p>
        </TabsContent>

        <TabsContent value="export" className="space-y-3">
          <canvas
            ref={canvasRef}
            width={dims.w}
            height={dims.h}
            className="w-full max-h-[50vh] rounded-xl bg-black object-contain"
          />
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-muted-foreground">
              Cover {Math.min(coverIndex + 1, Math.max(1, images.length))}/{Math.max(1, images.length)}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="min-h-[44px]"
              disabled={images.length === 0}
              onClick={() => {
                setPlaying(false);
                setCoverIndex((i) => (i - 1 + images.length) % Math.max(1, images.length));
              }}
            >
              ← Prev
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="min-h-[44px]"
              disabled={images.length === 0}
              onClick={() => {
                setPlaying(false);
                setCoverIndex((i) => (i + 1) % Math.max(1, images.length));
              }}
            >
              Next →
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Exports .mp4 where supported (Safari 17+), otherwise .webm — both upload to Instagram.
          </p>
          {loadingPhotos && <p className="text-sm text-muted-foreground">Loading photos…</p>}
          {isExporting && (
            <div className="h-2 rounded-full bg-muted overflow-hidden" role="progressbar" aria-valuenow={Math.round(progress * 100)} aria-valuemin={0} aria-valuemax={100}>
              <div className="h-full bg-primary transition-all" style={{ width: `${Math.round(progress * 100)}%` }} />
            </div>
          )}
          {mutedNotice && (
            <p className="text-sm text-muted-foreground">Exported without music (audio failed to load).</p>
          )}
          {error && (
            <div role="alert" className="rounded-lg p-3 text-sm font-medium border bg-destructive/10 text-destructive border-destructive/20">
              {error}
            </div>
          )}
          {!exportSupported && (
            <p className="text-sm text-muted-foreground">
              Video export isn&apos;t supported in this browser — try Chrome or Safari 17+.
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              className="min-h-[44px]"
              disabled={isExporting}
              onClick={() => setPlaying((p) => !p)}
            >
              {playing ? "Pause" : "Play"}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="min-h-[44px]"
              onClick={() => setMuted((m) => !m)}
              aria-pressed={muted}
            >
              {muted ? "Unmute" : "Mute"}
            </Button>
          </div>
          {resultUrl && resultBlob && (
            <div className="space-y-2">
              <video src={resultUrl} poster={poster ?? undefined} controls playsInline className="w-full max-h-[40vh] rounded-xl bg-black" />
              <div className="flex flex-wrap gap-2">
                <a
                  href={resultUrl}
                  download={`fyndr-reel-${eventId}.${resultExt}`}
                  className={cn(buttonVariants({ variant: "default" }), "min-h-[44px]")}
                >
                  Download
                </a>
                {canNativeShare && (
                  <Button type="button" variant="outline" className="min-h-[44px]" onClick={() => void handleShareFile()}>
                    Share
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Tip: WhatsApp links accept text/URLs only — share this file from your gallery after downloading.
              </p>
            </div>
          )}
        </TabsContent>
      </Tabs>
  );
  if (asPage) {
    return (
      <div className="mx-auto w-full max-w-3xl space-y-4 pb-28">
        <div className="space-y-1 pt-1">
          <h1 className="text-xl font-bold tracking-tight">Create Reel</h1>
          <p className="text-sm text-muted-foreground">
            {eventName ? `Turn your matched photos from ${eventName} into a vertical video.` : "Turn your matched photos into a vertical video."}
          </p>
        </div>
        {body}
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 px-4 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] backdrop-blur">
          <div className="mx-auto w-full max-w-3xl">{stepNav}</div>
        </div>
      </div>
    );
  }
  return (
    <ResponsiveModal
      open={open}
      onOpenChange={(v) => {
        // Closing mid-export freezes the capture canvas the same way a hidden
        // tab does — abort through the same flag with its own toast reason.
        if (!v && abortRef.current === null) abortRef.current = "closed";
        onOpenChange(v);
      }}
      title="Create Reel"
      description={eventName ? `Turn your matched photos from ${eventName} into a vertical video.` : "Turn your matched photos into a vertical video."}
      className="sm:max-w-3xl"
      footer={stepNav}
    >
      {body}
    </ResponsiveModal>
  );
};

export default ReelCreatorModal;
