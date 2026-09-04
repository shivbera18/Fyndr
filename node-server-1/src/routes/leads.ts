import { Router, type Request, type Response } from "express";
import mongoose from "mongoose";
import Event from "../models/Event";
import Lead from "../models/Lead";
import logger from "../utils/logger";

const router = Router();

// P0: guest lead capture — validated PII with 24h double-submit dedupe, 180d TTL
router.post("/leads", async (req: Request, res: Response) => {
  try {
    const body: unknown = req.body || {};
    const event_id: unknown = body && typeof body === "object" && "event_id" in body ? body.event_id : undefined;
    const name: unknown = body && typeof body === "object" && "name" in body ? body.name : undefined;
    const phone: unknown = body && typeof body === "object" && "phone" in body ? body.phone : undefined;
    const rawFound: unknown =
      body && typeof body === "object" && "photos_found" in body ? body.photos_found : undefined;
    if (typeof event_id !== "string" || !mongoose.Types.ObjectId.isValid(event_id)) {
      return res.status(400).send({ error: "event_id required" });
    }
    if (typeof name !== "string" || name.trim().length === 0 || name.trim().length > 100) {
      return res.status(400).send({ error: "name must be 1-100 characters" });
    }
    if (typeof phone !== "string" || !/^[+\d][\d\s\-()]{3,18}[\d]$/.test(phone.trim())) {
      return res.status(400).send({ error: "phone number looks invalid" });
    }
    let photos_found = 0;
    if (rawFound !== undefined) {
      const n = Number(rawFound);
      if (!Number.isInteger(n) || n < 0 || n > 1000000) {
        return res.status(400).send({ error: "photos_found must be a whole number" });
      }
      photos_found = n;
    }
    const event = await Event.findById(event_id).select("_id created_id");
    if (!event) return res.status(404).send({ error: "event not found" });
    const cleanPhone = phone.trim();
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const existing = await Lead.findOne({ event_id, phone: cleanPhone, createdAt: { $gt: since } });
    if (existing) return res.status(200).send({ deduped: true, lead: existing });
    const lead = new Lead({
      event_id,
      photographer_id: event.created_id,
      name: name.trim(),
      phone: cleanPhone,
      photos_found,
    });
    await lead.save();
    return res.status(201).send({ deduped: false, lead });
  } catch {
    logger.error("Error saving lead");
    return res.status(500).send({ error: "Internal server error" });
  }
});

// P0: owner-only lead list (JSON — CSV is built client-side)
router.post("/events/:id/leads", async (req: Request, res: Response) => {
  const { id } = req.params;
  if (typeof id !== "string" || !mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: "Invalid event ID." });
  }
  try {
    const body: unknown = req.body || {};
    const caller: unknown = body && typeof body === "object" && "created_id" in body ? body.created_id : undefined;
    const event = await Event.findById(id).select("_id created_id");
    if (!event) return res.status(404).json({ message: "Event not found." });
    if (typeof caller !== "string" || caller !== event.created_id) {
      return res.status(403).json({ message: "Only the event owner can view leads." });
    }
    const leads = await Lead.find({ event_id: id }).select("name phone photos_found createdAt").sort({ createdAt: -1 }).limit(1000);
    return res.status(200).json({ leads });
  } catch {
    logger.error("Error listing leads");
    return res.status(500).json({ message: "Internal server error." });
  }
});

export default router;
