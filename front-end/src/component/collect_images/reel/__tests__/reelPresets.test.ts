import {
  REEL_TRACKS,
  clampTransitionDuration,
  clampTrim,
  coverDraw,
  formatTrimTime,
  reelTotalDuration,
  resolveTimeline,
  smartStart,
  withFragment,
} from "../presets";
import { pickMimeType } from "../reelRenderer";

describe("reel presets", () => {
  it("clamps transition length to the per-slide hold", () => {
    expect(clampTransitionDuration(1.0, 2.5)).toBe(1.0);
    expect(clampTransitionDuration(2.0, 1.0)).toBeCloseTo(0.9, 10);
    expect(clampTransitionDuration(-1, 2.5)).toBe(0);
  });

  it("totals hold time plus cross-blend segments", () => {
    expect(reelTotalDuration(3, 2.5, 0.5)).toBe(8.5);
    expect(reelTotalDuration(0, 2.5, 0.5)).toBe(0);
  });

  it("cover-draws by filling width and centering vertically", () => {
    const { dw, dh, dx, dy } = coverDraw(800, 600, 1080, 1920);
    expect(dw).toBeGreaterThanOrEqual(1080);
    expect(dh).toBeCloseTo(1920, 6);
    expect(dx).toBeLessThan(0);
    expect(dy).toBeCloseTo(0, 6);
  });

  it("ships a music-off track first", () => {
    expect(REEL_TRACKS[0].id).toBe("none");
    expect(REEL_TRACKS[0].src).toBeNull();
  });

  it("pickMimeType returns empty without MediaRecorder", () => {
    const g = globalThis as unknown as { MediaRecorder?: unknown };
    const saved = g.MediaRecorder;
    delete g.MediaRecorder;
    try {
      expect(pickMimeType()).toBe("");
    } finally {
      g.MediaRecorder = saved;
    }
  });
});

describe("reel trim helpers", () => {
  it("clamps trim inside duration with a 3s minimum", () => {
    expect(clampTrim(10, 25, 60)).toEqual({ start: 10, end: 25 });
    expect(clampTrim(-5, 70, 60)).toEqual({ start: 0, end: 60 });
    expect(clampTrim(20, 21, 60)).toEqual({ start: 20, end: 23 });
    expect(clampTrim(0, 1, 2)).toEqual({ start: 0, end: 2 });
  });

  it("finds the loudest window for smart start", () => {
    const peaks = [0.1, 0.1, 0.9, 0.8, 0.1, 0.1];
    expect(smartStart(peaks, 60, 20)).toBeCloseTo(20, 0);
    expect(smartStart([], 60)).toBeCloseTo(6, 10);
  });

  it("formats trim times as m:ss", () => {
    expect(formatTrimTime(0)).toBe("0:00");
    expect(formatTrimTime(12.7)).toBe("0:12");
    expect(formatTrimTime(64)).toBe("1:04");
  });

  it("builds media-fragment URLs only when trimmed", () => {
    expect(withFragment("/x.mp3", null)).toBe("/x.mp3");
    expect(withFragment("/x.mp3", { start: 12, end: 27 })).toBe("/x.mp3#t=12.0,27.0");
  });
});

describe("resolveTimeline", () => {
  it("totals uniform holds plus joins", () => {
    expect(resolveTimeline(2.5, 0.5, "fade", [undefined, undefined, undefined])).toEqual({
      holds: [2.5, 2.5, 2.5],
      total: 8.5,
    });
  });

  it("honors per-photo overrides and clamps joins", () => {
    const t = resolveTimeline(2.5, 1.5, "fade", [1, undefined]);
    expect(t.holds).toEqual([1, 2.5]);
    expect(t.total).toBeCloseTo(1 + 2.5 + 0.9, 10);
  });

  it("zeroes joins for none transitions and empties", () => {
    expect(resolveTimeline(2.5, 0.5, "none", [2, 2]).total).toBe(4);
    expect(resolveTimeline(2.5, 0.5, "fade", [])).toEqual({ holds: [], total: 0 });
  });
});
