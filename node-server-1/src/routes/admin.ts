import crypto from "crypto";
import { Router, type NextFunction, type Request, type Response } from "express";
import axios from "axios";
import User from "../models/User";
import Event from "../models/Event";
import Photo from "../models/Photo";
import DriveConnection from "../models/DriveConnection";
import { Job, retryFailed } from "../queue/mongoQueue";
import { decryptRefreshToken } from "../utils/driveCrypto";
import { ADMIN_PASSWORD, GOOGLE_DRIVE_CLIENT_ID, GOOGLE_DRIVE_CLIENT_SECRET } from "../config";
import logger from "../utils/logger";
import { probeStorage, hasR2 } from "../utils/r2";

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
router.post("/admin/g3/callback", async (req: Request, res: Response) => {
  const { code, state } = req.body as { code?: string; state?: string };
  if (!code || !state) return res.status(400).send({ error: "code and state required" });
  const h = await g3headers();
  if (!h) return res.status(503).send({ error: "G3 not configured" });

  try {
    const cookieHeader = `${h.Cookie || ""}; g3_oauth_state=${encodeURIComponent(state)}`;
    const r = await axios.get(
      `${G3_URL}/api/accounts/callback?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}`,
      {
        headers: { Cookie: cookieHeader },
        timeout: 20000,
        maxRedirects: 0,
        validateStatus: () => true,
      }
    );
    const loc = r.headers.location || "";
    if (r.status === 302 && loc.includes("error")) {
      logger.error("G3 callback exchange failed", { location: loc });
      return res.status(502).send({ error: `G3 OAuth exchange error: ${loc}` });
    }
    res.send({ ok: true, message: "Google Drive connected to G3 pool successfully" });
  } catch (e: unknown) {
    logger.error("Admin G3 callback proxy failed", { error: (e as Error).message });
    res.status(502).send({ error: "Failed to forward OAuth callback to G3" });
  }
});

router.use("/admin", requireAdmin);

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
    res.status(500).send({ error: "internal error" });
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
    res.status(500).send({ error: "internal error" });
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
    res.status(500).send({ error: "internal error" });
  }
});

router.post("/admin/drive/disconnect", async (req: Request, res: Response) => {
  const { userId } = req.body as { userId?: string };
  if (typeof userId !== "string" || !userId) return res.status(400).send({ error: "userId required" });
  try {
    const doc = await DriveConnection.findOne({ userId });
    if (doc) {
      try {
        // ponytail: token in POST body, not the URL — revoke URLs land in logs.
        const token = decryptRefreshToken(doc.refreshTokenEnc);
        await axios.post(
          "https://oauth2.googleapis.com/revoke",
          new URLSearchParams({ token }).toString(),
          {
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            timeout: 10000,
            validateStatus: () => true,
          }
        );
      } catch {
        // revocation failure still deletes the doc
      }
      await DriveConnection.deleteOne({ userId });
    }
    res.send({ disconnected: true });
  } catch (e: unknown) {
    logger.error("Admin drive disconnect failed", { error: (e as Error).message, stack: (e as Error).stack });
    res.status(500).send({ error: "internal error" });
  }
});

