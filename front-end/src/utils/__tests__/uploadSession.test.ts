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
  startSession,
} from "../uploadSession";

describe("uploadSession singleton", () => {
  beforeEach(() => {
    __resetUploadSessionForTests();
  });

  test("start returns a stable controller for same event+shape, fresh for new event", () => {
    const first = startSession("evt_A", 4, 1);
    expect(startSession("evt_A", 4, 1)).toBe(first);
    const second = startSession("evt_B", 4, 1);
    expect(second).not.toBe(first);
    expect(getSnapshot().eventId).toBe("evt_B");
  });

  test("attach replays current snapshot and detaches cleanly", () => {
    startSession("evt_A", 4, 1);
    const seen: string[] = [];
    const detach = attach((s) => seen.push(`${s.eventId}:${s.active}`));
    expect(seen).toEqual(["evt_A:true"]);
    detach();
    reportProgress({ progress: 50 }, "evt_A");
    expect(seen).toEqual(["evt_A:true"]);
  });

  test("reportProgress and endSession ignore other-event callers", () => {
    startSession("evt_A", 4, 1);
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
    startSession("evt_A", 4, 1);
    const states: boolean[] = [];
    const detach = attach((s) => states.push(s.paused));
    pauseSession();
    expect(isPaused()).toBe(true);
    resumeSession();
    expect(isPaused()).toBe(false);
    cancelSession();
    expect(getSnapshot().active).toBe(false);
    expect(getSnapshot().paused).toBe(false);
    detach();
    expect(states).toEqual([false, true, false, false]);
  });
});
