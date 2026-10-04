import { signOut } from "../session";

describe("signOut", () => {
  const realCaches = (window as unknown as { caches?: unknown }).caches;
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  afterEach(() => {
    Object.defineProperty(window, "caches", { value: realCaches, configurable: true });
  });

  it("clears auth, prefs, drafts, guest caches and image cache, keeps app shell", async () => {
    localStorage.setItem("user", JSON.stringify({ _id: "u1" }));
    localStorage.setItem("token", "t");
    localStorage.setItem("fyndr_session_id", "s1");
    localStorage.setItem("fyndr:upload:original-quality", "1");
    localStorage.setItem("fyndr:reel:draft:e1", JSON.stringify({ v: 1 }));
    sessionStorage.setItem("fy-lead-e1", "1");
    sessionStorage.setItem("fy-matched-e1", JSON.stringify(["a.jpg"]));
    const del = jest.fn().mockResolvedValue(true);
    Object.defineProperty(window, "caches", {
      value: { delete: del },
      configurable: true,
    });
    await signOut();
    expect(localStorage.getItem("user")).toBeNull();
    expect(localStorage.getItem("token")).toBeNull();
    expect(localStorage.getItem("fyndr_session_id")).toBeNull();
    expect(localStorage.getItem("fyndr:upload:original-quality")).toBeNull();
    expect(localStorage.getItem("fyndr:reel:draft:e1")).toBeNull();
    expect(sessionStorage.length).toBe(0);
    expect(del).toHaveBeenCalledWith("fyndr-images-v1");
  });
});
