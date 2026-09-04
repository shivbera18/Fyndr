import type { NextFunction, Request, Response } from "express";
import { httpRequests } from "../metrics";

// Prometheus request counter. Prefer the matched route label and fall back
// to a redacted path to avoid cardinality explosion (same as before).
export function metricsMiddleware(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();
  const origEnd = res.end;
  res.end = function (this: Response, ...args: unknown[]) {
    // Prefer matched route, fallback to path without query/id to avoid cardinality explosion
    let route = "unknown";
    if (req.route && req.route.path) route = String(req.route.path);
    else if (req.path) route = req.path.replace(/\/[a-f0-9]{24}/gi, "/:id").split("?")[0] || "unknown";
    const elapsed = (Date.now() - start) / 1000;
    void elapsed;
    try {
      httpRequests.inc({ method: req.method, route, status: res.statusCode });
    } catch {
      /* label errors must never break responses */
    }
    // Optionally observe via uploadDuration/faceSearchDuration elsewhere; keep generic timing available
    return (origEnd as (...a: unknown[]) => Response).apply(this, args);
  } as typeof res.end;
  next();
}
