import {
  REEL_FPS,
  REEL_H,
  REEL_W,
  ReelAnimation,
  ReelTransition,
  clampTransitionDuration,
  coverDraw,
  reelTotalDuration,
  resolveTimeline,
  withFragment,
} from "./presets";

export interface ReelMix {
  url: string;
  start: number;
  end: number;
  volume: number;
  fade: number;
  reelDuration: number;
}

export interface ReelRenderOptions {
  photoDuration: number;
  transition: ReelTransition;
  transitionDuration: number;
  animation: ReelAnimation;
  musicUrl: string | null;
  holds?: number[];
  mix?: ReelMix | null;
  onProgress?: (ratio: number) => void;
}

const MIME_CANDIDATES = [
  "video/mp4",
  "video/webm;codecs=vp9,opus",
  "video/webm;codecs=vp8,opus",
  "video/webm",
];

export function pickMimeType(): string {
  try {
    if (typeof MediaRecorder === "undefined") return "";
    for (const m of MIME_CANDIDATES) {
      try {
        if (MediaRecorder.isTypeSupported(m)) return m;
      } catch {
        // try next candidate
      }
    }
  } catch {
    return "";
  }
  return "";
}

export function extensionForMime(m: string): "mp4" | "webm" {
  return m.includes("mp4") ? "mp4" : "webm";
}

export function isReelExportSupported(): boolean {
  if (typeof MediaRecorder === "undefined") return false;
  if (typeof document === "undefined") return false;
  try {
    const c = document.createElement("canvas") as HTMLCanvasElement;
    return typeof c.captureStream === "function";
  } catch {
    return false;
  }
}

export async function loadReelImages(urls: string[]): Promise<HTMLImageElement[]> {
  // ponytail: plain <img> + object URL keeps the declared HTMLImageElement[]
  // type (createImageBitmap returns ImageBitmap instead) and stays CORS-clean
  // on same-origin /uploads blobs.
  const out: HTMLImageElement[] = [];
  let failed = 0;
  for (const url of urls) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const objUrl = URL.createObjectURL(blob);
      try {
        const img = await new Promise<HTMLImageElement>((resolve, reject) => {
          const el = new Image();
          el.onload = () => resolve(el);
          el.onerror = () => reject(new Error("decode failed"));
          el.src = objUrl;
        });
        out.push(img);
      } finally {
        URL.revokeObjectURL(objUrl);
      }
    } catch {
      failed += 1;
    }
  }
  if (failed > 0) {
    throw new Error(
      `Could not load ${failed} of ${urls.length} photos. Check connection and retry.`
    );
  }
  return out;
}

function animTransform(animation: ReelAnimation, t01: number, w: number): { s: number; tx: number; ty: number } {
  const t = Math.min(1, Math.max(0, t01));
  switch (animation) {
    case "zoom-in":
      return { s: 1 + 0.12 * t, tx: 0, ty: 0 };
    case "zoom-out":
      return { s: 1.12 - 0.12 * t, tx: 0, ty: 0 };
    case "pan-left":
      return { s: 1, tx: (0.03 - 0.06 * t) * w, ty: 0 };
    case "pan-right":
      return { s: 1, tx: (-0.03 + 0.06 * t) * w, ty: 0 };
    case "none":
    default:
      return { s: 1, tx: 0, ty: 0 };
  }
}

function drawSlide(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  t01: number,
  animation: ReelAnimation,
  w: number,
  h: number,
  xOff = 0,
  alpha = 1,
  extraScale = 1
): void {
  const natW = img.naturalWidth || w;
  const natH = img.naturalHeight || h;
  const { dw, dh } = coverDraw(natW, natH, w, h);
  const { s, tx, ty } = animTransform(animation, t01, w);
  const scale = s * extraScale;
  const dwS = dw * scale;
  const dhS = dh * scale;
  ctx.save();
  ctx.globalAlpha = Math.min(1, Math.max(0, alpha));
  ctx.drawImage(img, (w - dwS) / 2 + tx + xOff, (h - dhS) / 2 + ty, dwS, dhS);
  ctx.restore();
}

