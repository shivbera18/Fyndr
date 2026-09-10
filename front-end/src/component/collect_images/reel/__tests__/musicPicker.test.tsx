import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { extractYoutubeId, MusicPicker, parseAudiusTracks } from "../musicPicker";
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
    mood: ["lofi", "wedding"],
    duration: 64,
  },
  {
    id: "party-start",
    label: "Party Start",
    src: "/reel-music/party-start.mp3",
    credit: "Kevin MacLeod",
    license: "CC-BY",
    mood: ["party"],
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
    // findBy flushes the AbortError microtask and asserts the end state.
    expect(await screen.findByLabelText("Pause Party Start")).toBeInTheDocument();
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

  it("filters rows by query and keeps the none row pinned", () => {
    renderPicker();
    fireEvent.change(screen.getByLabelText("Search songs or artists"), { target: { value: "party" } });
    expect(screen.getByText("Party Start")).toBeInTheDocument();
    expect(screen.queryByText("Calm Piano")).not.toBeInTheDocument();
    expect(screen.getByText("No music")).toBeInTheDocument();
    expect(screen.getByText("Upload from device")).toBeInTheDocument();
    expect(screen.getByText("1 of 2 tracks")).toBeInTheDocument();
  });

  it("filters rows by mood chip combined with the query", () => {
    renderPicker();
    fireEvent.click(screen.getByRole("button", { name: "wedding" }));
    expect(screen.getByText("Calm Piano")).toBeInTheDocument();
    expect(screen.queryByText("Party Start")).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Search songs or artists"), { target: { value: "party" } });
    expect(screen.queryByText("Calm Piano")).not.toBeInTheDocument();
    expect(screen.getByText(/No tracks match/)).toBeInTheDocument();
  });

  it("clears filters from the empty state and preserves out-of-view selection", () => {
    const onSelect = jest.fn();
    renderPicker({ onSelect, musicId: "party-start" });
    expect(screen.getByRole("button", { name: /Party Start/, pressed: true })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Search songs or artists"), { target: { value: "calm" } });
    expect(screen.queryByText("Party Start")).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Search songs or artists"), { target: { value: "" } });
    expect(screen.getByRole("button", { name: /Party Start/, pressed: true })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Search songs or artists"), { target: { value: "zzz" } });
    fireEvent.click(screen.getByRole("button", { name: "Clear search" }));
    expect(screen.getByText("Party Start")).toBeInTheDocument();
    expect(screen.getByText("Calm Piano")).toBeInTheDocument();
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("clears the query on Escape without selecting anything", () => {
    const onSelect = jest.fn();
    renderPicker({ onSelect });
    const input = screen.getByLabelText("Search songs or artists");
    fireEvent.change(input, { target: { value: "party" } });
    expect(screen.queryByText("Calm Piano")).not.toBeInTheDocument();
    fireEvent.keyDown(input, { key: "Escape" });
    expect(screen.getByText("Calm Piano")).toBeInTheDocument();
    expect(onSelect).not.toHaveBeenCalled();
  });
});

describe("parseAudiusTracks", () => {
  it("parses tracks and skips malformed entries without throwing", () => {
    expect(
      parseAudiusTracks({
        data: [
          { id: 42, title: "Night Drive", user: { name: "DJ Open" }, duration: 95.5, artwork: { "150x150": "https://img/x.jpg" } },
          { id: "bad-no-title", user: { name: "X" } },
          null,
        ],
      })
    ).toEqual([
      {
        id: "audius-42",
        title: "Night Drive",
        artist: "DJ Open",
        duration: 95.5,
        streamUrl: expect.stringContaining("/v1/tracks/42/stream"),
        artwork: "https://img/x.jpg",
      },
    ]);
    expect(parseAudiusTracks({ data: "nope" })).toEqual([]);
  });
});

describe("extractYoutubeId", () => {
  it("matches watch, shorts, and youtu.be URLs", () => {
    expect(extractYoutubeId("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
    expect(extractYoutubeId("https://youtu.be/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
    expect(extractYoutubeId("https://www.youtube.com/shorts/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
    expect(extractYoutubeId("https://example.com/song.mp3")).toBeNull();
  });

  it("rejects over-long youtube slugs", () => {
    expect(extractYoutubeId("https://youtu.be/dQw4w9WgXcQ-extra")).toBeNull();
  });
});

describe("link tab", () => {
  function openLinkTab() {
    const onSelectRemote = jest.fn();
    renderPicker({ onSelectRemote });
    fireEvent.click(screen.getByRole("button", { name: "YouTube & link" }));
    return onSelectRemote;
  }

  it("rejects non-https links", () => {
    const onSelectRemote = openLinkTab();
    fireEvent.change(screen.getByLabelText("Audio or YouTube link"), {
      target: { value: "http://example.com/song.mp3" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Use this audio" }));
    expect(screen.getByRole("alert")).toHaveTextContent(/https:\/\//);
    expect(onSelectRemote).not.toHaveBeenCalled();
  });

  it("rejects YouTube pages instead of exporting silence", () => {
    const onSelectRemote = openLinkTab();
    fireEvent.change(screen.getByLabelText("Audio or YouTube link"), {
      target: { value: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Use this audio" }));
    expect(screen.getByRole("alert")).toHaveTextContent(/can't go in the export/);
    expect(onSelectRemote).not.toHaveBeenCalled();
  });

  it("forwards direct audio links with a readable name", () => {
    const onSelectRemote = openLinkTab();
    fireEvent.change(screen.getByLabelText("Audio or YouTube link"), {
      target: { value: "https://cdn.example.com/tracks/bride-entry.mp3" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Use this audio" }));
    expect(onSelectRemote).toHaveBeenCalledWith(
      "https://cdn.example.com/tracks/bride-entry.mp3",
      "cdn.example.com · bride-entry.mp3"
    );
  });
});

describe("free tab", () => {
  const realFetch = global.fetch;

  afterEach(() => {
    global.fetch = realFetch;
  });

  it("searches Audius and forwards the stream URL", async () => {
    const onSelectRemote = jest.fn();
    global.fetch = jest.fn(async () => ({
      ok: true,
      json: async () => ({
        data: [{ id: 7, title: "Open Sky", user: { name: "Free Artist" }, duration: 120 }],
      }),
    })) as unknown as typeof fetch;
    renderPicker({ onSelectRemote });
    fireEvent.click(screen.getByRole("button", { name: "Free music" }));
    fireEvent.change(screen.getByLabelText("Search free music"), { target: { value: "open sky" } });
    fireEvent.click(await screen.findByText("Open Sky", {}, { timeout: 3000 }));
    expect(onSelectRemote).toHaveBeenCalledWith(
      expect.stringContaining("/v1/tracks/7/stream"),
      "Open Sky — Free Artist"
    );
  });

  it("falls back to the next host when the first is down", async () => {
    const calls: string[] = [];
    global.fetch = jest.fn(async (url: unknown) => {
      calls.push(String(url));
      if (calls.length === 1) throw new TypeError("down");
      return { ok: true, json: async () => ({ data: [] }) };
    }) as unknown as typeof fetch;
    renderPicker({ onSelectRemote: jest.fn() });
    fireEvent.click(screen.getByRole("button", { name: "Free music" }));
    fireEvent.change(screen.getByLabelText("Search free music"), { target: { value: "quiet piano" } });
    await waitFor(() => expect(calls.length).toBe(2), { timeout: 3000 });
    expect(calls[1]).toContain("discoveryprovider2");
    expect(await screen.findByText(/No free tracks found/)).toBeInTheDocument();
  });

  it("does not retry deterministic errors", async () => {
    let calls = 0;
    global.fetch = jest.fn(async () => {
      calls += 1;
      return { ok: false, status: 400, json: async () => ({}) };
    }) as unknown as typeof fetch;
    renderPicker({ onSelectRemote: jest.fn() });
    fireEvent.click(screen.getByRole("button", { name: "Free music" }));
    fireEvent.change(screen.getByLabelText("Search free music"), { target: { value: "quiet piano" } });
    expect(await screen.findByText(/Free-music search failed \(400\)/)).toBeInTheDocument();
    expect(calls).toBe(1);
  });
});

describe("shorts tab", () => {
  const realFetch = global.fetch;

  afterEach(() => {
    global.fetch = realFetch;
  });

  it("searches Shorts and forwards the proxied audio URL", async () => {
    const onSelectRemote = jest.fn();
    global.fetch = jest.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        tracks: [
          {
            id: "DGxS_26XM7Y",
            title: "Saiyaara Status",
            channel: "Rafi",
            duration: 6,
            audioUrl: "/api/music/audio?v=DGxS_26XM7Y",
          },
        ],
      }),
    })) as unknown as typeof fetch;
    renderPicker({ onSelectRemote });
    fireEvent.click(screen.getByRole("button", { name: "Shorts" }));
    fireEvent.change(screen.getByLabelText("Search YouTube Shorts audio"), { target: { value: "sayyara" } });
    fireEvent.click(await screen.findByText("Saiyaara Status", {}, { timeout: 3000 }));
    expect(onSelectRemote).toHaveBeenCalledWith(
      expect.stringContaining("/api/music/audio?v=DGxS_26XM7Y"),
      "Saiyaara Status — Rafi"
    );
  });

  it("surfaces the server-missing message", async () => {
    global.fetch = jest.fn(async () => ({
      ok: false,
      status: 503,
      json: async () => ({}),
    })) as unknown as typeof fetch;
    renderPicker({ onSelectRemote: jest.fn() });
    fireEvent.click(screen.getByRole("button", { name: "Shorts" }));
    fireEvent.change(screen.getByLabelText("Search YouTube Shorts audio"), { target: { value: "sayyara" } });
    expect(await screen.findByText(/isn't set up on this server/, {}, { timeout: 3000 })).toBeInTheDocument();
  });
});
