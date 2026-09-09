import {
  REEL_FPS,
  REEL_H,
  REEL_W,
  ReelAnimation,
  ReelTransition,
  TextStyle,
  alignHolds,
  clampTransitionDuration,
  coverDraw,
  reelBitrate,
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

// Thrown when shouldAbort fires (tab hidden / modal closed mid-export).
// Callers distinguish it from failures: no error panel, no analytics.
export class ReelExportAbortedError extends Error {}

export interface ReelRenderOptions {
  photoDuration: number;
  transition: ReelTransition;
  transitionDuration: number;
  animation: ReelAnimation;
  musicUrl: string | null;
  holds?: number[];
  joinTransitions?: (ReelTransition | undefined)[];
  anims?: (ReelAnimation | undefined)[];
  captions?: string[];
  mix?: ReelMix | null;
  width?: number;
  height?: number;
  filter?: string;
  title?: { text: string; style: TextStyle } | null;
  endCard?: string | null;
  totalDuration?: number;
  onProgress?: (ratio: number) => void;
  shouldAbort?: () => boolean;
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

function loadImg(src: string, crossOrigin: string | null): Promise<HTMLImageElement> {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    if (crossOrigin !== null) el.crossOrigin = crossOrigin;
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error("decode failed"));
    el.src = src;
  });
}