// Holds walk (matches resolveTimeline): each slide holds, then a join segment
// cross-blends into the next slide. Absent holds = legacy uniform arithmetic.
function paintAt(
  ctx: CanvasRenderingContext2D,
  images: HTMLImageElement[],
  timeSec: number,
  opts: ReelRenderOptions,
  w: number,
  h: number
): void {
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, w, h);
  const n = images.length;
  if (n === 0) return;
  const uniHold = Math.max(0.1, opts.photoDuration);
  const uniTrans =
    opts.transition === "none" ? 0 : clampTransitionDuration(opts.transitionDuration, opts.photoDuration);
  const useHolds = opts.holds && opts.holds.length === n ? opts.holds : null;
  const holdAt = (i: number): number => Math.max(0.1, useHolds ? useHolds[i] : uniHold);
  const transAt = (j: number): number => {
    if (opts.transition === "none") return 0;
    if (!useHolds) return uniTrans;
    return clampTransitionDuration(opts.transitionDuration, Math.min(holdAt(j), holdAt(j + 1)));
  };
  let cursor = 0;
  for (let k = 0; k < n; k++) {
    const hold = holdAt(k);
    if (k === n - 1 || timeSec < cursor + hold) {
      const t01 = hold > 0 ? (timeSec - cursor) / hold : 1;
      drawSlide(ctx, images[k], Math.min(1, Math.max(0, t01)), opts.animation, w, h);
      return;
    }
    cursor += hold;
    const trans = transAt(k);
    if (trans > 0 && timeSec < cursor + trans) {
      const p = Math.min(1, Math.max(0, (timeSec - cursor) / trans));
      const next = images[k + 1];
      const cur = images[k];
      switch (opts.transition) {
        case "fade":
          drawSlide(ctx, cur, 1, opts.animation, w, h);
          drawSlide(ctx, next, p, opts.animation, w, h, 0, p);
          break;
        case "slide":
          drawSlide(ctx, cur, 1, opts.animation, w, h, -p * w);
          drawSlide(ctx, next, p, opts.animation, w, h, (1 - p) * w);
          break;
        case "zoom":
          drawSlide(ctx, cur, 1, opts.animation, w, h, 0, 1 - p, 1 + 0.15 * p);
          drawSlide(ctx, next, p, opts.animation, w, h, 0, p);
          break;
        case "none":
        default:
          drawSlide(ctx, next, 0, opts.animation, w, h);
          break;
      }
      return;
    }
    cursor += trans;
  }
  // Terminal pin: float accumulation must never leave a black final frame.
  drawSlide(ctx, images[n - 1], 1, opts.animation, w, h);
}

export interface ReelPreviewHandle {
  stop(): void;
}

export function previewReel(
  canvas: HTMLCanvasElement,
  images: HTMLImageElement[],
  opts: ReelRenderOptions
): ReelPreviewHandle {
  canvas.width = REEL_W;
  canvas.height = REEL_H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return { stop: () => undefined };
  const total = Math.max(
    0.1,
    opts.holds && opts.holds.length === images.length
      ? resolveTimeline(opts.photoDuration, opts.transitionDuration, opts.transition, opts.holds).total
      : reelTotalDuration(images.length, opts.photoDuration, opts.transitionDuration)
  );
  let raf = 0;
  let stopped = false;
  const t0 = performance.now();
  const frame = (now: number): void => {
    if (stopped) return;
    const elapsed = ((now - t0) / 1000) % total;
    paintAt(ctx, images, elapsed, { ...opts, onProgress: undefined }, REEL_W, REEL_H);
    raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);
  return {
    stop: () => {
      stopped = true;
      cancelAnimationFrame(raf);
    },
  };
}

