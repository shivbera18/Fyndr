import assert from "node:assert";
import test from "node:test";
import { EventEmitter } from "node:events";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { Request, Response } from "express";
import musicRouter, { parseShortsLines, audioUrlFor, isVideoId, cookieArgs } from "../music";

interface MockResponse {
  statusCode: number;
  body: Record<string, unknown> | null;
  status(code: number): MockResponse;
  send(payload: unknown): MockResponse;
}

function createMockResponse(): MockResponse {
  const res: MockResponse = {
    statusCode: 0,
    body: null,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    send(payload: unknown) {
      this.body = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : null;
      return this;
    },
  };
  return res;
}

interface LayerWithRoute {
  route?: {
    path?: string;
    methods?: Record<string, boolean>;
    stack: Array<{ handle: (req: Request, res: Response, next: () => void) => Promise<void> | void }>;
  };
}

function findRoute(path: string): { handle: (req: Request, res: Response, next: () => void) => Promise<void> | void } {
  const layers = musicRouter.stack as LayerWithRoute[];
  const route = layers.find((l) => l.route?.path === path && l.route?.methods?.get);
  assert.ok(route?.route, `Route GET ${path} should be defined`);
  return route.route.stack[0];
}
interface AudioMockRes extends EventEmitter {
  statusCode: number;
  body: unknown;
  destroyed: boolean;
  writableEnded: boolean;
  status(code: number): AudioMockRes;
  send(payload: unknown): AudioMockRes;
  setHeader(name: string, value: string): void;
  write(chunk: Buffer): boolean;
  end(): AudioMockRes;
}

interface AudioOutcome {
  statusCode: number;
  body: unknown;
}

// Drives the streaming audio handler with a mock req/res pair.
function runAudio(v: string): Promise<AudioOutcome> {
  return new Promise((resolve) => {
    const req = Object.assign(new EventEmitter(), { query: { v } }) as unknown as Request;
    const res = new EventEmitter() as unknown as AudioMockRes;
    res.statusCode = 0;
    res.body = null;
    res.destroyed = false;
    res.writableEnded = false;
    res.status = function (code: number): AudioMockRes {
      res.statusCode = code;
      return res;
    };
    res.send = function (payload: unknown): AudioMockRes {
      res.body = payload;
      resolve({ statusCode: res.statusCode, body: payload });
      return res;
    };
    res.setHeader = function (): void {
      // no-op mock
    };
    res.write = function (): boolean {
      return true;
    };
    res.end = function (): AudioMockRes {
      resolve({ statusCode: res.statusCode, body: null });
      return res;
    };
    const route = (musicRouter.stack as Array<{ route?: { path?: string; methods?: Record<string, boolean>; stack: Array<{ handle: (req: Request, res: Response, next: () => void) => void }> } }>).find(
      (l) => l.route?.path === "/api/music/audio" && l.route?.methods?.get
    );
    assert.ok(route?.route, "Route GET /api/music/audio should be defined");
    route.route.stack[0].handle(req, res as unknown as Response, () => {});
  });
}

