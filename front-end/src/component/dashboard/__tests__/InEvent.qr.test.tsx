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
  beforeAll(() => {
    HTMLCanvasElement.prototype.getContext = jest.fn(() => null) as unknown as typeof HTMLCanvasElement.prototype.getContext;
    window.URL.createObjectURL = jest.fn(() => "mock-blob-url");
    window.URL.revokeObjectURL = jest.fn();
  });

  it("header QR is hidden on mobile via hidden md:flex", () => {
    const { container } = renderInEvent();
    const headerActions = container.querySelector(".hidden.md\\:flex");
    expect(headerActions).not.toBeNull();
    expect(headerActions?.textContent).toContain("Guest QR Code");
  });

  it("sticky bar is fixed bottom-[calc] z-50 md:hidden with overflow handling", () => {
    const { container } = renderInEvent();
    const html = container.innerHTML;
    expect(html).toContain("bottom-[calc(4rem+env(safe-area-inset-bottom))]");
    expect(html).toContain("z-50");
    expect(html).toContain("md:hidden");
    expect(html).toContain("bg-background");
    expect(html).not.toContain("backdrop-blur");
    expect(html).toContain("overflow-x-auto");
    expect(html).toContain("scrollbar-hide");
    expect(html).toContain("flex-nowrap");
  });

  it("wrapper has pb-16 md:pb-0 to avoid content underlap", () => {
    const { container } = renderInEvent();
    const wrapper = container.querySelector(".space-y-8.pb-16");
    expect(wrapper).not.toBeNull();
    expect(wrapper?.className).toContain("md:pb-0");
  });

  it("QR trigger is accessible by role", () => {
    renderInEvent();
    const qrButtons = screen.getAllByRole("button", { name: /QR Code/i });
    expect(qrButtons.length).toBeGreaterThanOrEqual(2);
    expect(qrButtons[0]).toBeInTheDocument();
  });
});
