import assert from "node:assert";
import test from "node:test";
import type { Request, Response } from "express";
import musicRouter, { parseShortsLines, audioUrlFor, isVideoId } from "../music";

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

test("Shorts music endpoint tests", async (t) => {
  await t.test("parseShortsLines keeps shorts, drops filler and bad rows", () => {
    const out = [
      "2qzlZdzpi-Y | Kissing scene #shorts | Anything vlg | 20",
      "loeRLhBd2Xs | Two Hour Song | Unplugged | 7200",
      "bad-id | No Title | Chan | 15",
      "DGxS_26XM7Y | Status #shorts | Rafi | 6",
      "DGxS_26XM7Y | Status #shorts | Rafi | not-a-number",
      "short | Title only",
      "",
    ].join("\n");
    assert.deepStrictEqual(parseShortsLines(out), [
      { id: "2qzlZdzpi-Y", title: "Kissing scene #shorts", channel: "Anything vlg", duration: 20 },
      { id: "DGxS_26XM7Y", title: "Status #shorts", channel: "Rafi", duration: 6 },
    ]);
  });

  await t.test("parseShortsLines caps at 6 results", () => {
    const out = Array.from({ length: 10 }, (_, i) => `2qzlZdzpi-Y | Song ${i} | Chan | 10`).join("\n");
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
});
