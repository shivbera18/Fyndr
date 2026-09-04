import { Router, Request, Response } from "express";
import mongoose from "mongoose";
import Event from "../models/Event";
import GuestAccess from "../models/GuestAccess";
import AnalyticsEvent from "../models/AnalyticsEvent";
import logger from "../utils/logger";

const router = Router();

function parseUserAgent(ua: string = "", clientDevice?: string): { type: string; os: string; browser: string } {
  const uaLower = ua.toLowerCase();
  let os = "Unknown";
  if (/iphone|ipad|ipod/.test(uaLower)) os = "iOS";
  else if (/android/.test(uaLower)) os = "Android";
  else if (/windows nt|windows/.test(uaLower)) os = "Windows";
  else if (/macintosh|mac os x/.test(uaLower)) os = "Mac";
  else if (/linux/.test(uaLower)) os = "Linux";

  let browser = "Unknown";
  if (/edg\//.test(uaLower)) browser = "Edge";
  else if (/opr\/|opera/.test(uaLower)) browser = "Opera";
  else if (/chrome|crios/.test(uaLower)) browser = "Chrome";
  else if (/firefox|fxios/.test(uaLower)) browser = "Firefox";
  else if (/safari/.test(uaLower) && !/chrome|crios/.test(uaLower)) browser = "Safari";

  let type = clientDevice || "desktop";
  if (!clientDevice) {
    if (/tablet|ipad/.test(uaLower)) type = "tablet";
    else if (/mobile|iphone|android/.test(uaLower)) type = "mobile";
    else type = "desktop";
  }

  return { type, os, browser };
}

function getClientIp(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") {
    return forwarded.split(",")[0].trim();
  }
  if (Array.isArray(forwarded) && forwarded.length > 0) {
    return forwarded[0].trim();
  }
  return req.socket.remoteAddress || "";
}

