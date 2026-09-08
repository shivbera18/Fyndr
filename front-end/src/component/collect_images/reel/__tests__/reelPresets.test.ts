import {
  REEL_TRACKS,
  clampTransitionDuration,
  coverDraw,
  reelTotalDuration,
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
