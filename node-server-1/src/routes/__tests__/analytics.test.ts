import assert from "node:assert";
import test from "node:test";
import analyticsRouter from "../analytics";
import express from "express";
import { once } from "node:events";
import { promisify } from "node:util";
import adminRouter from "../admin";
import Event from "../../models/Event";
import GuestAccess from "../../models/GuestAccess";
import AnalyticsEvent from "../../models/AnalyticsEvent";

test("guest PIN verification stays public while admin routes stay protected", async (t) => {
  const app = express();
  app.use(express.json());
  app.use(adminRouter);
  app.use("/api/analytics", analyticsRouter);
  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  const base = `http://127.0.0.1:${address.port}`;
  let storedPin = "012345";
  t.mock.method(Event, "findById", async () => ({ pin: storedPin }));
  t.mock.method(GuestAccess, "findOne", async () => null);
  t.mock.method(GuestAccess, "create", async (guest: Record<string, unknown>) => ({ ...guest, _id: "guest-test" }));
  t.mock.method(AnalyticsEvent, "create", async () => ({}));
  try {
    for (const [pin, expected] of [["012345", true], ["999999", false], ["", true]] as const) {
      if (pin === "") storedPin = "";
      const response = await fetch(`${base}/api/analytics/access-attempt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId: "000000000000000000000001", name: "Guest", phone: "1234567890", pin }),
      });
      assert.strictEqual(response.status, 200);
      const data = await response.json() as { ok: boolean; verified: boolean };
      assert.strictEqual(data.ok, expected);
      assert.strictEqual(data.verified, expected);
    }
    const admin = await fetch(`${base}/admin/overview`);
    assert.ok(admin.status === 401 || admin.status === 503);
  } finally {
    server.closeAllConnections();
    await promisify(server.close.bind(server))();
  }
});

test("Analytics Router unit tests", async (t) => {

  await t.test("POST /api/analytics/access-attempt validates eventId presence", async () => {
    let statusCode = 0;
    let responseBody: any = null;

    const req: any = {
      body: { pin: "123456" },
      headers: {},
      socket: { remoteAddress: "127.0.0.1" },
    };
    const res: any = {
      status(code: number) {
        statusCode = code;
        return this;
      },
      json(body: any) {
        responseBody = body;
        return this;
      },
    };

    // Find the handler for /access-attempt
    const route: any = analyticsRouter.stack.find((layer: any) => layer.route?.path === "/access-attempt");
    assert.ok(route && route.route, "Route /access-attempt should be defined");
    await route.route.stack[0].handle(req, res, () => {});

    assert.strictEqual(statusCode, 400);
    assert.strictEqual(responseBody.ok, false);
    assert.strictEqual(responseBody.message, "Event ID is required");
  });

  await t.test("POST /api/analytics/track validates required fields", async () => {
    let statusCode = 0;
    let responseBody: any = null;

    const req: any = {
      body: {},
      headers: {},
      socket: { remoteAddress: "127.0.0.1" },
    };
    const res: any = {
      status(code: number) {
        statusCode = code;
        return this;
      },
      json(body: any) {
        responseBody = body;
        return this;
      },
    };

    const route: any = analyticsRouter.stack.find((layer: any) => layer.route?.path === "/track");
    assert.ok(route && route.route, "Route /track should be defined");
    await route.route.stack[0].handle(req, res, () => {});

    assert.strictEqual(statusCode, 400);
    assert.strictEqual(responseBody.ok, false);
    assert.ok(typeof responseBody.message === "string" && responseBody.message.length > 0);
  });
});