function escapeCsv(val: any): string {
  if (val === null || val === undefined) return "";
  const str = String(val);
  if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

// 1. POST /api/analytics/access-attempt
router.post("/access-attempt", async (req: Request, res: Response) => {
  try {
    const { eventId, name, phone, pin, sessionId, deviceInfo } = req.body || {};

    if (!eventId) {
      return res.status(400).json({ ok: false, verified: false, message: "Event ID is required" });
    }

    let event: any = null;
    if (mongoose.Types.ObjectId.isValid(eventId)) {
      event = await Event.findById(eventId);
    }
    if (!event) {
      return res.status(404).json({ ok: false, verified: false, message: "Event not found" });
    }

    const cleanPin = String(pin || "").trim();
    const isMatch = String(event.pin || "").trim() === cleanPin;

    const ua = (req.headers["user-agent"] as string) || "";
    const clientIp = getClientIp(req);
    const parsedUa = parseUserAgent(ua, deviceInfo?.type);
    const device = {
      type: deviceInfo?.type || parsedUa.type,
      os: deviceInfo?.os || parsedUa.os,
      browser: deviceInfo?.browser || parsedUa.browser,
    };

    const cleanName = String(name || "").trim();
    const cleanPhone = String(phone || "").trim();
    const cleanSessionId = String(sessionId || "").trim() || new mongoose.Types.ObjectId().toString();

    // Look up existing guest by phone or sessionId within this event
    const queryConditions: any[] = [];
    if (cleanPhone) queryConditions.push({ guestPhone: cleanPhone });
    if (cleanSessionId) queryConditions.push({ sessionId: cleanSessionId });

    let guest: any = null;
    if (queryConditions.length > 0) {
      guest = await GuestAccess.findOne({
        eventId: String(eventId),
        $or: queryConditions,
      });
    }

    if (guest) {
      if (cleanName) guest.guestName = cleanName;
      if (cleanPhone) guest.guestPhone = cleanPhone;
      guest.sessionId = cleanSessionId;
      guest.attempts = (guest.attempts || 0) + 1;
      guest.lastAttemptAt = new Date();
      guest.lastSeenAt = new Date();
      guest.ip = clientIp || guest.ip;
      guest.userAgent = ua || guest.userAgent;
      guest.device = device;
      if (isMatch) {
        guest.verified = true;
      } else {
        guest.failedAttempts = (guest.failedAttempts || 0) + 1;
      }
      await guest.save();
    } else {
      guest = await GuestAccess.create({
        eventId: String(eventId),
        guestName: cleanName || "Anonymous Guest",
        guestPhone: cleanPhone || "Not Provided",
        sessionId: cleanSessionId,
        attempts: 1,
        failedAttempts: isMatch ? 0 : 1,
        verified: isMatch,
        lastAttemptAt: new Date(),
        firstSeenAt: new Date(),
        lastSeenAt: new Date(),
        ip: clientIp,
        userAgent: ua,
        device,
        downloads: [],
      });
    }

    // Log AnalyticsEvent
    await AnalyticsEvent.create({
      eventId: String(eventId),
      guestAccessId: guest._id,
      sessionId: cleanSessionId,
      type: isMatch ? "pin_success" : "pin_failure",
      metadata: {
        pinAttempted: cleanPin,
        name: cleanName,
        phone: cleanPhone,
      },
      ip: clientIp,
      userAgent: ua,
      device,
      timestamp: new Date(),
    });

    return res.status(200).json({
      ok: isMatch,
      verified: isMatch,
      message: isMatch ? "PIN verified successfully" : "PIN is incorrect",
      guestId: guest._id.toString(),
      guestName: guest.guestName,
      guestPhone: guest.guestPhone,
    });
  } catch (error: any) {
    logger.error("Error in /access-attempt:", error);
    return res.status(500).json({ ok: false, verified: false, message: "Internal server error" });
  }
});

// 2. POST /api/analytics/track
router.post("/track", async (req: Request, res: Response) => {
  try {
    const { eventId, sessionId, guestId, type, metadata } = req.body || {};

    if (!eventId || !type) {
      return res.status(400).json({ ok: false, message: "eventId and type are required" });
    }

    const ua = (req.headers["user-agent"] as string) || "";
    const clientIp = getClientIp(req);
    const device = parseUserAgent(ua);
    const cleanSessionId = String(sessionId || "").trim() || new mongoose.Types.ObjectId().toString();

    let guestAccessObjId = undefined;
    if (guestId && mongoose.Types.ObjectId.isValid(String(guestId))) {
      guestAccessObjId = new mongoose.Types.ObjectId(String(guestId));
    }

    await AnalyticsEvent.create({
      eventId: String(eventId),
      guestAccessId: guestAccessObjId,
      sessionId: cleanSessionId,
      type,
      metadata: metadata || {},
      ip: clientIp,
      userAgent: ua,
      device,
      timestamp: new Date(),
    });

    // Update guest access counters if guestId is provided
    if (guestAccessObjId) {
      const updateDoc: any = {
        $set: { lastSeenAt: new Date() },
      };

      if (type === "photo_download") {
        updateDoc.$inc = { downloadsCount: 1 };
        updateDoc.$push = {
          downloads: {
            photoId: metadata?.photoId || "",
            photoName: metadata?.photoName || "",
            downloadedAt: new Date(),
          },
        };
      } else if (type === "photo_view") {
        updateDoc.$inc = { viewsCount: 1 };
      } else if (type === "selfie_search") {
        updateDoc.$inc = { searchesCount: 1 };
      }

      await GuestAccess.findByIdAndUpdate(guestAccessObjId, updateDoc);
    }

    return res.status(200).json({ ok: true });
  } catch (error: any) {
    logger.error("Error in /track:", error);
    return res.status(500).json({ ok: false, message: "Internal server error" });
  }
});

// 3. GET /api/analytics/event/:eventId/summary
router.get("/event/:eventId/summary", async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;
    if (!eventId) {
      return res.status(400).json({ message: "eventId is required" });
    }

    const eId = String(eventId);

    // Concurrently aggregate counts
    const [
      distinctSessions,
      uniqueGuests,
      verifiedGuests,
      guestSums,
      totalSearches,
      searchesWithMatches,
      totalDownloads,
      uniqueDownloadsRes,
      guestsWithDownloads,
    ] = await Promise.all([
      AnalyticsEvent.distinct("sessionId", { eventId: eId }),
      GuestAccess.countDocuments({ eventId: eId }),
      GuestAccess.countDocuments({ eventId: eId, verified: true }),
      GuestAccess.aggregate([
        { $match: { eventId: eId } },
        {
          $group: {
            _id: null,
            totalAttempts: { $sum: "$attempts" },
            failedAttempts: { $sum: "$failedAttempts" },
          },
        },
      ]),
      AnalyticsEvent.countDocuments({ eventId: eId, type: "selfie_search" }),
      AnalyticsEvent.countDocuments({
        eventId: eId,
        type: "selfie_search",
        "metadata.matchCount": { $gt: 0 },
      }),
      AnalyticsEvent.countDocuments({ eventId: eId, type: "photo_download" }),
      GuestAccess.aggregate([
        { $match: { eventId: eId } },
        { $unwind: "$downloads" },
        { $group: { _id: "$downloads.photoId" } },
        { $count: "count" },
      ]),
      GuestAccess.countDocuments({ eventId: eId, verified: true, downloadsCount: { $gt: 0 } }),
    ]);

    const totalVisitors = Math.max(distinctSessions.length, uniqueGuests);
    const totalAttempts = guestSums[0]?.totalAttempts || 0;
    const failedAttempts = guestSums[0]?.failedAttempts || 0;
    const uniquePhotosDownloaded = uniqueDownloadsRes[0]?.count || 0;

    const downloadConversionRate =
      verifiedGuests > 0 ? Math.round((guestsWithDownloads / verifiedGuests) * 1000) / 10 : 0;
    const searchSuccessRate =
      totalSearches > 0 ? Math.round((searchesWithMatches / totalSearches) * 1000) / 10 : 0;

    return res.status(200).json({
      totalVisitors,
      uniqueGuests,
      verifiedGuests,
      totalAttempts,
      failedAttempts,
      totalSearches,
      totalDownloads,
      uniquePhotosDownloaded,
      downloadConversionRate,
      searchSuccessRate,
    });
  } catch (error: any) {
    logger.error("Error in /summary:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// 4. GET /api/analytics/event/:eventId/guests
router.get("/event/:eventId/guests", async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;
    const { q, status, page = "1", limit = "50", sort = "-lastSeenAt" } = req.query;

    const query: any = { eventId: String(eventId) };

    if (status === "verified") {
      query.verified = true;
    } else if (status === "failed") {
      query.verified = false;
    }

    if (q && typeof q === "string" && q.trim()) {
      const searchRegex = new RegExp(q.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      query.$or = [{ guestName: searchRegex }, { guestPhone: searchRegex }];
    }

    const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
    const limitNum = Math.min(200, Math.max(1, parseInt(String(limit), 10) || 50));
    const skip = (pageNum - 1) * limitNum;

    const [guests, total] = await Promise.all([
      GuestAccess.find(query)
        .sort(String(sort))
        .skip(skip)
        .limit(limitNum)
        .lean(),
      GuestAccess.countDocuments(query),
    ]);

    return res.status(200).json({
      guests,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum) || 1,
    });
  } catch (error: any) {
    logger.error("Error in /guests:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// 5. GET /api/analytics/event/:eventId/export-csv
router.get("/event/:eventId/export-csv", async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;
    const eId = String(eventId);

    let eventName = "event";
    if (mongoose.Types.ObjectId.isValid(eId)) {
      const ev = await Event.findById(eId).select("event_name");
      if (ev?.event_name) eventName = ev.event_name.replace(/[^a-zA-Z0-9_-]/g, "_");
    }

    const guests = await GuestAccess.find({ eventId: eId }).sort("-createdAt").lean();

    const headers = [
      "Guest Name",
      "Phone Number",
      "Verified",
      "Total Attempts",
      "Failed Attempts",
      "Selfie Searches",
      "Photos Downloaded",
      "Device",
      "OS",
      "Browser",
      "First Seen",
      "Last Seen",
    ];

    const rows = guests.map((g: any) => [
      escapeCsv(g.guestName),
      escapeCsv(g.guestPhone),
      g.verified ? "Yes" : "No",
      g.attempts || 0,
      g.failedAttempts || 0,
      g.searchesCount || 0,
      g.downloadsCount || 0,
      escapeCsv(g.device?.type || "unknown"),
      escapeCsv(g.device?.os || "unknown"),
      escapeCsv(g.device?.browser || "unknown"),
      escapeCsv(g.firstSeenAt ? new Date(g.firstSeenAt).toISOString() : ""),
      escapeCsv(g.lastSeenAt ? new Date(g.lastSeenAt).toISOString() : ""),
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${eventName}_guest_leads.csv"`);
    return res.status(200).send(csvContent);
  } catch (error: any) {
    logger.error("Error in /export-csv:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// 6. GET /api/analytics/event/:eventId/activity
router.get("/event/:eventId/activity", async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;
    const activities = await AnalyticsEvent.find({ eventId: String(eventId) })
      .sort({ timestamp: -1 })
      .limit(50)
      .populate("guestAccessId", "guestName guestPhone verified")
      .lean();

    return res.status(200).json(activities);
  } catch (error: any) {
    logger.error("Error in /activity:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// 7. GET /api/analytics/event/:eventId/timeline
router.get("/event/:eventId/timeline", async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;

    const timeline = await AnalyticsEvent.aggregate([
      { $match: { eventId: String(eventId) } },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d %H:00", date: "$timestamp" },
          },
          views: { $sum: { $cond: [{ $eq: ["$type", "page_view"] }, 1, 0] } },
          searches: { $sum: { $cond: [{ $eq: ["$type", "selfie_search"] }, 1, 0] } },
          downloads: { $sum: { $cond: [{ $eq: ["$type", "photo_download"] }, 1, 0] } },
        },
      },
      { $sort: { _id: 1 } },
      {
        $project: {
          _id: 0,
          time: "$_id",
          views: 1,
          searches: 1,
          downloads: 1,
        },
      },
    ]);

    return res.status(200).json(timeline);
  } catch (error: any) {
    logger.error("Error in /timeline:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// 8. GET /api/analytics/studio/overview
router.get("/studio/overview", async (req: Request, res: Response) => {
  try {
    const userId = (req.query.userId || req.query.created_id || "") as string;
    if (!userId) {
      return res.status(400).json({ message: "userId or created_id is required" });
    }

    const events: any[] = await Event.find({ created_id: userId }).select("_id event_name createdAt").lean();
    const eventIds = events.map((e: any) => e._id.toString());
    const eventMap: Record<string, any> = {};
    for (const e of events) {
      eventMap[e._id.toString()] = e;
    }

    if (eventIds.length === 0) {
      return res.status(200).json({
        totalEvents: 0,
        totalGuests: 0,
        verifiedGuests: 0,
        totalDownloads: 0,
        topEvents: [],
        recentLeads: [],
      });
    }

    const [totalGuests, verifiedGuests, guestAggregates, recentLeadsRaw] = await Promise.all([
      GuestAccess.countDocuments({ eventId: { $in: eventIds } }),
      GuestAccess.countDocuments({ eventId: { $in: eventIds }, verified: true }),
      GuestAccess.aggregate([
        { $match: { eventId: { $in: eventIds } } },
        {
          $group: {
            _id: "$eventId",
            guestsCount: { $sum: 1 },
            verifiedCount: { $sum: { $cond: ["$verified", 1, 0] } },
            downloadsCount: { $sum: "$downloadsCount" },
            searchesCount: { $sum: "$searchesCount" },
          },
        },
        { $sort: { guestsCount: -1 } },
      ]),
      GuestAccess.find({ eventId: { $in: eventIds } })
        .sort({ lastSeenAt: -1 })
        .limit(20)
        .lean(),
    ]);

    let totalDownloads = 0;
    const topEvents = guestAggregates.slice(0, 5).map((agg: any) => {
      totalDownloads += agg.downloadsCount || 0;
      const ev = eventMap[agg._id];
      return {
        eventId: agg._id,
        eventName: ev?.event_name || "Unnamed Event",
        guestsCount: agg.guestsCount || 0,
        verifiedCount: agg.verifiedCount || 0,
        downloadsCount: agg.downloadsCount || 0,
        searchesCount: agg.searchesCount || 0,
      };
    });

    // Compute totalDownloads across all events, not just top 5
    const allDownloadsSum = guestAggregates.reduce((acc: number, item: any) => acc + (item.downloadsCount || 0), 0);

    const recentLeads = recentLeadsRaw.map((g: any) => {
      const ev = eventMap[g.eventId];
      return {
        ...g,
        eventName: ev?.event_name || "Event",
      };
    });

    return res.status(200).json({
      totalEvents: events.length,
      totalGuests,
      verifiedGuests,
      totalDownloads: allDownloadsSum,
      topEvents,
      recentLeads,
    });
  } catch (error: any) {
    logger.error("Error in /studio/overview:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// 9. GET /api/analytics/studio/export-leads
router.get("/studio/export-leads", async (req: Request, res: Response) => {
  try {
    const userId = (req.query.userId || req.query.created_id || "") as string;
    if (!userId) {
      return res.status(400).json({ message: "userId or created_id is required" });
    }

    const events: any[] = await Event.find({ created_id: userId }).select("_id event_name").lean();
    const eventIds = events.map((e: any) => e._id.toString());
    const eventMap: Record<string, string> = {};
    for (const e of events) {
      eventMap[e._id.toString()] = e.event_name;
    }

    const guests = await GuestAccess.find({ eventId: { $in: eventIds } })
      .sort("-createdAt")
      .lean();

    const headers = [
      "Event Name",
      "Guest Name",
      "Phone Number",
      "Verified",
      "Total Attempts",
      "Failed Attempts",
      "Selfie Searches",
      "Photos Downloaded",
      "Device",
      "OS",
      "Browser",
      "First Seen",
      "Last Seen",
    ];

    const rows = guests.map((g: any) => [
      escapeCsv(eventMap[g.eventId] || "Event"),
      escapeCsv(g.guestName),
      escapeCsv(g.guestPhone),
      g.verified ? "Yes" : "No",
      g.attempts || 0,
      g.failedAttempts || 0,
      g.searchesCount || 0,
      g.downloadsCount || 0,
      escapeCsv(g.device?.type || "unknown"),
      escapeCsv(g.device?.os || "unknown"),
      escapeCsv(g.device?.browser || "unknown"),
      escapeCsv(g.firstSeenAt ? new Date(g.firstSeenAt).toISOString() : ""),
      escapeCsv(g.lastSeenAt ? new Date(g.lastSeenAt).toISOString() : ""),
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="studio_guest_leads.csv"`);
    return res.status(200).send(csvContent);
  } catch (error: any) {
    logger.error("Error in /studio/export-leads:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

export default router;
