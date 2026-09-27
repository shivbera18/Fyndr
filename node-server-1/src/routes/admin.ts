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
// (OAuth, weights, balancing); this surface just drives it with the
// operator's G3 session cookie. No G3 creds stored in Fyndr.
// Raw set-cookie parse (no jar dep); G3_DEV=true keeps it plain-HTTP.
const G3_URL = (process.env.G3_URL || "http://127.0.0.1:8787").replace(/\/$/, "");
const G3_USER = process.env.G3_ADMIN_EMAIL || "";
const G3_PASS = process.env.G3_ADMIN_PASSWORD || "";
let g3cookie = "";
let g3cookieAt = 0;
async function g3headers(): Promise<Record<string, string> | null> {
  if (!G3_USER || !G3_PASS) return null;
  if (!g3cookie || Date.now() - g3cookieAt > 20 * 60 * 1000) {
    try {
      const r = await axios.post(
        `${G3_URL}/api/auth/login`,
        { email: G3_USER, password: G3_PASS },
        { timeout: 15000, maxRedirects: 0 }
      );
      const setCookies = r.headers["set-cookie"];
      const raw = Array.isArray(setCookies) ? setCookies.join("; ") : String(setCookies || "");
      const match = raw.match(/[^;]*session[^=]*=[^;]+/i) || raw.match(/[^;\s]+=[^;]+/);
      if (!match) return null;
      g3cookie = String(match[0]).split(";")[0] as string;
      g3cookieAt = Date.now();
    } catch {
      return null;
    }
  }
  return { Cookie: g3cookie };
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

router.use(requireAdmin);

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
// G3 pool: linked Drive accounts + balancing + connect URL, proxied with the
// operator session. 503 when G3 creds unset, 502 when G3 unreachable.
router.get("/admin/g3/pool", async (_req: Request, res: Response) => {
  const h = await g3headers();
  if (!h) return res.status(503).send({ error: "G3 not configured (set G3_URL/G3_ADMIN_EMAIL/G3_ADMIN_PASSWORD)" });
  try {
    const [accounts, balancing] = await Promise.all([
      axios.get(`${G3_URL}/api/accounts`, { headers: h, timeout: 15000 }),
      axios.get(`${G3_URL}/api/settings/balancing`, { headers: h, timeout: 15000 }).catch(() => null),
    ]);
    res.send({ accounts: accounts.data, balancing: balancing?.data ?? null });
  } catch (e: unknown) {
    logger.error("Admin G3 pool failed", { error: (e as Error).message });
    res.status(502).send({ error: "G3 unreachable" });
  }
});
// OAuth start: returns the Google consent URL (open in a new tab, then the
// G3 panel callback persists the account into the pool).
router.get("/admin/g3/connect-url", async (_req: Request, res: Response) => {
  const h = await g3headers();
  if (!h) return res.status(503).send({ error: "G3 not configured (set G3_URL/G3_ADMIN_EMAIL/G3_ADMIN_PASSWORD)" });
  try {
    const r = await axios.get(`${G3_URL}/api/accounts/connect`, {
      headers: h, timeout: 15000, maxRedirects: 0,
      validateStatus: (s) => s === 302 || (s >= 200 && s < 300),
    });
    const loc = r.headers.location || (r.data && (r.data as { url?: string }).url);
    if (!loc) return res.status(502).send({ error: "G3 gave no consent URL" });
    res.send({ url: loc });
  } catch (e: unknown) {
    logger.error("Admin G3 connect failed", { error: (e as Error).message });
    res.status(502).send({ error: "G3 unreachable" });
  }
});
router.patch("/admin/g3/accounts/:id", async (req: Request, res: Response) => {
  const h = await g3headers();
  if (!h) return res.status(503).send({ error: "G3 not configured (set G3_URL/G3_ADMIN_EMAIL/G3_ADMIN_PASSWORD)" });
  const weight = (req.body as { weight?: unknown }).weight;
  if (typeof weight !== "number" || !Number.isInteger(weight) || weight < 0 || weight > 100)
    return res.status(400).send({ error: "weight must be an integer 0-100" });
  try {
    await axios.patch(`${G3_URL}/api/accounts/${req.params.id}`, { weight }, { headers: h, timeout: 15000 });
    res.send({ ok: true });
  } catch (e: unknown) {
    logger.error("Admin G3 weight failed", { error: (e as Error).message });
    res.status(502).send({ error: "G3 unreachable" });
  }
});
router.delete("/admin/g3/accounts/:id", async (req: Request, res: Response) => {
  const h = await g3headers();
  if (!h) return res.status(503).send({ error: "G3 not configured (set G3_URL/G3_ADMIN_EMAIL/G3_ADMIN_PASSWORD)" });
  try {
    await axios.delete(`${G3_URL}/api/accounts/${req.params.id}`, { headers: h, timeout: 15000 });
    res.send({ ok: true });
  } catch (e: unknown) {
    logger.error("Admin G3 unlink failed", { error: (e as Error).message });
    res.status(502).send({ error: "G3 unreachable" });
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
    logger.error("Admin G3 balancing failed", { error: (e as Error).message });
    res.status(502).send({ error: "G3 unreachable" });
  }
});

export default router;
