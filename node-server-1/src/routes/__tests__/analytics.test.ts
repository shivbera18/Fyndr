import assert from "node:assert";
import test from "node:test";
import analyticsRouter from "../analytics";

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
    assert.strictEqual(responseBody.message, "eventId and type are required");
  });
});