export async function renderReelToFile(
  canvas: HTMLCanvasElement,
  images: HTMLImageElement[],
  opts: ReelRenderOptions
): Promise<Blob> {
  const mimeType = pickMimeType();
  if (!mimeType) throw new Error("Video export failed in this browser. Try Chrome or Safari 17+.");
  if (images.length === 0) throw new Error("Select at least 2 photos to export.");

  canvas.width = REEL_W;
  canvas.height = REEL_H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Video export failed in this browser. Try Chrome or Safari 17+.");

  const total = Math.max(
    0.1,
    opts.holds && opts.holds.length === images.length
      ? resolveTimeline(opts.photoDuration, opts.transitionDuration, opts.transition, opts.holds).total
      : reelTotalDuration(images.length, opts.photoDuration, opts.transitionDuration)
  );
  const stream = canvas.captureStream(REEL_FPS);

  // Audio runs through WebAudio so music lands in the recorded file.
  // new Audio().play() executes synchronously in the Export click tick (this
  // async fn runs sync until its first await) to satisfy autoplay policies.
  let audioEl: HTMLAudioElement | null = null;
  let audioCtx: AudioContext | null = null;
  let mutedFallback = false;
  let combined: MediaStream = stream;
  const mixUrl = opts.mix ? withFragment(opts.mix.url, { start: opts.mix.start, end: opts.mix.end }) : opts.musicUrl;
  if (mixUrl) {
    try {
      audioEl = new Audio(mixUrl);
      audioEl.crossOrigin = "anonymous";
      audioEl.loop = true;
      audioEl.preload = "auto";
      await audioEl.play();
      // Safari prefixes it webkitAudioContext, which lib.dom does not declare.
      const winWithPrefix: { webkitAudioContext?: typeof AudioContext } = window as unknown as typeof window & {
        webkitAudioContext?: typeof AudioContext;
      };
      const AC = window.AudioContext || winWithPrefix.webkitAudioContext;
      if (!AC) throw new Error("WebAudio unsupported");
      audioCtx = new AC();
      if (audioCtx.state === "suspended") await audioCtx.resume().catch(() => undefined);
      const src = audioCtx.createMediaElementSource(audioEl);
      const dest = audioCtx.createMediaStreamDestination();
      // Single gain stage: constant volume, or reel-anchored fades on context time.
      const gain = audioCtx.createGain();
      const volume = Math.min(1, Math.max(0, opts.mix?.volume ?? 1));
      const fade = Math.max(0, opts.mix?.fade ?? 0);
      const reelLen = Math.max(0.1, opts.mix?.reelDuration ?? total);
      const t0 = audioCtx.currentTime;
      if (fade > 0) {
        gain.gain.setValueAtTime(0.0001, t0);
        gain.gain.linearRampToValueAtTime(Math.max(0.0001, volume), t0 + Math.min(fade, reelLen));
        gain.gain.setValueAtTime(Math.max(0.0001, volume), t0 + Math.max(0, reelLen - fade));
        gain.gain.linearRampToValueAtTime(0.0001, t0 + reelLen);
      } else {
        gain.gain.value = volume;
      }
      src.connect(gain);
      gain.connect(dest);
      gain.connect(audioCtx.destination);
      combined = new MediaStream([...stream.getVideoTracks(), ...dest.stream.getAudioTracks()]);
    } catch {
      // Non-fatal: export the silent video instead of failing the reel.
      mutedFallback = true;
      audioEl = null;
      combined = stream;
    }
  }

  const recorder = new MediaRecorder(combined, { mimeType, videoBitsPerSecond: 8_000_000 });
  const chunks: BlobPart[] = [];
  recorder.ondataavailable = (e: BlobEvent) => {
    if (e.data && e.data.size > 0) chunks.push(e.data);
  };
  const stopped = new Promise<void>((resolve) => {
    recorder.onstop = () => resolve();
  });
  recorder.onerror = () => {
    try {
      recorder.stop();
    } catch {
      // resolve via onstop
    }
  };

  const paintOpts: ReelRenderOptions = { ...opts, onProgress: undefined };
  let raf = 0;
  const t0 = performance.now();
  try {
    recorder.start(250);
    await new Promise<void>((resolve) => {
      const frame = (now: number): void => {
        const elapsed = (now - t0) / 1000;
        paintAt(ctx, images, Math.min(elapsed, total), paintOpts, REEL_W, REEL_H);
        opts.onProgress?.(Math.min(1, elapsed / total));
        if (elapsed >= total) {
          resolve();
          return;
        }
        raf = requestAnimationFrame(frame);
      };
      raf = requestAnimationFrame(frame);
    });
  } finally {
    cancelAnimationFrame(raf);
  }

  try {
    if (recorder.state !== "inactive") recorder.stop();
    await stopped;
  } finally {
    try {
      stream.getTracks().forEach((t) => t.stop());
    } catch {
      // ignore
    }
    try {
      audioEl?.pause();
    } catch {
      // ignore
    }
    try {
      await audioCtx?.close().catch(() => undefined);
    } catch {
      // ignore
    }
  }

  const blob = new Blob(chunks, { type: mimeType });
  if (blob.size === 0) throw new Error("Video export failed in this browser. Try Chrome or Safari 17+.");
  if (mutedFallback) {
    // Expando flags the silent fallback without changing the Promise<Blob> shape.
    const silentBlob: Blob & { muted?: boolean } = blob;
    silentBlob.muted = true;
  }
  opts.onProgress?.(1);
  return blob;
}