export async function loadReelImages(urls: string[]): Promise<HTMLImageElement[]> {
  // Fetch-first for CORS-clean pixels; direct <img> fallback keeps the
  // preview visible when fetch is blocked (mixed content / CORS) where
  // <img> display still works. Tainted fallback still paints + records.
  const out: HTMLImageElement[] = [];
  let failed = 0;
  for (const url of urls) {
    let loaded: HTMLImageElement | null = null;
    try {
      const res = await fetch(url, { mode: "cors" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const objUrl = URL.createObjectURL(blob);
      try {
        loaded = await loadImg(objUrl, null);
      } finally {
        URL.revokeObjectURL(objUrl);
      }
    } catch {
      loaded = null;
    }
    if (!loaded) {
      try {
        loaded = await loadImg(url, "anonymous");
      } catch {
        try {
          loaded = await loadImg(url, null);
        } catch {
          loaded = null;
        }
      }
    }
    if (loaded) out.push(loaded);
    else failed += 1;
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
  extraScale = 1,
  filter = "none"
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
  // save()/restore() isolates the filter to slides — text post-pass stays clean.
  if (filter !== "none" && "filter" in ctx) {
    try {
      ctx.filter = filter;
    } catch {
      // Older engines ignore unknown filters; render unfiltered.
    }
  }
  ctx.drawImage(img, (w - dwS) / 2 + tx + xOff, (h - dhS) / 2 + ty, dwS, dhS);
  ctx.restore();
}

// Splits unbroken tokens (hashtags, URLs) into <=max runs joined by newline;
// the whitespace wrapper below treats each run as a breakable word.
function chunkLongTokens(s: string, max = 20): string {
  return s
    .split(/\s+/)
    .map((tok) => (tok.length <= max ? tok : tok.match(new RegExp(`.{1,${max}}`, "g"))?.join("\n") ?? tok))
    .join(" ");
}

function drawTextCard(
  ctx: CanvasRenderingContext2D,
  lines: string[],
  w: number,
  h: number,
  style: TextStyle
): void {
  if (lines.length === 0) return;
  const size = Math.round(w * (style === "minimal" ? 0.04 : 0.07));
  ctx.save();
  ctx.font = `600 ${size}px Geist, Inter, system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const maxWidth = w * 0.84;
  const wrapped: string[] = [];
  for (const line of lines) {
    const words = line.split(/\s+/).filter(Boolean);
    let row = "";
    for (const word of words) {
      const trial = row === "" ? word : `${row} ${word}`;
      if (ctx.measureText(trial).width > maxWidth && row !== "") {
        wrapped.push(row);
        row = word;
      } else {
        row = trial;
      }
    }
    if (row !== "") wrapped.push(row);
  }
  if (wrapped.length === 0) {
    ctx.restore();
    return;
  }
  const lineH = size * 1.25;
  const blockH = wrapped.length * lineH + size * 0.8;
  const margin = h * 0.08;
  const cy = style === "center" ? h / 2 : style === "minimal" ? margin + blockH / 2 : h - margin - blockH / 2;
  ctx.fillStyle = "rgba(0,0,0,0.45)";
  const bw = Math.min(w * 0.92, maxWidth + size);
  ctx.fillRect((w - bw) / 2, cy - blockH / 2, bw, blockH);
  ctx.fillStyle = "#fff";
  wrapped.forEach((row, i) => {
    ctx.fillText(row, w / 2, cy - blockH / 2 + size * 0.4 + lineH / 2 + i * lineH);
  });
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
  const filter = opts.filter ?? "none";
  const useHolds = opts.holds && opts.holds.length === n ? opts.holds : null;
  const useJoins =
    opts.joinTransitions && opts.joinTransitions.length >= Math.max(0, n - 1)
      ? opts.joinTransitions.slice(0, Math.max(0, n - 1))
      : null;
  const useAnims = opts.anims && opts.anims.length >= n ? opts.anims.slice(0, n) : null;
  const holdAt = (i: number): number => Math.max(0.1, useHolds ? useHolds[i] : uniHold);
  const animAt = (i: number): ReelAnimation => useAnims?.[i] ?? opts.animation;
  const useCaptions = opts.captions && opts.captions.length >= n ? opts.captions.slice(0, n) : null;
  const captionAt = (i: number): string => useCaptions?.[i] ?? "";
  const joinTypeAt = (j: number): ReelTransition => useJoins?.[j] ?? opts.transition;
  const transAt = (j: number): number => {
    const jt = joinTypeAt(j);
    if (jt === "none") return 0;
    if (!useHolds) return uniTrans;
    return clampTransitionDuration(opts.transitionDuration, Math.min(holdAt(j), holdAt(j + 1)));
  };
  let cursor = 0;
  for (let k = 0; k < n; k++) {
    const hold = holdAt(k);
    if (k === n - 1 || timeSec < cursor + hold) {
      const t01 = hold > 0 ? (timeSec - cursor) / hold : 1;
      drawSlide(ctx, images[k], Math.min(1, Math.max(0, t01)), animAt(k), w, h, 0, 1, 1, filter);
      paintTextOverlay(ctx, timeSec, opts, w, h, captionAt(k));
      return;
    }
    cursor += hold;
    const trans = transAt(k);
    if (trans > 0 && timeSec < cursor + trans) {
      const p = Math.min(1, Math.max(0, (timeSec - cursor) / trans));
      const next = images[k + 1];
      const cur = images[k];
      const jt = joinTypeAt(k);
      switch (jt) {
        case "fade":
          drawSlide(ctx, cur, 1, animAt(k), w, h, 0, 1, 1, filter);
          drawSlide(ctx, next, p, animAt(k + 1), w, h, 0, p, 1, filter);
          break;
        case "slide":
          drawSlide(ctx, cur, 1, animAt(k), w, h, -p * w, 1, 1, filter);
          drawSlide(ctx, next, p, animAt(k + 1), w, h, (1 - p) * w, 1, 1, filter);
          break;
        case "zoom":
          drawSlide(ctx, cur, 1, animAt(k), w, h, 0, 1 - p, 1 + 0.15 * p, filter);
          drawSlide(ctx, next, p, animAt(k + 1), w, h, 0, p, 1, filter);
          break;
        case "none":
        default:
          drawSlide(ctx, next, 0, animAt(k + 1), w, h, 0, 1, 1, filter);
          break;
      }
      paintTextOverlay(ctx, timeSec, opts, w, h, "");
      return;
    }
    cursor += trans;
  }
}

function paintTextOverlay(
  ctx: CanvasRenderingContext2D,
  timeSec: number,
  opts: ReelRenderOptions,
  w: number,
  h: number,
  caption: string
): void {
  const T = opts.totalDuration ?? Number.POSITIVE_INFINITY;
  const titleText = opts.title?.text ?? "";
  const titleEnd = titleText !== "" ? Math.min(1.5, Math.max(0, T - (opts.endCard ? 1.2 : 0))) : 0;
  if (opts.title && titleText !== "" && timeSec < titleEnd) {
    drawTextCard(ctx, [opts.title.text], w, h, opts.title.style);
  }
  const endCardText = opts.endCard ?? "";
  const endCardActive = endCardText !== "" && timeSec >= T - 1.2;
  if (endCardActive) {
    drawTextCard(ctx, [endCardText], w, h, "center");
  }
  // Captions own the lower third only when no global card is active.
  if (caption !== "" && timeSec >= titleEnd && !endCardActive) {
    drawTextCard(ctx, [chunkLongTokens(caption)], w, h, "lower");
  }
}

export interface ReelPreviewHandle {
  stop(): void;
}

export function previewReel(
  canvas: HTMLCanvasElement,
  images: HTMLImageElement[],
  opts: ReelRenderOptions
): ReelPreviewHandle {
  const pw = opts.width ?? REEL_W;
  const ph = opts.height ?? REEL_H;
  canvas.width = pw;
  canvas.height = ph;
  const ctx = canvas.getContext("2d");
  if (!ctx) return { stop: () => undefined };
  const holds = alignHolds(opts.holds, images.length);
  const n = images.length;
  const joins =
    opts.joinTransitions && opts.joinTransitions.length >= Math.max(0, n - 1)
      ? opts.joinTransitions.slice(0, Math.max(0, n - 1))
      : undefined;
  const anims =
    opts.anims && opts.anims.length >= n ? opts.anims.slice(0, n) : undefined;
  const total = Math.max(
    0.1,
    holds
      ? resolveTimeline(opts.photoDuration, opts.transitionDuration, opts.transition, holds, joins).total
      : reelTotalDuration(images.length, opts.photoDuration, opts.transitionDuration)
  );
  const paintOpts: ReelRenderOptions = {
    ...opts,
    holds: holds ?? undefined,
    joinTransitions: joins,
    anims,
    totalDuration: total,
    onProgress: undefined,
  };
  let raf = 0;
  let stopped = false;
  const t0 = performance.now();
  const frame = (now: number): void => {
    if (stopped) return;
    const elapsed = ((now - t0) / 1000) % total;
    paintAt(ctx, images, elapsed, paintOpts, pw, ph);
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

  const ew = opts.width ?? REEL_W;
  const eh = opts.height ?? REEL_H;
  canvas.width = ew;
  canvas.height = eh;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Video export failed in this browser. Try Chrome or Safari 17+.");

  const exportHolds = alignHolds(opts.holds, images.length);
  const en = images.length;
  const exportJoins =
    opts.joinTransitions && opts.joinTransitions.length >= Math.max(0, en - 1)
      ? opts.joinTransitions.slice(0, Math.max(0, en - 1))
      : undefined;
  const exportAnims =
    opts.anims && opts.anims.length >= en ? opts.anims.slice(0, en) : undefined;
  const total = Math.max(
    0.1,
    exportHolds
      ? resolveTimeline(opts.photoDuration, opts.transitionDuration, opts.transition, exportHolds, exportJoins).total
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

  // Font readiness waits here — after audioEl.play() was invoked in the user
  // gesture tick (autoplay), immediately before recording starts.
  if (opts.title || opts.endCard) {
    try {
      await document.fonts?.ready;
    } catch {
      // System-font fallback renders regardless.
    }
  }

  const recorder = new MediaRecorder(combined, { mimeType, videoBitsPerSecond: reelBitrate(ew, eh) });
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

  const paintOpts: ReelRenderOptions = { ...opts, holds: exportHolds ?? undefined, joinTransitions: exportJoins, anims: exportAnims, totalDuration: total, onProgress: undefined };
  let raf = 0;
  const t0 = performance.now();
  let aborted = false;
  try {
    recorder.start(250);
    await new Promise<void>((resolve) => {
      const frame = (now: number): void => {
        // Background tabs stall rAF: abort instead of recording frozen frames.
        if (opts.shouldAbort?.()) {
          aborted = true;
          resolve();
          return;
        }
        const elapsed = (now - t0) / 1000;
        paintAt(ctx, images, Math.min(elapsed, total), paintOpts, ew, eh);
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
  if (aborted) throw new ReelExportAbortedError("Reel export aborted.");

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

// Paused-frame capture for the <video> poster (cover picker). Poster-only: the
// exported file is unchanged.
export function renderCoverFrame(
  canvas: HTMLCanvasElement,
  images: HTMLImageElement[],
  index: number,
  opts: ReelRenderOptions
): string | null {
  const ctx = canvas.getContext("2d");
  if (!ctx || images.length === 0) return null;
  const k = Math.min(Math.max(0, index), images.length - 1);
  const holds = alignHolds(opts.holds, images.length) ?? images.map(() => Math.max(0.1, opts.photoDuration));
  const tl = resolveTimeline(opts.photoDuration, opts.transitionDuration, opts.transition, holds);
  let t = 0;
  for (let i = 0; i < k; i++) t += tl.holds[i] + (tl.joins[i] ?? 0);
  t += tl.holds[k] / 2;
  const w = opts.width ?? REEL_W;
  const h = opts.height ?? REEL_H;
  canvas.width = w;
  canvas.height = h;
  paintAt(ctx, images, Math.min(t, tl.total), { ...opts, totalDuration: tl.total }, w, h);
  try {
    return canvas.toDataURL("image/jpeg", 0.8);
  } catch {
    return null;
  }
}
