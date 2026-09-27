import crypto from "crypto";
import { Router, type NextFunction, type Request, type Response } from "express";
import axios from "axios";
import User from "../models/User";
import Event from "../models/Event";
import Photo from "../models/Photo";
import DriveConnection from "../models/DriveConnection";
import { Job, retryFailed } from "../queue/mongoQueue";
import { decryptRefreshToken } from "../utils/driveCrypto";
import { ADMIN_PASSWORD } from "../config";
import logger from "../utils/logger";

// G3 pool admin proxy: the panel owns multi-account Drive linkage
// (OAuth, weights, balancing). Browser-facing design:
// - JSON endpoints use the operator session (server-side login).
// - OAuth connect/callback run in the OPERATOR'S browser with their own
//   G3 session cookie (login passthrough), so Google redirects back to a
//   reachable host and the state cookie survives. No G3 creds in Fyndr.
// Raw set-cookie parse (no jar dep); G3_DEV=true keeps it plain-HTTP.
const G3_URL = (process.env.G3_URL || "http://127.0.0.1:8787").replace(/\/$/, "");
const G3_USER = process.env.G3_ADMIN_EMAIL || "";
const G3_PASS = process.env.G3_ADMIN_PASSWORD || "";
let g3cookie = "";
let g3cookieAt = 0;
async function g3login(): Promise<boolean> {
  if (!G3_USER || !G3_PASS) return false;
  try {
    const r = await axios.post(
      `${G3_URL}/api/auth/login`,
      { email: G3_USER, password: G3_PASS },
      { timeout: 15000, maxRedirects: 0 }
    );
    const setCookies = r.headers["set-cookie"];
    const raw = Array.isArray(setCookies) ? setCookies.join("; ") : String(setCookies || "");
    const match = raw.match(/ribbon_session=[^;]+/i);
    if (!match) return false;
    g3cookie = match[0];
    g3cookieAt = Date.now();
    return true;
  } catch {
    return false;
  }
}
async function g3headers(): Promise<Record<string, string> | null> {
  if (!G3_USER || !G3_PASS) return null;
  if (!g3cookie || Date.now() - g3cookieAt > 20 * 60 * 1000) {
    if (!(await g3login())) return null;
  }
  return { Cookie: g3cookie };
}
// Retry once on 401 (revoked/rotated session): clear, re-login, replay.
async function g3get<T>(url: string, headers: Record<string, string>): Promise<{ data: T }> {
  try {
    const r = await axios.get<T>(url, { headers, timeout: 15000 });
    return { data: r.data };
  } catch (e: unknown) {
    if (axios.isAxiosError(e) && e.response?.status === 401) {
      g3cookie = "";
      const h = await g3headers();
      if (h) {
        const r = await axios.get<T>(url, { headers: h, timeout: 15000 });
        return { data: r.data };
      }
    }
    throw e;
  }
}
function g3status(e: unknown): { status: number; body: unknown } {
  if (axios.isAxiosError(e) && e.response) return { status: e.response.status, body: e.response.data };
  return { status: 502, body: { error: "G3 unreachable" } };
}

const router = Router();

function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!ADMIN_PASSWORD) return res.status(503).send({ error: "admin disabled" });
  const key = req.header("x-admin-key") || "";
  const a = Buffer.from(key);
  const b = Buffer.from(ADMIN_PASSWORD);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b))
    return res.status(401).send({ error: "unauthorized" });
  next();
}

router.get("/admin/overview", async (_req: Request, res: Response) => {
  try {
    const [users, events, photos, queuedJobs, failedJobs, driveConnections] = await Promise.all([
      User.countDocuments({}),
      Event.countDocuments({}),
      Photo.countDocuments({}),
      Job.countDocuments({ status: "queued" }),
      Job.countDocuments({ status: "failed" }),
      DriveConnection.countDocuments({}),
    ]);
    res.send({ users, events, photos, queuedJobs, failedJobs, driveConnections });
  } catch (e: unknown) {
    logger.error("Admin overview failed", { error: (e as Error).message, stack: (e as Error).stack });
    res.status(500).send({ error: (e as Error).message });
  }
});

router.get("/admin/users", async (_req: Request, res: Response) => {
  try {
    const [users, conns] = await Promise.all([
      User.find({}).select({ name: 1, email: 1, isVerified: 1, createdAt: 1 }).sort({ createdAt: -1 }).limit(500).lean(),
      DriveConnection.find({}).select({ userId: 1 }).lean(),
    ]);
    const connected: Record<string, true> = {};
    for (const c of conns) connected[String(c.userId)] = true;
    res.send({
      users: users.map((u) => ({
        _id: u._id,
        name: u.name,
        email: u.email,
        isVerified: u.isVerified,
        createdAt: u.createdAt,
        driveConnected: connected[String(u._id)] === true,
      })),
    });
  } catch (e: unknown) {
    logger.error("Admin users failed", { error: (e as Error).message, stack: (e as Error).stack });
    res.status(500).send({ error: (e as Error).message });
  }
});

