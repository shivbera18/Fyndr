import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ReelCreatorModal from "../ReelCreatorModal";
import * as mediaQueryHook from "../../../../hooks/useMediaQuery";
import { trackEvent } from "../../../../utils/analytics";

jest.mock("../../../../hooks/useMediaQuery");
jest.mock("../../../../utils/analytics", () => ({
  trackEvent: jest.fn(),
  getGuestSession: jest.fn(() => ({})),
}));
jest.mock("../reelRenderer", () => ({
  extensionForMime: jest.fn(() => "webm" as const),
  isReelExportSupported: jest.fn(() => true),
  loadReelImages: jest.fn(async () => [{}, {}, {}]),
  renderReelToFile: jest.fn(async () => new Blob(["frame"], { type: "video/webm" })),
  previewReel: jest.fn(() => ({ stop: jest.fn() })),
}));
jest.mock("sonner", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

const PHOTOS = [
  { name: "a.jpg", url: "http://localhost:5000/uploads/a.jpg" },
  { name: "b.jpg", url: "http://localhost:5000/uploads/b.jpg" },
  { name: "c.jpg", url: "http://localhost:5000/uploads/c.jpg" },
];

function renderModal() {
  return render(
    <ReelCreatorModal
      open={true}
      onOpenChange={jest.fn()}
      eventId="evt1"
      eventName="Test Event"
      photos={PHOTOS}
    />
  );
}

describe("ReelCreatorModal", () => {
  beforeAll(() => {
    // JSDOM does not implement HTMLCanvasElement.prototype.getContext
    HTMLCanvasElement.prototype.getContext = jest.fn();
    // jsdom's URL.createObjectURL exists but throws "not implemented".
    // Plain functions: immune to resetMocks (unlike jest.fn).
    Object.defineProperty(URL, "createObjectURL", {
      value: () => "blob:mock-url",
      writable: true,
    });
    Object.defineProperty(URL, "revokeObjectURL", { value: () => undefined, writable: true });
  });

  beforeEach(() => {
    jest.spyOn(mediaQueryHook, "useMediaQuery").mockReturnValue({
      device: "desktop",
      width: 1280,
      height: 800,
      isMobile: false,
      isTablet: false,
      isDesktop: true,
    });
    // react-scripts sets resetMocks: true, so re-apply mock implementations here.
    const reel = jest.requireMock("../reelRenderer") as {
      loadReelImages: jest.Mock;
      renderReelToFile: jest.Mock;
      isReelExportSupported: jest.Mock;
      previewReel: jest.Mock;
      extensionForMime: jest.Mock;
    };
    reel.loadReelImages.mockResolvedValue([{}, {}, {}]);
    reel.renderReelToFile.mockResolvedValue(new Blob(["frame"], { type: "video/webm" }));
    reel.isReelExportSupported.mockReturnValue(true);
    reel.previewReel.mockReturnValue({ stop: jest.fn() });
    reel.extensionForMime.mockReturnValue("webm");
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("gates Next on the 2-photo minimum", () => {
    renderModal();
    const next = screen.getByRole("button", { name: /Next: Music/i });
    expect(next).toBeEnabled();

    fireEvent.click(screen.getByLabelText("Select photo 1"));
    fireEvent.click(screen.getByLabelText("Select photo 2"));
    expect(screen.getByText(/Select at least 2 photos/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Next: Music/i })).toBeDisabled();

    fireEvent.click(screen.getByLabelText("Select photo 2"));
    expect(screen.getByRole("button", { name: /Next: Music/i })).toBeEnabled();
  });

  it("updates total runtime when the transition slider moves", () => {
    renderModal();
    fireEvent.mouseDown(screen.getByRole("tab", { name: /Music & Style/i }));

    fireEvent.change(screen.getByLabelText(/transition/i, { selector: "input" }), {
      target: { value: "1.0" },
    });
    expect(screen.getByText("≈ 9.5s reel")).toBeInTheDocument();
  });

  it("exports and fires reel_export analytics with a download link", async () => {
    renderModal();
    fireEvent.mouseDown(screen.getByRole("tab", { name: /Preview & Export/i }));

    const exportBtn = screen.getByRole("button", { name: /Export Reel/i });
    await waitFor(() => expect(exportBtn).toBeEnabled());
    fireEvent.click(exportBtn);

    const link = await screen.findByRole("link", { name: /Download/i });
    expect(trackEvent).toHaveBeenCalledWith(
      "evt1",
      "reel_export",
      expect.objectContaining({ photoCount: 3, transition: "fade", hasMusic: true })
    );
    expect(link.getAttribute("download")).toBe("fyndr-reel-evt1.webm");
  });
});
