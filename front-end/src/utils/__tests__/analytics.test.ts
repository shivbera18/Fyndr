import { getOrSetSessionId, detectDevice, trackEvent, recordAccessAttempt } from "../analytics";

describe("analytics utility helpers", () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    jest.clearAllMocks();
  });

  test("getOrSetSessionId creates and persists a session ID", () => {
    const sid1 = getOrSetSessionId();
    expect(sid1).toBeTruthy();
    expect(sessionStorage.getItem("fyndr_session_id")).toBe(sid1);

    const sid2 = getOrSetSessionId();
    expect(sid2).toBe(sid1);
  });

  test("detectDevice correctly identifies device attributes", () => {
    const dev = detectDevice();
    expect(dev).toHaveProperty("type");
    expect(dev).toHaveProperty("os");
    expect(dev).toHaveProperty("browser");
    expect(dev).toHaveProperty("screen");
    expect(["mobile", "tablet", "desktop"]).toContain(dev.type);
  });

  test("trackEvent makes a fire-and-forget POST to /api/analytics/track", () => {
    const fetchSpy = jest.spyOn(global, "fetch").mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ ok: true }),
      } as any)
    );

    trackEvent("event_123", "page_view", { source: "test" });
    expect(fetchSpy).toHaveBeenCalled();
    const [url, options] = fetchSpy.mock.calls[0];
    expect(url).toContain("/api/analytics/track");
    expect(options?.method).toBe("POST");
    const body = JSON.parse(options?.body as string);
    expect(body.eventId).toBe("event_123");
    expect(body.type).toBe("page_view");
    expect(body.metadata).toEqual({ source: "test" });

    fetchSpy.mockRestore();
  });

  test("recordAccessAttempt calls access-attempt and persists guest session", async () => {
    const fetchSpy = jest.spyOn(global, "fetch").mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            ok: true,
            verified: true,
            message: "PIN verified",
            guestId: "guest_abc",
          }),
      } as any)
    );

    const result = await recordAccessAttempt("event_123", "Aarav", "+919876543210", "123456");
    expect(result.ok).toBe(true);
    expect(result.verified).toBe(true);
    expect(sessionStorage.getItem("fyndr_guest_id")).toBe("guest_abc");
    expect(sessionStorage.getItem("fyndr_guest_name")).toBe("Aarav");
    expect(sessionStorage.getItem("fyndr_guest_phone")).toBe("+919876543210");

    fetchSpy.mockRestore();
  });
});
