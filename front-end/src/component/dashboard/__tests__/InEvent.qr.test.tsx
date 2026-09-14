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

  it("header QR is visible on mobile via flex overflow-x-auto with toolbar role", () => {
    renderInEvent();
    const toolbar = screen.getByRole("toolbar", { name: "Event actions" });
    expect(toolbar).toBeInTheDocument();
    expect(toolbar).not.toHaveClass("hidden");
    expect(toolbar).toHaveClass("flex");
    expect(toolbar).toHaveClass("overflow-x-auto");
    expect(toolbar).toHaveClass("scrollbar-hide");
    expect(toolbar).toHaveClass("flex-nowrap");
    expect(toolbar.textContent).toContain("Guest QR Code");
    const buttons = toolbar.querySelectorAll("button");
    expect(buttons.length).toBeGreaterThanOrEqual(6);
    buttons.forEach((btn) => {
      expect(btn).toHaveClass("whitespace-nowrap");
      expect(btn).toHaveClass("shrink-0");
      expect(btn).toHaveClass("min-h-[44px]");
    });
  });

  it("sticky bar is fixed bottom-[calc] z-40 md:hidden with overflow handling and toolbar role", () => {
    renderInEvent();
    const stickyToolbar = screen.getByRole("toolbar", { name: "Mobile quick actions" });
    expect(stickyToolbar).toBeInTheDocument();
    expect(stickyToolbar).toHaveClass("fixed");
    expect(stickyToolbar).toHaveClass("z-40");
    expect(stickyToolbar).toHaveClass("md:hidden");
    expect(stickyToolbar).toHaveClass("bg-background");
    expect(stickyToolbar.className).not.toContain("backdrop-blur");
    expect(stickyToolbar).toHaveClass("overflow-x-auto");
    expect(stickyToolbar).toHaveClass("scrollbar-hide");
    expect(stickyToolbar).toHaveClass("flex-nowrap");
    expect(stickyToolbar).toHaveClass("pb-safe");
  });

  it("wrapper has pb-16 pb-safe md:pb-0 to avoid content underlap", () => {
    const { container } = renderInEvent();
    const wrapper = container.querySelector(".space-y-8");
    expect(wrapper).not.toBeNull();
    expect(wrapper?.className).toContain("pb-16");
    expect(wrapper?.className).toContain("pb-safe");
    expect(wrapper?.className).toContain("md:pb-0");
  });

  it("QR triggers are accessible by role in both header and sticky", () => {
    renderInEvent();
    const qrButtons = screen.getAllByRole("button", { name: /QR Code/i });
    expect(qrButtons.length).toBeGreaterThanOrEqual(2);
  });
});

describe("mobile download utilities", () => {
  const sampleDataUrl =
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

  it("dataURLToBlob parses PNG dataUrl to Blob correctly", () => {
    const blob = dataURLToBlob(sampleDataUrl);
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe("image/png");
    expect(blob.size).toBeGreaterThan(0);
  });

  it("sanitizeFileName sanitizes special characters, whitespace, and truncates", () => {
    expect(sanitizeFileName("My Event 2026!", "_QRCode.png")).toBe("My_Event_2026_QRCode.png");
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
    shareOrDownload(blob, "test.png", "Title", "blob:mock", setMsg);

    expect(mockCanShare).toHaveBeenCalled();
    expect(mockShare).toHaveBeenCalled();
  });

  it("shareOrDownload opens new tab on iOS devices when share unavailable", () => {
    Object.defineProperty(navigator, "canShare", { value: undefined, configurable: true });
    const origUserAgent = navigator.userAgent;
    Object.defineProperty(navigator, "userAgent", {
      value: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)",
      configurable: true,
    });
    const mockOpen = jest.fn();
    window.open = mockOpen;

    const blob = new Blob(["test"], { type: "image/png" });
    const setMsg = jest.fn();
    shareOrDownload(blob, "test.png", "Title", "blob:mock", setMsg);

    expect(mockOpen).toHaveBeenCalledWith(expect.any(String), "_blank");
    expect(setMsg).toHaveBeenCalledWith(expect.stringContaining("Opened in new tab"));

    Object.defineProperty(navigator, "userAgent", { value: origUserAgent, configurable: true });
  });

  it("shareOrDownload falls back to anchor download on desktop", () => {
    Object.defineProperty(navigator, "canShare", { value: undefined, configurable: true });
    const origUserAgent = navigator.userAgent;
    Object.defineProperty(navigator, "userAgent", {
      value: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
      configurable: true,
    });
    Object.defineProperty(navigator, "platform", { value: "Win32", configurable: true });

    const clickSpy = jest.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

    const blob = new Blob(["test"], { type: "image/png" });
    const setMsg = jest.fn();
    shareOrDownload(blob, "test.png", "Title", "blob:mock", setMsg);

    expect(clickSpy).toHaveBeenCalled();
    expect(setMsg).toHaveBeenCalledWith(expect.stringContaining("Downloaded"));

    clickSpy.mockRestore();
    Object.defineProperty(navigator, "userAgent", { value: origUserAgent, configurable: true });
  });
});
