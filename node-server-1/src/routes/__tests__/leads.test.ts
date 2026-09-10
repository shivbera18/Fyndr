import assert from "node:assert";
import test from "node:test";
import type { Request, Response } from "express";
import leadsRouter from "../leads";
import analyticsRouter from "../analytics";
import AnalyticsEvent from "../../models/AnalyticsEvent";

interface MockResponse {
  statusCode: number;
  body: Record<string, unknown> | null;
  status(code: number): MockResponse;
  send(payload: unknown): MockResponse;
  json(payload: unknown): MockResponse;
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
    json(payload: unknown) {
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

test("Leads & Booking Inquiry validation tests", async (t) => {
  await t.test("POST /leads rejects invalid kind", async () => {
    const res = createMockResponse();
    const req = {
      body: {
        event_id: "507f1f77bcf86cd799439011",
        name: "Aman",
        phone: "+919876543210",
        kind: "unknown_kind",
      },
    } as unknown as Request;

    const layers = leadsRouter.stack as LayerWithRoute[];
    const route = layers.find((l) => l.route?.path === "/leads" && l.route?.methods?.post);
    assert.ok(route?.route, "Route POST /leads should be defined");
    await route.route.stack[0].handle(req, res as unknown as Response, () => {});

    assert.strictEqual(res.statusCode, 400);
    assert.strictEqual(res.body?.error, "kind must be 'gate' or 'booking'");
  });

  await t.test("POST /leads rejects overlong message", async () => {
    const res = createMockResponse();
    const req = {
      body: {
        event_id: "507f1f77bcf86cd799439011",
        name: "Aman",
        phone: "+919876543210",
        kind: "booking",
        message: "a".repeat(501),
      },
    } as unknown as Request;

    const layers = leadsRouter.stack as LayerWithRoute[];
    const route = layers.find((l) => l.route?.path === "/leads" && l.route?.methods?.post);
    assert.ok(route?.route, "Route POST /leads should be defined");
    await route.route.stack[0].handle(req, res as unknown as Response, () => {});

    assert.strictEqual(res.statusCode, 400);
    assert.strictEqual(res.body?.error, "message must be 500 characters or less");
  });

  await t.test("POST /api/analytics/track accepts 'booking_inquiry' event type", async () => {
    const res = createMockResponse();
    const req = {
      body: {
        eventId: "507f1f77bcf86cd799439011",
        type: "booking_inquiry",
      },
      headers: {},
      socket: { remoteAddress: "127.0.0.1" },
    } as unknown as Request;

    const layers = analyticsRouter.stack as LayerWithRoute[];
    const route = layers.find((l) => l.route?.path === "/track" && l.route?.methods?.post);
    assert.ok(route?.route, "Route POST /track should be defined");
    const origCreate = AnalyticsEvent.create;
    AnalyticsEvent.create = (() => Promise.resolve({} as unknown)) as unknown as typeof AnalyticsEvent.create;
    try {
      await route.route.stack[0].handle(req, res as unknown as Response, () => {});
      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.body?.ok, true);
    } finally {
      AnalyticsEvent.create = origCreate;
    }
  });
});
