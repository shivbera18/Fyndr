import assert from "node:assert";
import test from "node:test";
import type { Request, Response } from "express";
import adminRouter from "../admin";

interface RouteLayer {
  route?: {
    path?: string;
    methods?: Record<string, boolean>;
  };
  handle?: (req: Request, res: Response, next: () => void) => void;
}

interface RouterWithStack {
  stack: RouteLayer[];
}

function hasErrorProp(val: unknown): val is { error: unknown } {
  return typeof val === "object" && val !== null && "error" in val;
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
});