router.get("/admin/drive", async (_req: Request, res: Response) => {
  try {
    const connections = await DriveConnection.find({})
      .select({ userId: 1, email: 1, folderId: 1, connectedAt: 1, updatedAt: 1 })
      .sort({ connectedAt: -1 })
      .lean();
    res.send({ totalConnections: connections.length, connections });
  } catch (e: unknown) {
    logger.error("Admin drive list failed", { error: (e as Error).message, stack: (e as Error).stack });
    res.status(500).send({ error: (e as Error).message });
  }
});

router.post("/admin/drive/disconnect", async (req: Request, res: Response) => {
  const { userId } = req.body as { userId?: string };
  if (!userId) return res.status(400).send({ error: "userId required" });
  try {
    const doc = await DriveConnection.findOne({ userId });
    if (doc) {
      try {
        await axios.post(`https://oauth2.googleapis.com/revoke?token=${decryptRefreshToken(doc.refreshTokenEnc)}`);
      } catch {
        // revocation failure still deletes the doc
      }
      await DriveConnection.deleteOne({ userId });
    }
    res.send({ disconnected: true });
  } catch (e: unknown) {
    logger.error("Admin drive disconnect failed", { error: (e as Error).message, stack: (e as Error).stack });
    res.status(500).send({ error: (e as Error).message });
  }
});

router.get("/admin/queue", async (_req: Request, res: Response) => {
  try {
    const failed = await Job.find({ status: "failed" }).sort({ updatedAt: -1 }).limit(100).lean();
    res.send({ failed });
  } catch (e: unknown) {
    logger.error("Admin queue list failed", { error: (e as Error).message, stack: (e as Error).stack });
    res.status(500).send({ error: (e as Error).message });
  }
});

