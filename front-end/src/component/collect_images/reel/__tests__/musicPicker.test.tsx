import { act, fireEvent, render, screen } from "@testing-library/react";
import { MusicPicker } from "../musicPicker";
import type { CatalogTrack } from "../tracks";

const instances: Array<{
  play: jest.Mock;
  pause: jest.Mock;
  onended: (() => void) | null;
  src: string;
}> = [];

class MockAudio {
  src = "";
  preload = "";
  onended: (() => void) | null = null;
  onerror: (() => void) | null = null;
  private pending: Array<(e: unknown) => void> = [];
  play = jest.fn(
    () =>
      new Promise<void>((_resolve, reject) => {
        this.pending.push(reject);
      })
  );
  pause = jest.fn(() => {
    // Like browsers: interrupting pending play() rejects it (AbortError),
    // delivered as a microtask — after the click handler already switched tracks.
    const interrupted = this.pending.splice(0);
    queueMicrotask(() =>
      interrupted.forEach((reject) => reject(new DOMException("interrupted", "AbortError")))
    );
  });
  constructor() {
    instances.push(this);
  }
}

const g = globalThis as unknown as { Audio?: unknown };
const savedAudio = g.Audio;
g.Audio = MockAudio;

afterEach(() => {
  instances.length = 0;
  jest.clearAllMocks();
});

afterAll(() => {
  g.Audio = savedAudio;
});

const catalog: CatalogTrack[] = [
  { id: "none", label: "No music", src: null, credit: "", license: "none" },
  {
    id: "calm-piano",
    label: "Calm Piano",
    src: "/reel-music/calm-piano.mp3",
    credit: "",
    license: "CC0",
    artist: "FreePD",
    duration: 64,
  },
  {
    id: "party-start",
    label: "Party Start",
    src: "/reel-music/party-start.mp3",
    credit: "Kevin MacLeod",
    license: "CC-BY",
    duration: 48,
  },
];

function renderPicker(overrides: Partial<Parameters<typeof MusicPicker>[0]> = {}) {
  return render(
    <MusicPicker
      catalog={catalog}
      musicId="none"
      onSelect={jest.fn()}
      customAudio={null}
      onUpload={jest.fn()}
      loading={false}
      {...overrides}
    />
  );
}

describe("MusicPicker", () => {
  it("renders track rows with labels and credits", () => {
    renderPicker();
    expect(screen.getByText("Calm Piano")).toBeInTheDocument();
    expect(screen.getByText("FreePD · 1:04")).toBeInTheDocument();
    expect(screen.getByText("Kevin MacLeod")).toBeInTheDocument();
    expect(screen.getByText("Upload from device")).toBeInTheDocument();
  });

  it("selects a track on row click", () => {
    const onSelect = jest.fn();
    renderPicker({ onSelect });
    fireEvent.click(screen.getByText("Calm Piano"));
    expect(onSelect).toHaveBeenCalledWith("calm-piano");
  });

  it("previews one track at a time and resets on ended", () => {
    renderPicker();
    fireEvent.click(screen.getByLabelText("Play Calm Piano"));
    expect(instances).toHaveLength(1);
    expect(instances[0].src).toBe("/reel-music/calm-piano.mp3");
    expect(screen.getByLabelText("Pause Calm Piano")).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText("Play Party Start"));
    expect(instances[0].pause).toHaveBeenCalled();
    expect(instances[0].src).toBe("/reel-music/party-start.mp3");
    act(() => {
      instances[0].onended?.();
    });
    expect(screen.getByLabelText("Play Party Start")).toBeInTheDocument();
  });
  it("keeps the new track active when the superseded play() rejects", async () => {
    renderPicker();
    fireEvent.click(screen.getByLabelText("Play Calm Piano"));
    fireEvent.click(screen.getByLabelText("Play Party Start"));
    await act(async () => {});
    expect(screen.getByLabelText("Pause Party Start")).toBeInTheDocument();
  });

  it("shows upload-only state for an empty catalog", () => {
    renderPicker({ catalog: [catalog[0]] });
    expect(screen.getByText(/No bundled tracks yet/)).toBeInTheDocument();
    expect(screen.queryByLabelText(/Play /)).not.toBeInTheDocument();
  });

  it("forwards the uploaded file", () => {
    const onUpload = jest.fn();
    renderPicker({ onUpload });
    const file = new File(["audio"], "song.mp3", { type: "audio/mpeg" });
    fireEvent.change(screen.getByLabelText(/Upload from device/), { target: { files: [file] } });
    expect(onUpload).toHaveBeenCalledWith(file);
  });
});
