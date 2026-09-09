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
  renderCoverFrame: jest.fn(() => null),
  previewReel: jest.fn(() => ({ stop: jest.fn() })),
}));
jest.mock("../tracks", () => ({
  loadTrackManifest: jest.fn(async () => [
    { id: "upbeat", title: "Upbeat Pop", src: "/reel-music/upbeat.mp3", duration: 60, license: "CC0" },
  ]),
  resolveCatalog: jest.fn(
    (manifest: Array<{ id: string; title: string; src: string; duration: number; license: string }>) => [
      { id: "none", label: "No music", src: null, credit: "", license: "none" },
      ...manifest.map((t) => ({
        id: t.id,
        label: t.title,
        src: t.src,
        credit: "",
        license: t.license,
        duration: t.duration,
      })),
    ]
  ),
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
      renderCoverFrame: jest.Mock;
      isReelExportSupported: jest.Mock;
      previewReel: jest.Mock;
      extensionForMime: jest.Mock;
    };
    reel.loadReelImages.mockResolvedValue([{}, {}, {}]);
    reel.renderReelToFile.mockResolvedValue(new Blob(["frame"], { type: "video/webm" }));
    reel.renderCoverFrame.mockReturnValue(null);
    reel.isReelExportSupported.mockReturnValue(true);
    reel.previewReel.mockReturnValue({ stop: jest.fn() });
    reel.extensionForMime.mockReturnValue("webm");
    const tracks = jest.requireMock("../tracks") as {
      loadTrackManifest: jest.Mock;
      resolveCatalog: jest.Mock;
    };
    const manifest = [
      { id: "upbeat", title: "Upbeat Pop", src: "/reel-music/upbeat.mp3", duration: 60, license: "CC0" },
    ];
    tracks.loadTrackManifest.mockResolvedValue(manifest);
    tracks.resolveCatalog.mockImplementation(
      (items: Array<{ id: string; title: string; src: string; duration: number; license: string }>) => [
        { id: "none", label: "No music", src: null, credit: "", license: "none" },
        ...items.map((t) => ({
          id: t.id,
          label: t.title,
          src: t.src,
          credit: "",
          license: t.license,
          duration: t.duration,
        })),
      ]
    );
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
    fireEvent.mouseDown(screen.getByRole("tab", { name: /Style/ }));

    fireEvent.change(screen.getByLabelText(/transition/i, { selector: "input" }), {
      target: { value: "1.0" },
    });
    expect(screen.getByText("≈ 9.5s reel")).toBeInTheDocument();
  });

  it("exports and fires reel_export analytics with a download link", async () => {
    renderModal();
    fireEvent.mouseDown(screen.getByRole("tab", { name: /Music/ }));
    fireEvent.click(await screen.findByText("Upbeat Pop"));
    fireEvent.mouseDown(screen.getByRole("tab", { name: /Preview & Export/i }));

    const exportBtn = screen.getByRole("button", { name: /Export Reel/i });
    await waitFor(() => expect(exportBtn).toBeEnabled());
    fireEvent.click(exportBtn);

    const link = await screen.findByRole("link", { name: /Download/i });
    expect(trackEvent).toHaveBeenCalledWith(
      "evt1",
      "reel_export",
      expect.objectContaining({ photoCount: 3, transition: "fade", hasMusic: true, musicId: "upbeat" })
    );
    expect(link.getAttribute("download")).toBe("fyndr-reel-evt1.webm");
    const renderer = jest.requireMock("../reelRenderer") as { renderReelToFile: jest.Mock };
    expect(renderer.renderReelToFile).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.objectContaining({
        mix: expect.objectContaining({ url: "/reel-music/upbeat.mp3", volume: 0.8 }),
      })
    );
  });

  it("reorders photos with arrow buttons and announces the move", () => {
    renderModal();
    fireEvent.click(screen.getByRole("button", { name: "Move b.jpg later" }));
    expect(screen.getByText("b.jpg, position 3 of 3")).toBeInTheDocument();
    const laterButtons = screen.getAllByRole("button", { name: /Move .* later/ });
    expect(laterButtons.map((b) => b.getAttribute("aria-label"))).toEqual([
      "Move a.jpg later",
      "Move c.jpg later",
      "Move b.jpg later",
    ]);
  });

  it("cycles per-photo duration and passes holds to export", async () => {
    renderModal();
    fireEvent.click(screen.getByRole("button", { name: "Duration for a.jpg: auto" }));
    expect(screen.getByRole("button", { name: "Duration for a.jpg: 1" })).toBeInTheDocument();
    fireEvent.mouseDown(screen.getByRole("tab", { name: /Preview & Export/i }));
    const exportBtn = screen.getByRole("button", { name: /Export Reel/i });
    await waitFor(() => expect(exportBtn).toBeEnabled());
    fireEvent.click(exportBtn);
    await screen.findByRole("link", { name: /Download/i });
    const renderer = jest.requireMock("../reelRenderer") as { renderReelToFile: jest.Mock };
    expect(renderer.renderReelToFile).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.objectContaining({ holds: [1, 2.5, 2.5] })
    );
  });

  it("applies a template in one tap", () => {
    renderModal();
    fireEvent.mouseDown(screen.getByRole("tab", { name: /Style/ }));
    fireEvent.click(screen.getByRole("button", { name: /Party Energy/ }));
    expect(screen.getByText("1.5s per photo")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Party Energy/ })).toHaveAttribute("aria-pressed", "true");
  });

  it("passes ratio dims, filter, and title to export", async () => {
    renderModal();
    fireEvent.mouseDown(screen.getByRole("tab", { name: /Preview & Export/i }));
    const exportBtn = screen.getByRole("button", { name: /Export Reel/i });
    await waitFor(() => expect(exportBtn).toBeEnabled());
    fireEvent.click(exportBtn);
    await screen.findByRole("link", { name: /Download/i });
    const renderer = jest.requireMock("../reelRenderer") as { renderReelToFile: jest.Mock };
    expect(renderer.renderReelToFile).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.objectContaining({
        width: 1080,
        height: 1920,
        filter: "none",
        title: { text: "Test Event", style: "lower" },
        endCard: null,
      })
    );
  });

  it("renders an end-card for CC-BY tracks", async () => {
    const tracks = jest.requireMock("../tracks") as {
      loadTrackManifest: jest.Mock;
      resolveCatalog: jest.Mock;
    };
    tracks.loadTrackManifest.mockResolvedValue([
      { id: "by", title: "By Track", src: "/reel-music/by.mp3", duration: 60, license: "CC-BY", credit: "Kevin MacLeod" },
    ]);
    tracks.resolveCatalog.mockImplementation(
      (items: Array<{ id: string; title: string; src: string; duration: number; license: string; credit: string }>) => [
        { id: "none", label: "No music", src: null, credit: "", license: "none" },
        ...items.map((t) => ({
          id: t.id,
          label: t.title,
          src: t.src,
          credit: t.credit,
          license: t.license,
          duration: t.duration,
        })),
      ]
    );
    renderModal();
    fireEvent.mouseDown(screen.getByRole("tab", { name: /Music/ }));
    fireEvent.click(await screen.findByText("By Track"));
    fireEvent.mouseDown(screen.getByRole("tab", { name: /Preview & Export/i }));
    const exportBtn = screen.getByRole("button", { name: /Export Reel/i });
    await waitFor(() => expect(exportBtn).toBeEnabled());
    fireEvent.click(exportBtn);
    await screen.findByRole("link", { name: /Download/i });
    const renderer = jest.requireMock("../reelRenderer") as { renderReelToFile: jest.Mock };
    expect(renderer.renderReelToFile).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.objectContaining({ endCard: "Music: Kevin MacLeod" })
    );
  });

  it("resumes a saved draft from the chip", () => {
    localStorage.setItem(
      "fyndr:reel:draft:evt1",
      JSON.stringify({
        v: 1, selected: ["a.jpg", "b.jpg"], musicId: "none", trim: null,
        volume: 0.5, fadeOn: false, durations: {}, transition: "slide",
        animation: "zoom-out", photoDur: 3, transDur: 1, ratio: "1:1",
        filter: "bw", textStyle: "center", templateId: null,
      })
    );
    renderModal();
    fireEvent.click(screen.getByRole("button", { name: "Resume" }));
    fireEvent.mouseDown(screen.getByRole("tab", { name: /Style/ }));
    expect(screen.getByText("3.0s per photo")).toBeInTheDocument();
    localStorage.clear();
  });

  it("steps the cover without crashing", async () => {
    renderModal();
    fireEvent.mouseDown(screen.getByRole("tab", { name: /Preview & Export/i }));
    await screen.findByText(/Cover 1\/3/);
    fireEvent.click(screen.getByRole("button", { name: "Next →" }));
    expect(await screen.findByText(/Cover 2\/3/)).toBeInTheDocument();
  });

  it("does not clobber a saved draft on open", () => {
    const seed = JSON.stringify({
      v: 1, selected: ["a.jpg", "b.jpg"], musicId: "none", trim: null,
      volume: 0.5, fadeOn: false, durations: {}, transition: "slide",
      animation: "zoom-out", photoDur: 3, transDur: 1, ratio: "1:1",
      filter: "bw", textStyle: "center", templateId: null,
    });
    localStorage.setItem("fyndr:reel:draft:evt1", seed);
    renderModal();
    expect(localStorage.getItem("fyndr:reel:draft:evt1")).toBe(seed);
    expect(screen.getByRole("button", { name: "Resume" })).toBeInTheDocument();
    localStorage.clear();
  });

  it("ignores corrupt or shapeless drafts without crashing", () => {
    localStorage.setItem("fyndr:reel:draft:evt1", "{bad json");
    const { unmount } = renderModal();
    expect(screen.queryByRole("button", { name: "Resume" })).not.toBeInTheDocument();
    unmount();
    localStorage.setItem("fyndr:reel:draft:evt1", JSON.stringify({ v: 2, selected: "nope" }));
    renderModal();
    expect(screen.queryByRole("button", { name: "Resume" })).not.toBeInTheDocument();
    localStorage.clear();
  });

  it("cycles per-photo anim and per-join transition into export", async () => {
    renderModal();
    fireEvent.click(screen.getByRole("button", { name: "Animation for a.jpg: global" }));
    expect(screen.getByRole("button", { name: "Animation for a.jpg: none" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Transition after photo 1: fade/ }));
    expect(screen.getByRole("button", { name: /Transition after photo 1: slide/ })).toBeInTheDocument();
    fireEvent.mouseDown(screen.getByRole("tab", { name: /Preview & Export/i }));
    const exportBtn = screen.getByRole("button", { name: /Export Reel/i });
    await waitFor(() => expect(exportBtn).toBeEnabled());
    fireEvent.click(exportBtn);
    await screen.findByRole("link", { name: /Download/i });
    const renderer = jest.requireMock("../reelRenderer") as { renderReelToFile: jest.Mock };
    expect(renderer.renderReelToFile).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.objectContaining({
        anims: ["none", undefined, undefined],
        joinTransitions: ["slide", undefined],
      })
    );
  });

  it("passes per-photo captions to export positionally", async () => {
    renderModal();
    fireEvent.change(screen.getByLabelText("Caption for a.jpg"), { target: { value: "First light" } });
    fireEvent.change(screen.getByLabelText("Caption for c.jpg"), { target: { value: "  " } });
    fireEvent.mouseDown(screen.getByRole("tab", { name: /Preview & Export/i }));
    const exportBtn = screen.getByRole("button", { name: /Export Reel/i });
    await waitFor(() => expect(exportBtn).toBeEnabled());
    fireEvent.click(exportBtn);
    await screen.findByRole("link", { name: /Download/i });
    const renderer = jest.requireMock("../reelRenderer") as { renderReelToFile: jest.Mock };
    expect(renderer.renderReelToFile).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.objectContaining({ captions: ["First light", "", "  "] })
    );
  });

  it("restores captions from a saved draft and tolerates drafts without them", () => {
    localStorage.setItem(
      "fyndr:reel:draft:evt1",
      JSON.stringify({
        v: 1, selected: ["a.jpg", "b.jpg"], musicId: "none", trim: null,
        volume: 0.5, fadeOn: false, durations: {}, transition: "slide",
        animation: "zoom-out", photoDur: 3, transDur: 1, ratio: "1:1",
        filter: "bw", textStyle: "center", templateId: null,
        captions: { "a.jpg": "Hello" },
      })
    );
    renderModal();
    fireEvent.click(screen.getByRole("button", { name: "Resume" }));
    expect(screen.getByLabelText("Caption for a.jpg")).toHaveValue("Hello");
    expect(screen.getByLabelText("Caption for b.jpg")).toHaveValue("");
    localStorage.clear();
  });

});