test("Shorts music endpoint tests", async (t) => {
  await t.test("parseShortsLines keeps shorts, drops filler and bad rows", () => {
    const out = [
      "2qzlZdzpi-Y\tKissing | scene #shorts\tAnything vlg\t20",
      "loeRLhBd2Xs\tTwo Hour Song\tUnplugged\t7200",
      "bad-id\tNo Title\tChan\t15",
      "DGxS_26XM7Y\tStatus #shorts\tRafi\t6",
      "DGxS_26XM7Y\tStatus #shorts\tRafi\tnot-a-number",
      "short\tTitle only",
      "",
    ].join("\n");
    assert.deepStrictEqual(parseShortsLines(out), [
      { id: "2qzlZdzpi-Y", title: "Kissing | scene #shorts", channel: "Anything vlg", duration: 20 },
      { id: "DGxS_26XM7Y", title: "Status #shorts", channel: "Rafi", duration: 6 },
    ]);
  });

  await t.test("parseShortsLines caps at 6 results", () => {
    const out = Array.from({ length: 10 }, (_, i) => `2qzlZdzpi-Y\tSong ${i}\tChan\t10`).join("\n");
    assert.strictEqual(parseShortsLines(out).length, 6);
  });

  await t.test("audioUrlFor and isVideoId gate the audio proxy", () => {
    assert.strictEqual(audioUrlFor("DGxS_26XM7Y"), "/api/music/audio?v=DGxS_26XM7Y");
    assert.strictEqual(isVideoId("DGxS_26XM7Y"), true);
    assert.strictEqual(isVideoId("https://evil.com/x"), false);
    assert.strictEqual(isVideoId("../../etc/passwd"), false);
    assert.strictEqual(isVideoId(undefined), false);
  });

  await t.test("GET /api/music/shorts-search rejects short queries", async () => {
    const res = createMockResponse();
    const req = { query: { q: "a" } } as unknown as Request;
    await findRoute("/api/music/shorts-search").handle(req, res as unknown as Response, () => {});
    assert.strictEqual(res.statusCode, 400);
  });

  await t.test("GET /api/music/audio rejects non-ids", async () => {
    for (const v of ["https://evil.com/x", "..", "short", undefined]) {
      const res = createMockResponse();
      const req = { query: { v } } as unknown as Request;
      await findRoute("/api/music/audio").handle(req, res as unknown as Response, () => {});
      assert.strictEqual(res.statusCode, 400, `v=${String(v)} should 400`);
    }
  });

  await t.test("GET /api/music/shorts-search 502s when the engine fails", async () => {
    const prev = process.env.YT_DLP_BIN;
    process.env.YT_DLP_BIN = process.execPath;
    try {
      const res = createMockResponse();
      const req = { query: { q: "sayyara" } } as unknown as Request;
      await findRoute("/api/music/shorts-search").handle(req, res as unknown as Response, () => {});
      assert.strictEqual(res.statusCode, 502);
    } finally {
      if (prev === undefined) delete process.env.YT_DLP_BIN;
      else process.env.YT_DLP_BIN = prev;
    }
  });

  await t.test("GET /api/music/shorts-search 503s when the binary is missing", async () => {
    const prev = process.env.YT_DLP_BIN;
    process.env.YT_DLP_BIN = "/definitely/missing/yt-dlp";
    try {
      const res = createMockResponse();
      const req = { query: { q: "sayyara" } } as unknown as Request;
      await findRoute("/api/music/shorts-search").handle(req, res as unknown as Response, () => {});
      assert.strictEqual(res.statusCode, 503);
    } finally {
      if (prev === undefined) delete process.env.YT_DLP_BIN;
      else process.env.YT_DLP_BIN = prev;
    }
  });

  await t.test("GET /api/music/audio 503s when the binary is missing", async () => {
    const prev = process.env.YT_DLP_BIN;
    process.env.YT_DLP_BIN = "/definitely/missing/yt-dlp";
    try {
      const out = await runAudio("DGxS_26XM7Y");
      assert.strictEqual(out.statusCode, 503);
    } finally {
      if (prev === undefined) delete process.env.YT_DLP_BIN;
      else process.env.YT_DLP_BIN = prev;
    }
  });

  await t.test("GET /api/music/audio 502s when extraction fails", async () => {
    const prev = process.env.YT_DLP_BIN;
    process.env.YT_DLP_BIN = process.execPath;
    try {
      const out = await runAudio("DGxS_26XM7Y");
      assert.strictEqual(out.statusCode, 502);
    } finally {
      if (prev === undefined) delete process.env.YT_DLP_BIN;
      else process.env.YT_DLP_BIN = prev;
    }
  });

  await t.test("cookieArgs follows YT_DLP_COOKIES only for real files", () => {
    const prev = process.env.YT_DLP_COOKIES;
    try {
      delete process.env.YT_DLP_COOKIES;
      assert.deepStrictEqual(cookieArgs(), []);
      process.env.YT_DLP_COOKIES = "/definitely/missing/cookies.txt";
      assert.deepStrictEqual(cookieArgs(), []);
      process.env.YT_DLP_COOKIES = os.tmpdir();
      assert.deepStrictEqual(cookieArgs(), []);
      const f = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "fyndr-cookies-")), "cookies.txt");
      fs.writeFileSync(f, "# Netscape HTTP Cookie File\n");
      process.env.YT_DLP_COOKIES = f;
      assert.deepStrictEqual(cookieArgs(), ["--cookies", f]);
      fs.rmSync(path.dirname(f), { recursive: true, force: true });
    } finally {
      if (prev === undefined) delete process.env.YT_DLP_COOKIES;
      else process.env.YT_DLP_COOKIES = prev;
    }
  });
});
