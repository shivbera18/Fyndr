import fs from "fs";
import path from "path";
// CRA jest forbids imports outside src/, so read the checked-in manifest off disk.
const manifest = JSON.parse(
  fs.readFileSync(path.join(__dirname, "../../../../../public/reel-music/manifest.json"), "utf8")
);
import {
  APPROVED_AUDIO_ORIGINS,
  loadTrackManifest,
  resolveCatalog,
  validateManifest,
} from "../tracks";

const goodCC0 = {
  id: "calm-piano",
  title: "Calm Piano",
  artist: "FreePD",
  mood: ["lofi", "wedding"],
  src: "/reel-music/calm-piano.mp3",
  duration: 64,
  license: "CC0",
} as const;

describe("track catalog", () => {
  it("accepts a well-formed catalog", () => {
    const tracks = validateManifest({
      version: 1,
      tracks: [
        goodCC0,
        {
          id: "party-start",
          title: "Party Start",
          src: "/reel-music/party-start.mp3",
          duration: 48,
          license: "CC-BY",
          credit: "Kevin MacLeod",
        },
      ],
    });
    expect(tracks.map((t) => t.id)).toEqual(["calm-piano", "party-start"]);
  });

  it("drops bad entries but keeps the good ones", () => {
    const tracks = validateManifest({
      tracks: [
        goodCC0,
        { ...goodCC0, id: "calm-piano" },
        { ...goodCC0, id: "uncredited", license: "CC-BY" },
        { ...goodCC0, id: "hotlink", src: "https://unapproved.example/x.mp3" },
        { ...goodCC0, id: "insecure", src: "http://example.com/x.mp3" },
        { ...goodCC0, id: "proto-relative", src: "//evil.example/x.mp3" },
        { ...goodCC0, id: "backslash", src: "/\\evil.example/x.mp3" },
        { ...goodCC0, id: "none" },
        { ...goodCC0, id: "nodur", duration: 0 },
        { ...goodCC0, id: "nolicense", license: "GPL" },
        "not-an-object",
      ],
    });
    expect(tracks.map((t) => t.id)).toEqual(["calm-piano"]);
  });

  it("keeps tracks with malformed optional peaks but omits them", () => {
    const tracks = validateManifest({ tracks: [{ ...goodCC0, id: "nanpeaks", peaks: [0.5, NaN] }] });
    expect(tracks.map((t) => t.id)).toEqual(["nanpeaks"]);
    expect(tracks[0].peaks).toBeUndefined();
  });

  it("rejects non-manifest shapes", () => {
    expect(validateManifest(null)).toEqual([]);
    expect(validateManifest({ tracks: "nope" })).toEqual([]);
  });

  it("validates the checked-in manifest", () => {
    expect(() => validateManifest(manifest)).not.toThrow();
    const raw = manifest as { tracks: unknown[] };
    expect(validateManifest(manifest)).toHaveLength(raw.tracks.length);
  });

  it("resolves none-first with metadata preserved", () => {
    const catalog = resolveCatalog(validateManifest({ tracks: [goodCC0] }));
    expect(catalog[0].id).toBe("none");
    expect(catalog[0].src).toBeNull();
    expect(catalog[1]).toMatchObject({
      id: "calm-piano",
      label: "Calm Piano",
      license: "CC0",
      mood: ["lofi", "wedding"],
      duration: 64,
    });
  });

  it("loads [] on missing manifest", async () => {
    const fetchMock = jest.fn(async () => ({ ok: false, json: async () => ({}) }));
    const saved = global.fetch;
    global.fetch = fetchMock as unknown as typeof fetch;
    try {
      await expect(loadTrackManifest()).resolves.toEqual([]);
      expect(fetchMock).toHaveBeenCalledWith("/reel-music/manifest.json", expect.anything());
    } finally {
      global.fetch = saved;
    }
  });

  it("loads and validates on success", async () => {
    const fetchMock = jest.fn(async () => ({
      ok: true,
      json: async () => ({ tracks: [goodCC0] }),
    }));
    const saved = global.fetch;
    global.fetch = fetchMock as unknown as typeof fetch;
    try {
      const tracks = await loadTrackManifest();
      expect(tracks.map((t) => t.id)).toEqual(["calm-piano"]);
    } finally {
      global.fetch = saved;
    }
  });

  it("loads [] on network or parse failure", async () => {
    const saved = global.fetch;
    try {
      global.fetch = jest.fn(async () => {
        throw new Error("offline");
      }) as unknown as typeof fetch;
      await expect(loadTrackManifest()).resolves.toEqual([]);
      global.fetch = jest.fn(async () => ({
        ok: true,
        json: async () => {
          throw new SyntaxError("not json");
        },
      })) as unknown as typeof fetch;
      await expect(loadTrackManifest()).resolves.toEqual([]);
    } finally {
      global.fetch = saved;
    }
  });

  it("accepts approved https origins", () => {
    APPROVED_AUDIO_ORIGINS.push("https://cdn.example");
    try {
      const tracks = validateManifest({
        tracks: [{ ...goodCC0, id: "cdn", src: "https://cdn.example/x.mp3" }],
      });
      expect(tracks.map((t) => t.id)).toEqual(["cdn"]);
    } finally {
      APPROVED_AUDIO_ORIGINS.pop();
    }
  });
});
