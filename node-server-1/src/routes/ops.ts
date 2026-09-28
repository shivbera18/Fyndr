import { Router, Request, Response } from "express";
import mongoose from "mongoose";
import { promClient } from "../metrics";
import { stats as queueStats, listFailed, retryFailed } from "../queue/mongoQueue";
import logger from "../utils/logger";

const router = Router();

// P2: Prometheus metrics (no auth needed, scrape interval 15s)
router.get("/metrics", async (_req: Request, res: Response) => {
  try {
    res.set("Content-Type", promClient.register.contentType);
    res.end(await promClient.register.metrics());
  } catch (e: any) {
    logger.error("Metrics failed", { error: e.message, stack: e.stack });
    res.status(500).send(String(e.message));
  }
});

// P2: queue stats per event + DLQ helpers
router.get("/queue/stats", async (req: Request, res: Response) => {
  const { event_id } = req.query;
  if (!event_id) return res.status(400).send({ error: "event_id required" });
  if (!mongoose.Types.ObjectId.isValid(event_id as string))
    return res.status(400).send({ error: "invalid event_id" });
  try {
    res.send(await queueStats(event_id as string));
  } catch (e: any) {
    logger.error("Queue stats failed", { error: e.message, stack: e.stack, event_id });
    res.status(500).send({ error: "internal error" });
  }
});

router.get("/queue/failed", async (req: Request, res: Response) => {
  const { event_id, limit } = req.query;
  if (!event_id) return res.status(400).send({ error: "event_id required" });
  if (!mongoose.Types.ObjectId.isValid(event_id as string))
    return res.status(400).send({ error: "invalid event_id" });
  let lim = parseInt(limit as string, 10);
  if (Number.isNaN(lim) || lim <= 0) lim = 20;
  lim = Math.min(Math.max(lim, 1), 100);
  try {
    res.send(await listFailed(event_id as string, lim));
  } catch (e: any) {
    logger.error("Queue failed list", { error: e.message, stack: e.stack, event_id });
    res.status(500).send({ error: "internal error" });
  }
});

router.post("/queue/retry", async (req: Request, res: Response) => {
  const { event_id, photo_hash } = req.body;
  if (!event_id) return res.status(400).send({ error: "event_id required" });
  if (!mongoose.Types.ObjectId.isValid(event_id)) return res.status(400).send({ error: "invalid event_id" });
  if (photo_hash && (typeof photo_hash !== "string" || photo_hash.length !== 64))
    return res.status(400).send({ error: "invalid photo_hash (expect sha256 hex)" });
  try {
    const r: any = await retryFailed(event_id, photo_hash);
    res.send({ ok: true, modified: r.modifiedCount || r.matchedCount || 0 });
  } catch (e: any) {
    logger.error("Queue retry failed", { error: e.message, stack: e.stack, event_id });
    res.status(500).send({ error: "internal error" });
  }
});


export default router;