router.get("/admin/queue", async (_req: Request, res: Response) => {
  try {
    const failed = await Job.find({ status: "failed" }).sort({ updatedAt: -1 }).limit(100).lean();
    res.send({ failed });
  } catch (e: unknown) {
    logger.error("Admin queue list failed", { error: (e as Error).message, stack: (e as Error).stack });
    res.status(500).send({ error: "internal error" });
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
    res.status(500).send({ error: "internal error" });
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
export interface StorageAccount {
  id: string;
  email: string;
  status: string;
  storageLimit: number;
  storageUsage: number;
}

router.get("/admin/storage/health", async (_req: Request, res: Response) => {
  let g3Status: "healthy" | "auth_failed" | "no_accounts" | "unconfigured" | "unreachable" = "unconfigured";
  let g3Error: string | undefined;
  let g3Accounts: StorageAccount[] = [];

  if (!G3_USER || !G3_PASS || !hasR2()) {
    g3Status = "unconfigured";
  } else {
    const h = await g3headers();
    if (!h) {
      g3Status = "unreachable";
      g3Error = "G3 service unreachable or operator login failed";
    } else {
      try {
        const accRes = await g3get<unknown>(`${G3_URL}/api/accounts`, h);
        let rawList: unknown[] = [];
        if (Array.isArray(accRes.data)) {
          rawList = accRes.data;
        } else if (
          accRes.data &&
          typeof accRes.data === "object" &&
          "accounts" in accRes.data &&
          Array.isArray((accRes.data as { accounts: unknown[] }).accounts)
        ) {
          rawList = (accRes.data as { accounts: unknown[] }).accounts;
        }

        g3Accounts = rawList.map((item) => {
          const a = (typeof item === "object" && item !== null ? item : {}) as Record<string, unknown>;
          return {
            id: String(a.id || a._id || ""),
            email: String(a.email || ""),
            status: String(a.status || ""),
            storageLimit: Number(a.storageLimit ?? a.storage_limit ?? 0),
            storageUsage: Number(a.storageUsage ?? a.storage_usage ?? 0),
          };
        });

        if (g3Accounts.length === 0) {
          g3Status = "no_accounts";
        } else {
          const probe = await probeStorage();
          if (probe.ok) {
            g3Status = "healthy";
          } else {
            const errStr = (probe.error || "").toLowerCase();
            const isAuthFailure =
              errStr.includes("invalid_grant") ||
              errStr.includes("invalid_token") ||
              errStr.includes("unauthorized") ||
              errStr.includes("oauth");
            if (isAuthFailure) {
              g3Status = "auth_failed";
              g3Error = "invalid_grant: Google OAuth token expired or revoked. Re-linking required.";
            } else {
              g3Status = "unreachable";
              g3Error = probe.error || "Storage probe failed";
            }
          }
        }
      } catch (e: unknown) {
        const msg = (e as Error).message || "";
        g3Status = msg.toLowerCase().includes("invalid_grant") ? "auth_failed" : "unreachable";
        g3Error = msg || "Failed to query G3 accounts";
      }
    }
  }

  let driveStatus: "healthy" | "auth_failed" | "no_connections" | "unreachable" = "no_connections";
  let driveError: string | undefined;
  let driveCount = 0;

  try {
    const conns = await DriveConnection.find({}).lean();
    driveCount = conns.length;
    if (driveCount === 0) {
      driveStatus = "no_connections";
    } else {
      let anyFailed = false;
      let failMsg = "";
      let verifiedCount = 0;
      let lastServerError = "";
      const sample = conns.slice(0, 5);
      const testPromises = sample.map(async (c) => {
        try {
          const token = decryptRefreshToken(c.refreshTokenEnc);
          const r = await axios.post(
            "https://oauth2.googleapis.com/token",
            new URLSearchParams({
              client_id: GOOGLE_DRIVE_CLIENT_ID,
              client_secret: GOOGLE_DRIVE_CLIENT_SECRET,
              refresh_token: token,
              grant_type: "refresh_token",
            }).toString(),
            {
              headers: { "Content-Type": "application/x-www-form-urlencoded" },
              timeout: 10000,
              validateStatus: () => true,
            }
          );
          if (r.status === 200) {
            verifiedCount++;
          } else if (r.status === 400 || r.status === 401) {
            anyFailed = true;
            const d = r.data as { error?: string; error_description?: string } | undefined;
            const isInvalidGrant =
              d?.error === "invalid_grant" ||
              (typeof d === "object" && d !== null && JSON.stringify(d).includes("invalid_grant"));
            failMsg = isInvalidGrant
              ? "invalid_grant: Google Drive token expired. Re-linking required."
              : (d?.error_description || d?.error || `HTTP ${r.status}`);
          } else {
            lastServerError = `Google OAuth endpoint returned HTTP ${r.status}`;
            logger.warn("Drive token validation endpoint non-200", { status: r.status });
          }
        } catch (err: unknown) {
          lastServerError = (err as Error).message || "Drive connection token request failed";
          logger.warn("Drive connection token test error", { error: (err as Error).message });
        }
      });
      await Promise.allSettled(testPromises);

      if (anyFailed) {
        driveStatus = "auth_failed";
        driveError = failMsg;
      } else if (verifiedCount > 0) {
        driveStatus = "healthy";
      } else {
        driveStatus = "unreachable";
        driveError = lastServerError || "Unable to verify Drive connection tokens";
      }
    }
  } catch (e: unknown) {
    logger.error("Admin drive health check failed", { error: (e as Error).message });
    driveStatus = "unreachable";
    driveError = (e as Error).message;
  }

  const healthy =
    (g3Status === "healthy" || driveStatus === "healthy") &&
    g3Status !== "auth_failed" &&
    driveStatus !== "auth_failed";
  res.send({
    healthy,
    g3Status,
    ...(g3Error ? { g3Error } : {}),
    g3Accounts,
    driveStatus,
    ...(driveError ? { driveError } : {}),
    driveCount,
  });
});

router.post("/admin/storage/revoke-all", async (_req: Request, res: Response) => {
  try {
    const conns = await DriveConnection.find({});
    const driveRevokePromises = conns.map(async (c) => {
      try {
        const token = decryptRefreshToken(c.refreshTokenEnc);
        await axios.post(
          "https://oauth2.googleapis.com/revoke",
          new URLSearchParams({ token }).toString(),
          {
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            timeout: 10000,
            validateStatus: () => true,
          }
        );
      } catch (e: unknown) {
        logger.warn("Drive token revoke failed (ignoring)", { error: (e as Error).message });
      }
    });
    await Promise.allSettled(driveRevokePromises);
    const deleteDriveRes = await DriveConnection.deleteMany({});
    const revokedDriveConnections = deleteDriveRes.deletedCount ?? conns.length;

    let revokedG3Accounts = 0;
    const h = await g3headers();
    if (h) {
      try {
        const accRes = await g3get<unknown>(`${G3_URL}/api/accounts`, h);
        let rawList: unknown[] = [];
        if (Array.isArray(accRes.data)) {
          rawList = accRes.data;
        } else if (
          accRes.data &&
          typeof accRes.data === "object" &&
          "accounts" in accRes.data &&
          Array.isArray((accRes.data as { accounts: unknown[] }).accounts)
        ) {
          rawList = (accRes.data as { accounts: unknown[] }).accounts;
        }

        const g3DeletePromises = rawList.map(async (item) => {
          const acc = (typeof item === "object" && item !== null ? item : {}) as Record<string, unknown>;
          const id = String(acc.id || acc._id || "");
          if (id && G3_ID.test(id)) {
            try {
              const delRes = await axios.delete(`${G3_URL}/api/accounts/${id}`, {
                headers: h,
                timeout: 15000,
                validateStatus: () => true,
              });
              if (delRes.status >= 200 && delRes.status < 300) {
                revokedG3Accounts++;
              } else {
                logger.warn("G3 account delete returned error status", { id, status: delRes.status });
              }
            } catch (e: unknown) {
              logger.warn("G3 account delete failed", { id, error: (e as Error).message });
            }
          }
        });
        await Promise.allSettled(g3DeletePromises);
      } catch (e: unknown) {
        logger.warn("G3 accounts fetch for revoke failed", { error: (e as Error).message });
      }
      g3cookie = "";
      g3cookieAt = 0;
    }

    res.send({
      ok: true,
      revokedDriveConnections,
      revokedG3Accounts,
      message: "All Google Drive credentials revoked and purged. Re-authentication required.",
    });
  } catch (e: unknown) {
    logger.error("Admin storage revoke-all failed", { error: (e as Error).message });
    res.status(500).send({ error: "Failed to revoke storage credentials" });
  }
});
export default router;
