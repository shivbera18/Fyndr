import {
  __resetUploadSessionForTests,
  attach,
  cancelSession,
  endSession,
  getSnapshot,
  isPaused,
  pauseSession,
  reportProgress,
  resumeSession,
  setRemainingFiles,
  startSession,
} from "../uploadSession";

describe("uploadSession singleton", () => {
  let files: { file: File; id: string; prepared?: { blob: Blob; compressed: boolean } }[];
  beforeEach(() => {
    __resetUploadSessionForTests();
    files = Array.from({ length: 4 }, (_, i) => ({ file: new File([`${i}`], `${i}.jpg`), id: `${i}` }));
  });

  test("keeps the active session until its worker ends", () => {
    const first = startSession("evt_A", files, 1);
    expect(startSession("evt_A", files, 1)).toBe(first);
    expect(() => startSession("evt_B", files, 1)).toThrow(/already running/);
    cancelSession();
    expect(first.signal.aborted).toBe(true);
    expect(getSnapshot().active).toBe(true);
    expect(() => startSession("evt_B", files, 1)).toThrow(/already running/);
    endSession("evt_A");
    expect(startSession("evt_B", files, 1)).not.toBe(first);
  });

  test("attach replays current snapshot and detaches cleanly", () => {
    startSession("evt_A", files, 1);
    const seen: string[] = [];
    const detach = attach((s) => seen.push(`${s.eventId}:${s.active}`));
    expect(seen).toEqual(["evt_A:true"]);
    detach();
    reportProgress({ progress: 50 }, "evt_A");
    expect(seen).toEqual(["evt_A:true"]);
  });

  test("reportProgress and endSession ignore other-event callers", () => {
    startSession("evt_A", files, 1);
    reportProgress({ progress: 50 }, "evt_B");
    expect(getSnapshot().progress).toBe(0);
    reportProgress({ progress: 50 }, "evt_A");
    expect(getSnapshot().progress).toBe(50);
    endSession("evt_B");
    expect(getSnapshot().active).toBe(true);
    endSession("evt_A");
    expect(getSnapshot().active).toBe(false);
  });

  test("pause/resume/cancel flip flags and emit", () => {
    startSession("evt_A", files, 1);
    const states: boolean[] = [];
    const detach = attach((s) => states.push(s.paused));
    pauseSession();
    expect(isPaused()).toBe(true);
    resumeSession();
    expect(isPaused()).toBe(false);
    cancelSession();
    expect(getSnapshot().active).toBe(true);
    expect(getSnapshot().paused).toBe(false);
    detach();
    expect(states).toEqual([false, true, false, false]);
    endSession("evt_A");
  });

  test("retains remaining originals and terminal errors until explicitly cleared", () => {
    startSession("evt_A", files, 4);
    const remaining = files.slice(1);
    remaining[0].prepared = { blob: new Blob(["prepared"]), compressed: true };
    const status = { kind: "error" as const, text: "Upload failed" };
    reportProgress({ remainingFiles: remaining, uploadedCount: 1, status }, "evt_A");
    endSession("evt_A");
    const listener = jest.fn();
    attach(listener);
    expect(listener).toHaveBeenCalledWith(expect.objectContaining({ active: false, remainingFiles: remaining, status }));
    expect(getSnapshot().remainingFiles).toBe(remaining);
    setRemainingFiles("evt_B", []);
    expect(getSnapshot().remainingFiles).toBe(remaining);
    setRemainingFiles("evt_A", []);
    expect(getSnapshot().remainingFiles).toEqual([]);
    expect(remaining[0].prepared).toBeUndefined();
    expect(getSnapshot().status).toBeNull();
  });

  test("inactive or cancelled sessions cannot be paused", () => {
    pauseSession();
    expect(isPaused()).toBe(false);
    startSession("evt_A", files, 4);
    cancelSession();
    pauseSession();
    expect(isPaused()).toBe(false);
    endSession("evt_A");
    pauseSession();
    expect(isPaused()).toBe(false);
  });
});
