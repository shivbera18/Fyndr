import { useEffect, useRef } from "react";
import { Button } from "../../../components/ui/button";
import { clampTrim, formatTrimTime } from "./presets";

interface WaveformProps {
  peaks?: number[];
  duration: number;
  start: number;
  end: number;
  onChange(start: number, end: number): void;
  onChorus(): void;
  onReset(): void;
  canChorus: boolean;
}

const HANDLE_SLOP = 24;

// Display canvas + trim controls. Peaks are display-only (manifest-provided);
// touch drags the canvas strip, keyboard uses the two half-width ranges.
export function Waveform({
  peaks,
  duration,
  start,
  end,
  onChange,
  onChorus,
  onReset,
  canChorus,
}: WaveformProps): React.JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const dragRef = useRef<"start" | "end" | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !(duration > 0)) return;
    const rect = canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const bars = 64;
    const bw = canvas.width / bars;
    for (let i = 0; i < bars; i++) {
      const v = peaks && peaks.length > 0 ? peaks[Math.floor((i / bars) * peaks.length)] ?? 0 : 0.25;
      const h = Math.max(2, Math.min(1, v) * canvas.height);
      const x = (i / bars) * canvas.width;
      const t = (i + 0.5) / bars;
      const inRegion = t >= start / duration && t <= end / duration;
      ctx.fillStyle = inRegion ? "#fafafa" : "rgba(255,255,255,0.3)";
      ctx.fillRect(x + 1, (canvas.height - h) / 2, Math.max(1, bw - 2), h);
    }
  }, [peaks, duration, start, end]);

  const rectOf = (): DOMRect | null => {
    const canvas = canvasRef.current;
    if (!canvas || !(duration > 0)) return null;
    const rect = canvas.getBoundingClientRect();
    return rect.width > 0 ? rect : null;
  };

  const xToSec = (clientX: number): number => {
    const rect = rectOf();
    if (!rect) return 0;
    return (Math.min(Math.max(0, clientX - rect.left), rect.width) / rect.width) * duration;
  };

  const pickHandle = (sec: number): "start" | "end" =>
    Math.abs(sec - start) <= Math.abs(sec - end) ? "start" : "end";

  const moveTo = (sec: number): void => {
    if (dragRef.current === "start") {
      const c = clampTrim(sec, end, duration);
      onChange(c.start, c.end);
    } else if (dragRef.current === "end") {
      const c = clampTrim(start, sec, duration);
      onChange(c.start, c.end);
    }
  };

  const handleX = (sec: number): number => {
    const rect = rectOf();
    if (!rect) return 0;
    return rect.left + (sec / duration) * rect.width;
  };

  const releaseDrag = (): void => {
    dragRef.current = null;
  };

  return (
    <div className="space-y-2">
      <canvas
        ref={canvasRef}
        className="h-16 w-full touch-none rounded-lg bg-muted"
        onPointerDown={(e) => {
          const sec = xToSec(e.clientX);
          const nearStart = Math.abs(e.clientX - handleX(start)) <= HANDLE_SLOP;
          const nearEnd = Math.abs(e.clientX - handleX(end)) <= HANDLE_SLOP;
          dragRef.current = nearStart ? "start" : nearEnd ? "end" : pickHandle(sec);
          try {
            e.currentTarget.setPointerCapture(e.pointerId);
          } catch {
            // jsdom lacks pointer capture — drag still works via move events.
          }
          moveTo(sec);
        }}
        onPointerMove={(e) => {
          if (!dragRef.current) return;
          moveTo(xToSec(e.clientX));
        }}
        onPointerUp={releaseDrag}
        onPointerCancel={releaseDrag}
      />
      <p className="text-xs text-muted-foreground">
        {formatTrimTime(start)} – {formatTrimTime(end)} of {formatTrimTime(duration)}
      </p>
      <div className="flex gap-2">
        <input
          type="range"
          aria-label="Trim start"
          min={0}
          max={duration}
          step={0.5}
          value={start}
          onChange={(e) => {
            const c = clampTrim(Number(e.target.value), end, duration);
            onChange(c.start, c.end);
          }}
          className="w-full accent-primary"
        />
        <input
          type="range"
          aria-label="Trim end"
          min={0}
          max={duration}
          step={0.5}
          value={end}
          onChange={(e) => {
            const c = clampTrim(start, Number(e.target.value), duration);
            onChange(c.start, c.end);
          }}
          className="w-full accent-primary"
        />
      </div>
      <div className="flex gap-2">
        {canChorus && (
          <Button type="button" variant="outline" size="sm" className="min-h-[44px]" onClick={onChorus}>
            ♪ Chorus
          </Button>
        )}
        <Button type="button" variant="ghost" size="sm" className="min-h-[44px]" onClick={onReset}>
          Reset
        </Button>
      </div>
    </div>
  );
}
