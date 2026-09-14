import { render, screen } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import InEvent from "../InEvent";

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

  it("header QR is hidden on mobile via hidden md:flex", () => {
    const { container } = renderInEvent();
    const headerActions = container.querySelector(".hidden.md\\:flex");
    expect(headerActions).not.toBeNull();
    expect(headerActions).toHaveClass("hidden");
    expect(headerActions).toHaveClass("md:flex");
    expect(headerActions?.textContent).toContain("Guest QR Code");
    // Header button itself is inside the hidden container — assert via container query
    expect(headerActions?.querySelector("button")).toBeInTheDocument();
  });

  it("sticky bar is fixed bottom-[calc] z-40 md:hidden with overflow handling", () => {
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

  it("wrapper has pb-[calc(8rem+env)] md:pb-0 to avoid content underlap", () => {
    const { container } = renderInEvent();
    const wrapper = container.querySelector(".space-y-8");
    expect(wrapper).not.toBeNull();
    expect(wrapper?.className).toContain("pb-[calc(8rem_+_env(safe-area-inset-bottom))]");
    expect(wrapper?.className).toContain("md:pb-0");
  });

  it("QR triggers are accessible by role in both header and sticky", () => {
    const { container } = renderInEvent();
    const headerActions = container.querySelector(".hidden.md\\:flex");
    const sticky = container.querySelector(".fixed.bottom-\\[calc\\(4rem\\_+\\_env\\(safe-area-inset-bottom\\)\\)\\]") || Array.from(container.querySelectorAll("div")).find((el) => el.className.includes("bottom-[calc"));
    expect(headerActions?.querySelector("button")).toBeInTheDocument();
    expect(sticky?.querySelector("button")).toBeInTheDocument();
    const qrButtons = screen.getAllByRole("button", { name: /QR Code/i });
    expect(qrButtons.length).toBeGreaterThanOrEqual(2);
  });
});
