import { render, screen } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import InEvent from "../InEvent";

import { dataURLToBlob, sanitizeFileName, shareOrDownload } from "../../../utils/download";
jest.mock("../../../utils/api", () => ({
  getApiBase: () => "http://localhost:5000",
  API_URL: "http://localhost:5000",
}));
jest.mock("../../../utils/analytics", () => ({
  trackEvent: jest.fn(),
  getGuestSession: jest.fn(() => null),
}));
jest.mock("../Qrcode", () => () => <div data-testid="qrcode-mock" />);
jest.mock("../qr-standee", () => () => <div data-testid="standee-mock" />);

const renderInEvent = (props = {}) =>
  render(
    <BrowserRouter>
      <InEvent
        eventID="evt123"
        name="Test Event"
        pin="1234"
        ownerId="owner1"
        initialFolders={[{ name: "General" }]}
        initialLimit={10}
        initialLocked={false}
        backbtn={jest.fn()}
        setRefresh={jest.fn()}
        {...props}
      />
    </BrowserRouter>
  );

describe("InEvent QR mobile visibility", () => {
  const origGetContext = HTMLCanvasElement.prototype.getContext;
  const origCreateObjectURL = window.URL.createObjectURL;
  const origRevokeObjectURL = window.URL.revokeObjectURL;

  beforeAll(() => {
    HTMLCanvasElement.prototype.getContext = jest.fn(() => null) as unknown as typeof HTMLCanvasElement.prototype.getContext;
    window.URL.createObjectURL = jest.fn(() => "mock-blob-url");
    window.URL.revokeObjectURL = jest.fn();
  });

  afterAll(() => {
    HTMLCanvasElement.prototype.getContext = origGetContext;
    window.URL.createObjectURL = origCreateObjectURL;
    window.URL.revokeObjectURL = origRevokeObjectURL;
  });

  it("header toolbar is desktop-only so mobile shows no in-flow Analytics/Monetization/QR duplicates", () => {
    renderInEvent();
    const toolbar = screen.getByRole("toolbar", { name: "Event actions" });
    expect(toolbar).toBeInTheDocument();
    expect(toolbar).toHaveClass("hidden");
    expect(toolbar).toHaveClass("md:flex");
    expect(toolbar.textContent).toContain("Guest QR Code");
  });

<<<<<<< Updated upstream
  it("sticky bar docks flush above BottomNav with zero gap, solid bg, scrollable", () => {
    renderInEvent();
    const stickyToolbar = screen.getByRole("toolbar", { name: "Mobile quick actions" });
    expect(stickyToolbar).toBeInTheDocument();
    expect(stickyToolbar).toHaveClass("fixed");
    expect(stickyToolbar.className).toContain("bottom-[calc(3.25rem_+_env(safe-area-inset-bottom))]");
    expect(stickyToolbar).toHaveClass("z-40");
    expect(stickyToolbar).toHaveClass("md:hidden");
    expect(stickyToolbar).toHaveClass("bg-background");
    expect(stickyToolbar.className).not.toContain("backdrop-blur");
    expect(stickyToolbar).toHaveClass("flex");
    expect(stickyToolbar).toHaveClass("gap-2");
    expect(stickyToolbar).toHaveClass("overflow-x-auto");
    expect(stickyToolbar).toHaveClass("scrollbar-hide");
    expect(stickyToolbar).toHaveClass("flex-nowrap");
    expect(stickyToolbar).toHaveClass("px-2");
  });

  it("sticky bar keeps Analytics, QR Code, standee download, Back and Delete with no indent", () => {
    renderInEvent();
    const stickyToolbar = screen.getByRole("toolbar", { name: "Mobile quick actions" });
    expect(stickyToolbar.textContent).toContain("Analytics");
    expect(stickyToolbar.textContent).toContain("QR Code");
    expect(stickyToolbar.textContent).toContain("Back");
    expect(screen.getByRole("button", { name: "Download table standee" })).toBeInTheDocument();
    const buttons = stickyToolbar.querySelectorAll("button");
    expect(buttons.length).toBe(5);
    buttons.forEach((btn) => {
      expect(btn).toHaveClass("min-h-[44px]");
    });
    const backBtn = screen.getByRole("button", { name: "Back" });
    expect(backBtn).toHaveClass("px-3");
    expect(backBtn).toHaveClass("min-w-[92px]");
  });

  it("wrapper has pb-16 pb-safe md:pb-0 to avoid content underlap", () => {
=======
  it("sticky bar is fixed above bottom nav and md:hidden with overflow handling", () => {
    const { container } = renderInEvent();
    const sticky = container.querySelector(".fixed.bottom-\\[calc\\(4rem\\_+\\_env\\(safe-area-inset-bottom\\)\\)\\]");
    // Fallback to class string search if escaped selector fails in jsdom
    const stickyEl = sticky || Array.from(container.querySelectorAll("div")).find((el) => el.className.includes("bottom-[calc"));
    expect(stickyEl).not.toBeNull();
    expect(stickyEl).toHaveClass("fixed");
    expect(stickyEl).toHaveClass("z-40");
    expect(stickyEl).toHaveClass("md:hidden");
    expect(stickyEl).toHaveClass("bg-background");
    expect(stickyEl?.className).not.toContain("backdrop-blur");
    expect(stickyEl).toHaveClass("overflow-x-auto");
    expect(stickyEl).toHaveClass("scrollbar-hide");
    expect(stickyEl).toHaveClass("flex-nowrap");
    expect(stickyEl).toHaveClass("pb-safe");
  });

  it("wrapper has safe-area bottom padding and md:pb-0 to avoid content underlap", () => {
>>>>>>> Stashed changes
    const { container } = renderInEvent();
    const wrapper = container.querySelector(".space-y-8");
    expect(wrapper).not.toBeNull();
    expect(wrapper?.className).toContain("pb-16");
    expect(wrapper?.className).toContain("pb-safe");
    expect(wrapper?.className).toContain("md:pb-0");
  });

  it("QR trigger lives only in the sticky bar on mobile (header hidden, sticky visible)", () => {
    renderInEvent();
    const qrButtons = screen.getAllByRole("button", { name: /QR Code/i });
    expect(qrButtons.length).toBeGreaterThanOrEqual(1);
    const stickyToolbar = screen.getByRole("toolbar", { name: "Mobile quick actions" });
    expect(stickyToolbar.textContent).toContain("QR Code");
  });
});

describe("mobile download utilities", () => {
  const sampleDataUrl =
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

  let origShare: typeof navigator.share;
  let origCanShare: typeof navigator.canShare;
  let origUserAgent: string;
  let origPlatform: string;
  let origOpen: typeof window.open;
  let origCreateObjectURL: typeof window.URL.createObjectURL;
  let origRevokeObjectURL: typeof window.URL.revokeObjectURL;

  beforeEach(() => {
    origShare = navigator.share;
    origCanShare = navigator.canShare;
    origUserAgent = navigator.userAgent;
    origPlatform = navigator.platform;
    origOpen = window.open;
    origCreateObjectURL = window.URL.createObjectURL;
    origRevokeObjectURL = window.URL.revokeObjectURL;
    window.URL.createObjectURL = jest.fn(() => "mock-blob-url");
    window.URL.revokeObjectURL = jest.fn();
  });

  afterEach(() => {
    Object.defineProperty(navigator, "share", { value: origShare, configurable: true });
    Object.defineProperty(navigator, "canShare", { value: origCanShare, configurable: true });
    Object.defineProperty(navigator, "userAgent", { value: origUserAgent, configurable: true });
    Object.defineProperty(navigator, "platform", { value: origPlatform, configurable: true });
    window.open = origOpen;
    window.URL.createObjectURL = origCreateObjectURL;
    window.URL.revokeObjectURL = origRevokeObjectURL;
    jest.restoreAllMocks();
  });

  it("dataURLToBlob parses PNG dataUrl to Blob correctly", () => {
    const blob = dataURLToBlob(sampleDataUrl);
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe("image/png");
    expect(blob.size).toBeGreaterThan(0);
  });

  it("dataURLToBlob handles malformed or missing input safely", () => {
    const emptyBlob = dataURLToBlob("");
    expect(emptyBlob).toBeInstanceOf(Blob);
    expect(emptyBlob.size).toBe(0);

    const invalidBlob = dataURLToBlob("not-a-valid-data-url");
    expect(invalidBlob).toBeInstanceOf(Blob);
    expect(invalidBlob.size).toBe(0);
  });

  it("sanitizeFileName preserves international characters and removes illegal fs chars", () => {
    expect(sanitizeFileName("My:Event*2026?", "_QRCode.png")).toBe("MyEvent2026_QRCode.png");
    expect(sanitizeFileName("वैवाहिक कार्यक्रम 2026", "_standee.png")).toBe("वैवाहिक_कार्यक्रम_2026_standee.png");
    expect(sanitizeFileName("Fête d'été / 2026", "_standee.png")).toBe("Fête_d'été_2026_standee.png");
    expect(sanitizeFileName("   ", "_standee.png")).toBe("Event_standee.png");
    const longName = "A".repeat(80);
    expect(sanitizeFileName(longName, ".png")).toBe("A".repeat(50) + ".png");
  });

  it("shareOrDownload invokes navigator.share when canShare is supported", async () => {
    const blob = new Blob(["test"], { type: "image/png" });
    const mockShare = jest.fn(() => Promise.resolve());
    const mockCanShare = jest.fn(() => true);
    Object.defineProperty(navigator, "canShare", { value: mockCanShare, configurable: true });
    Object.defineProperty(navigator, "share", { value: mockShare, configurable: true });

    const setMsg = jest.fn();
    shareOrDownload(blob, "test.png", "Title", setMsg);

    expect(mockCanShare).toHaveBeenCalled();
    expect(mockShare).toHaveBeenCalled();
  });

  it("shareOrDownload falls back to download when navigator.share rejects with error", async () => {
    const blob = new Blob(["test"], { type: "image/png" });
    const shareError = new Error("Share failed");
    shareError.name = "NotAllowedError";
    const mockShare = jest.fn(() => Promise.reject(shareError));
    const mockCanShare = jest.fn(() => true);
    Object.defineProperty(navigator, "canShare", { value: mockCanShare, configurable: true });
    Object.defineProperty(navigator, "share", { value: mockShare, configurable: true });

    const clickSpy = jest.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    const setMsg = jest.fn();
    shareOrDownload(blob, "test.png", "Title", setMsg);
    await new Promise((r) => setTimeout(r, 10));
    expect(clickSpy).toHaveBeenCalled();
    expect(setMsg).toHaveBeenCalledWith(expect.stringContaining("Downloaded"));
  });

  it("shareOrDownload ignores AbortError when user dismisses share sheet", async () => {
    const blob = new Blob(["test"], { type: "image/png" });
    const abortError = new Error("User cancelled");
    abortError.name = "AbortError";
    const mockShare = jest.fn(() => Promise.reject(abortError));
    const mockCanShare = jest.fn(() => true);
    Object.defineProperty(navigator, "canShare", { value: mockCanShare, configurable: true });
    Object.defineProperty(navigator, "share", { value: mockShare, configurable: true });
    const clickSpy = jest.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    const setMsg = jest.fn();
    shareOrDownload(blob, "test.png", "Title", setMsg);

    await new Promise((r) => setTimeout(r, 10));
    expect(clickSpy).not.toHaveBeenCalled();
  });

  it("shareOrDownload falls back to window.open when anchor click throws", () => {
    Object.defineProperty(navigator, "canShare", { value: undefined, configurable: true });
    const mockOpen = jest.fn();
    window.open = mockOpen;
    jest.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {
      throw new Error("Anchor click not allowed");
    });

    const blob = new Blob(["test"], { type: "image/png" });
    const setMsg = jest.fn();
    shareOrDownload(blob, "test.png", "Title", setMsg);

    expect(mockOpen).toHaveBeenCalledWith(expect.any(String), "_blank");
    expect(setMsg).toHaveBeenCalledWith(expect.stringContaining("Opened in new tab"));
  });

  it("shareOrDownload performs standard anchor download on desktop", () => {
    Object.defineProperty(navigator, "canShare", { value: undefined, configurable: true });
    const clickSpy = jest.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

    const blob = new Blob(["test"], { type: "image/png" });
    const setMsg = jest.fn();
    shareOrDownload(blob, "test.png", "Title", setMsg);

    expect(clickSpy).toHaveBeenCalled();
    expect(setMsg).toHaveBeenCalledWith(expect.stringContaining("Downloaded"));
  });
});
