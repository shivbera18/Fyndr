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
  REEL_H,
  REEL_MAX_PHOTOS,
  REEL_MIN_PHOTOS,
  REEL_TRANSITIONS,
  REEL_W,
  TRANS_DUR_DEFAULT,
  TRANS_DUR_MAX,
  TRANS_DUR_MIN,
  ReelAnimation,
  ReelTransition,
  clampTransitionDuration,
  reelTotalDuration,
} from "./presets";
import { MusicPicker } from "./musicPicker";
import { loadTrackManifest, resolveCatalog } from "./tracks";
import type { ManifestTrack } from "./tracks";
import {
  extensionForMime,
  isReelExportSupported,
  loadReelImages,
  pickMimeType,
  previewReel,
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
}

function prefersReducedMotion(): boolean {
  try {
    return window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches === true;
  } catch {
    return false;
  }
}

type Step = "photos" | "style" | "export";

const ReelCreatorModal = ({
  open,
  onOpenChange,
  eventId,
  eventName,
  photos,
  isPhotoEligible,
  onGatedPhoto,
}: ReelCreatorModalProps): React.JSX.Element => {
  const [step, setStep] = useState<Step>("photos");
  const [selected, setSelected] = useState<string[]>(() =>
    photos.slice(0, Math.min(4, photos.length)).map((p) => p.name)
  );
  const [musicId, setMusicId] = useState<string>("none");
  const [customMusicUrl, setCustomMusicUrl] = useState<string | null>(null);
  const [customMusicName, setCustomMusicName] = useState<string>("");
  const [manifest, setManifest] = useState<ManifestTrack[]>([]);
  const [musicLoading, setMusicLoading] = useState<boolean>(false);
  const catalog = useMemo(() => resolveCatalog(manifest), [manifest]);
  const [transition, setTransition] = useState<ReelTransition>("fade");
  const [animation, setAnimation] = useState<ReelAnimation>(() =>
    prefersReducedMotion() ? "none" : "zoom-in"
  );
  const [photoDur, setPhotoDur] = useState<number>(PHOTO_DUR_DEFAULT);
  const [transDur, setTransDur] = useState<number>(TRANS_DUR_DEFAULT);
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
  const total = reelTotalDuration(selected.length, photoDur, transDur);

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
    if (!open) {
      setImages([]);
      return;
    }
    if (selectedPhotos.length === 0) {
      setImages([]);
      return;
    }
    let cancelled = false;
    setLoadingPhotos(true);
    loadReelImages(selectedPhotos.map((p) => p.url))
      .then((imgs) => {
        if (!cancelled) setImages(imgs);
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setImages([]);
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

  useEffect(() => {
    if (step !== "export" || !playing || images.length === 0) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const handle = previewReel(
      canvas,
      images,
      { photoDuration: photoDur, transition, transitionDuration: clampedTrans, animation, musicUrl: null }
    );
    return () => handle.stop();
  }, [step, playing, images, photoDur, transition, clampedTrans, animation]);

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

  const handleExport = async (): Promise<void> => {
    if (isExporting || images.length < REEL_MIN_PHOTOS) return;
    if (isPhotoEligible && selected.some((n) => !isPhotoEligible(n))) {
      onGatedPhoto?.();
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas) return;
    setIsExporting(true);
    setError("");
    setMutedNotice(false);
    setProgress(0);
    try {
      const blob = await renderReelToFile(canvas, images, {
        photoDuration: photoDur,
        transition,
        transitionDuration: clampedTrans,
        animation,
        musicUrl,
        onProgress: (r) => setProgress(r),
      });
      const ext = extensionForMime(blob.type || pickMimeType());
      const url = URL.createObjectURL(blob);
      setResultUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return url;
      });
      setResultExt(ext);
      setResultBlob(blob);
      if ("muted" in blob && blob.muted === true) {
        setMutedNotice(true);
      }
      trackEvent(eventId, "reel_export", {
        photoCount: images.length,
        durationMs: Math.round(total * 1000),
        transition,
        animation,
        musicId: musicUrl ? musicId : "none",
        hasMusic: Boolean(musicUrl),
      });
      toast.success(musicUrl ? "Reel exported." : "Reel exported without music.");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Video export failed in this browser. Try Chrome or Safari 17+.";
      setError(msg);
      toast.error(msg);
    } finally {
      setIsExporting(false);
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

  return (
    <ResponsiveModal
      open={open}
      onOpenChange={onOpenChange}
      title="Create Reel"
      description={eventName ? `Turn your matched photos from ${eventName} into a vertical video.` : "Turn your matched photos into a vertical video."}
      className="sm:max-w-3xl"
    >
      <Tabs value={step} onValueChange={(v) => setStep(v as Step)} className="pt-2">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="photos" className="min-h-[44px]">1. Photos</TabsTrigger>
          <TabsTrigger value="style" className="min-h-[44px]">2. Music &amp; Style</TabsTrigger>
          <TabsTrigger value="export" disabled={selected.length < REEL_MIN_PHOTOS} className="min-h-[44px]">
            3. Preview &amp; Export
          </TabsTrigger>
        </TabsList>

        <TabsContent value="photos" className="space-y-3">
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
          {selected.length < REEL_MIN_PHOTOS && (
            <p className="text-sm text-muted-foreground">Select at least {REEL_MIN_PHOTOS} photos.</p>
          )}
          <Button
            type="button"
            className="w-full min-h-[44px]"
            disabled={selected.length < REEL_MIN_PHOTOS}
            onClick={() => setStep("style")}
          >
            Next: Music &amp; Style
          </Button>
        </TabsContent>

        <TabsContent value="style" className="space-y-4">
          <MusicPicker
            catalog={catalog}
            musicId={musicId}
            onSelect={setMusicId}
            customAudio={customMusicUrl ? { url: customMusicUrl, name: customMusicName } : null}
            onUpload={(file) => handleAudioUpload(file)}
            loading={musicLoading}
          />
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
          <Button
            type="button"
            className="w-full min-h-[44px]"
            disabled={selected.length < REEL_MIN_PHOTOS}
            onClick={() => setStep("export")}
          >
            Next: Preview &amp; Export
          </Button>
        </TabsContent>

        <TabsContent value="export" className="space-y-3">
          <canvas
            ref={canvasRef}
            width={REEL_W}
            height={REEL_H}
            className="w-full max-h-[50vh] rounded-xl bg-black object-contain"
          />
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
              onClick={() => setPlaying((p) => !p)}
            >
              {playing ? "Pause" : "Play"}
            </Button>
            <Button
              type="button"
              className="min-h-[44px] flex-1"
              loading={isExporting}
              disabled={!exportSupported || images.length < REEL_MIN_PHOTOS}
              onClick={() => void handleExport()}
            >
              {isExporting ? "Exporting…" : "Export Reel"}
            </Button>
          </div>
          {resultUrl && resultBlob && (
            <div className="space-y-2">
              <video src={resultUrl} controls playsInline className="w-full max-h-[40vh] rounded-xl bg-black" />
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
    </ResponsiveModal>
  );
};

export default ReelCreatorModal;
