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

export default router;