router.post("/admin/queue/retry", async (req: Request, res: Response) => {
  const { event_id, photo_hash } = req.body as { event_id?: string; photo_hash?: string };
  try {
    if (photo_hash && (typeof photo_hash !== "string" || photo_hash.length !== 64))
      return res.status(400).send({ error: "invalid photo_hash (expect sha256 hex)" });
    if (event_id) {
      const r: { modifiedCount?: number; matchedCount?: number } = await retryFailed(event_id, photo_hash);
      return res.send({ ok: true, modified: r.modifiedCount || r.matchedCount || 0 });
    }
    const r: { modifiedCount?: number; matchedCount?: number } = await Job.updateMany({ status: "failed" }, { $set: { status: "queued", lastError: null } });
    res.send({ ok: true, modified: r.modifiedCount || 0 });
  } catch (e: unknown) {
    logger.error("Admin queue retry failed", { error: (e as Error).message, stack: (e as Error).stack });
    res.status(500).send({ error: (e as Error).message });
  }
});
// G3 pool: linked Drive accounts + balancing, proxied with the operator
// session. 503 when G3 creds unset; G3 status/body forwarded otherwise
// (401 clears the stale cookie and retries once after re-login).
router.get("/admin/g3/pool", async (_req: Request, res: Response) => {
  const h = await g3headers();
  if (!h) return res.status(503).send({ error: "G3 not configured (set G3_URL/G3_ADMIN_EMAIL/G3_ADMIN_PASSWORD)" });
  try {
    const [accounts, balancing] = await Promise.all([
      g3get<unknown>(`${G3_URL}/api/accounts`, h),
      g3get<unknown>(`${G3_URL}/api/settings/balancing`, h).catch(() => null),
    ]);
    res.send({ accounts: accounts.data, balancing: balancing?.data ?? null });
  } catch (e: unknown) {
    const s = g3status(e);
    logger.error("Admin G3 pool failed", { error: (e as Error).message, status: s.status });
    res.status(s.status).send(s.body);
  }
});
// OAuth start in the OPERATOR's browser: log them into G3 (sets their own
// session cookie), then send them to G3's connect endpoint so the state
// cookie + callback both live in the same browser. The G3 redirect URI
// must be reachable from that browser (SSH tunnel or public origin).
router.post("/admin/g3/login-passthrough", async (_req: Request, res: Response) => {
  if (!G3_USER || !G3_PASS) return res.status(503).send({ error: "G3 not configured (set G3_URL/G3_ADMIN_EMAIL/G3_ADMIN_PASSWORD)" });
  try {
    const r = await axios.post(
      `${G3_URL}/api/auth/login`,
      { email: G3_USER, password: G3_PASS },
      { timeout: 15000, maxRedirects: 0, validateStatus: () => true }
    );
    const sc = r.headers["set-cookie"];
    if (r.status !== 200 || !sc) return res.status(502).send({ error: "G3 login failed" });
    res.setHeader("set-cookie", sc);
    res.send({ ok: true });
  } catch (e: unknown) {
    logger.error("Admin G3 login passthrough failed", { error: (e as Error).message });
    res.status(502).send({ error: "G3 unreachable" });
  }
});
router.get("/admin/g3/connect-url", async (_req: Request, res: Response) => {
  const h = await g3headers();
  if (!h) return res.status(503).send({ error: "G3 not configured (set G3_URL/G3_ADMIN_EMAIL/G3_ADMIN_PASSWORD)" });
  try {
    const r = await axios.get(`${G3_URL}/api/accounts/connect`, {
      headers: h, timeout: 15000, maxRedirects: 0,
      validateStatus: (s) => s === 302 || (s >= 200 && s < 300),
    });
    const sc = r.headers["set-cookie"];
    const loc = r.headers.location || (r.data && (r.data as { url?: string }).url);
    if (!loc) {
      const s = g3status({ response: { status: r.status, data: r.data } });
      return res.status(s.status).send(s.body);
    }
    // State cookie must reach the operator browser for the callback check.
    if (sc) res.setHeader("set-cookie", sc);
    res.send({ url: loc });
  } catch (e: unknown) {
    const s = g3status(e);
    logger.error("Admin G3 connect failed", { error: (e as Error).message, status: s.status });
    res.status(s.status).send(s.body);
  }
});
const G3_ID = /^[0-9a-f]{24}$/i;
router.patch("/admin/g3/accounts/:id", async (req: Request, res: Response) => {
  const h = await g3headers();
  if (!h) return res.status(503).send({ error: "G3 not configured (set G3_URL/G3_ADMIN_EMAIL/G3_ADMIN_PASSWORD)" });
  if (!G3_ID.test(req.params.id)) return res.status(400).send({ error: "invalid id" });
  const weight = (req.body as { weight?: unknown }).weight;
  if (typeof weight !== "number" || !Number.isInteger(weight) || weight < 0)
    return res.status(400).send({ error: "weight must be an integer >= 0" });
  try {
    await axios.patch(`${G3_URL}/api/accounts/${req.params.id}`, { weight }, { headers: h, timeout: 15000 });
    res.send({ ok: true });
  } catch (e: unknown) {
    const s = g3status(e);
    logger.error("Admin G3 weight failed", { error: (e as Error).message, status: s.status });
    res.status(s.status).send(s.body);
  }
});
router.delete("/admin/g3/accounts/:id", async (req: Request, res: Response) => {
  const h = await g3headers();
  if (!h) return res.status(503).send({ error: "G3 not configured (set G3_URL/G3_ADMIN_EMAIL/G3_ADMIN_PASSWORD)" });
  if (!G3_ID.test(req.params.id)) return res.status(400).send({ error: "invalid id" });
  try {
    await axios.delete(`${G3_URL}/api/accounts/${req.params.id}`, { headers: h, timeout: 15000 });
    res.send({ ok: true });
  } catch (e: unknown) {
    const s = g3status(e);
    logger.error("Admin G3 unlink failed", { error: (e as Error).message, status: s.status });
    res.status(s.status).send(s.body);
  }
});
router.put("/admin/g3/balancing", async (req: Request, res: Response) => {
  const h = await g3headers();
  if (!h) return res.status(503).send({ error: "G3 not configured (set G3_URL/G3_ADMIN_EMAIL/G3_ADMIN_PASSWORD)" });
  const strategy = (req.body as { strategy?: unknown }).strategy;
  if (!["round_robin", "least_used", "fill_first", "hash"].includes(String(strategy)))
    return res.status(400).send({ error: "invalid strategy" });
  try {
    await axios.put(`${G3_URL}/api/settings/balancing`, { strategy }, { headers: h, timeout: 15000 });
    res.send({ ok: true });
  } catch (e: unknown) {
    const s = g3status(e);
    logger.error("Admin G3 balancing failed", { error: (e as Error).message, status: s.status });
    res.status(s.status).send(s.body);
  }
});
// No SPA proxy: G3's static export uses root-absolute /_next/* asset URLs
// (basePath ''), so serving it under /admin/g3/panel/* renders a blank
// page. The operator opens the G3 panel origin directly (SSH tunnel or
// ingress) after login-passthrough sets their browser session cookie.
router.get("/admin/g3/panel-info", async (_req: Request, res: Response) => {
  if (!G3_USER) return res.status(503).send({ error: "G3 not configured (set G3_URL/G3_ADMIN_EMAIL/G3_ADMIN_PASSWORD)" });
  res.send({ url: G3_URL });
});

export default router;
