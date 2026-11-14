import assert from "node:assert";
import test from "node:test";
import type { Request, Response } from "express";
import adminRouter from "../admin";
import DriveConnection from "../../models/DriveConnection";

interface RouteLayer {
  route?: {
    path?: string;
    methods?: Record<string, boolean>;
    stack?: Array<{ handle: (req: Request, res: Response, next: () => void) => Promise<void> | void }>;
  };
  handle?: (req: Request, res: Response, next: () => void) => void;
}

interface RouterWithStack {
  stack: RouteLayer[];
}

function hasErrorProp(val: unknown): val is { error: unknown } {
  return typeof val === "object" && val !== null && "error" in val;
}

function hasOkProp(val: unknown): val is { ok: boolean } {
  return typeof val === "object" && val !== null && "ok" in val;
}

function hasHealthProps(val: unknown): val is { healthy: boolean; g3Status: string; driveStatus: string } {
  return typeof val === "object" && val !== null && "healthy" in val && "g3Status" in val && "driveStatus" in val;
}

test("Admin Storage Health and Revoke routes", async (t) => {
  await t.test("storage health and revoke routes exist", () => {
    const routerStack = adminRouter as unknown as RouterWithStack;
    const healthRoute = routerStack.stack.find((layer) => layer.route?.path === "/admin/storage/health");
    assert.ok(healthRoute && healthRoute.route, "Route /admin/storage/health should be defined");
    assert.strictEqual(healthRoute.route.methods?.get, true);

    const revokeRoute = routerStack.stack.find((layer) => layer.route?.path === "/admin/storage/revoke-all");
    assert.ok(revokeRoute && revokeRoute.route, "Route /admin/storage/revoke-all should be defined");
    assert.strictEqual(revokeRoute.route.methods?.post, true);
  });

  await t.test("requireAdmin middleware blocks unauthorized requests", () => {
    let statusCode = 0;
    let responseBody: unknown = null;

    const req = {
      header: (name: string) => (name === "x-admin-key" ? "wrong-key" : ""),
    } as unknown as Request;

    const res = {
      status(code: number) {
        statusCode = code;
        return this;
      },
      send(body: unknown) {
        responseBody = body;
        return this;
      },
    } as unknown as Response;

    const routerStack = adminRouter as unknown as RouterWithStack;
    const mwLayer = routerStack.stack.find((layer) => !layer.route && typeof layer.handle === "function");
    assert.ok(mwLayer && mwLayer.handle, "requireAdmin middleware should be mounted");

    let nextCalled = false;
    mwLayer.handle(req, res, () => {
      nextCalled = true;
    });

    assert.strictEqual(nextCalled, false);
    assert.ok(statusCode === 401 || statusCode === 503);
    assert.ok(hasErrorProp(responseBody));
    assert.ok(responseBody.error);
  });

  await t.test("GET /admin/storage/health handler executes and returns storage health status", async () => {
    const routerStack = adminRouter as unknown as RouterWithStack;
    const healthRoute = routerStack.stack.find((layer) => layer.route?.path === "/admin/storage/health");
    assert.ok(healthRoute?.route?.stack?.[0]?.handle, "Health route handler must exist");

    const origFind = DriveConnection.find;
    const mockFind = () => ({
      lean: () => Promise.resolve([]),
    });
    (DriveConnection as unknown as { find: unknown }).find = mockFind;

    try {
      let responseBody: unknown = null;
      const req = {
        header: () => "test-admin",
      } as unknown as Request;
      const res = {
        send(body: unknown) {
          responseBody = body;
          return this;
        },
      } as unknown as Response;

      await healthRoute.route.stack[0].handle(req, res, () => {});

      assert.ok(hasHealthProps(responseBody), "Response must have healthy, g3Status, and driveStatus");
      assert.strictEqual(typeof responseBody.healthy, "boolean");
      assert.ok(["healthy", "auth_failed", "no_accounts", "unconfigured", "unreachable"].includes(responseBody.g3Status));
      assert.ok(["healthy", "auth_failed", "no_connections", "unreachable"].includes(responseBody.driveStatus));
    } finally {
      DriveConnection.find = origFind;
    }
  });

  await t.test("POST /admin/storage/revoke-all handler executes and returns purge confirmation", async () => {
    const routerStack = adminRouter as unknown as RouterWithStack;
    const revokeRoute = routerStack.stack.find((layer) => layer.route?.path === "/admin/storage/revoke-all");
    assert.ok(revokeRoute?.route?.stack?.[0]?.handle, "Revoke route handler must exist");

    const origFind = DriveConnection.find;
    const origDeleteMany = DriveConnection.deleteMany;
    (DriveConnection as unknown as { find: unknown }).find = () => Promise.resolve([]);
    (DriveConnection as unknown as { deleteMany: unknown }).deleteMany = () => Promise.resolve({ deletedCount: 0 });

    try {
      let responseBody: unknown = null;
      let statusCode = 200;
      const req = {
        header: () => "test-admin",
      } as unknown as Request;
      const res = {
        status(code: number) {
          statusCode = code;
          return this;
        },
        send(body: unknown) {
          responseBody = body;
          return this;
        },
      } as unknown as Response;

      await revokeRoute.route.stack[0].handle(req, res, () => {});

      assert.strictEqual(statusCode, 200);
      assert.ok(hasOkProp(responseBody));
      assert.strictEqual(responseBody.ok, true);
    } finally {
      DriveConnection.find = origFind;
      DriveConnection.deleteMany = origDeleteMany;
    }
  });
});
