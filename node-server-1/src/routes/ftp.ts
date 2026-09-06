import { Router, type Request, type Response } from "express";
import { execFile } from "child_process";
import mongoose from "mongoose";
import Event from "../models/Event";
import logger from "../utils/logger";
import { subscribeLive } from "../ftp/live";
import { buildUsername, generatePassword, isValidTag, isValidUsername, sha256hex } from "../ftp/credentials";

const router = Router();

const MAX_LOGINS = 5; // shooters a-e
const FTP_HOST = process.env.FTP_HOST || null; // e.g. ftp.fyndr.in — unset until VPS setup lands
const FTP_PORT = Number(process.env.FTP_PORT || 21);
const FTP_SCRIPT = process.env.FTP_USER_SCRIPT || null; // root-owned helper, VPS only (see scripts/ftp-user.sh)

// Explicit shape of the Event.ftp.logins subdocuments (avoids InferSchemaType friction).
interface FtpLogin {
  tag: string;
  username: string;
  passwordHash: string;
  createdAt?: Date;
  lastSeenAt?: Date | null;
  bytesIn?: number;
  allowPlain?: boolean;
}

type OwnedEvent = { _id: mongoose.Types.ObjectId; created_id?: string; ftp?: { enabled: boolean; skipped?: number; failed?: number; logins: FtpLogin[] } };

// Best-effort system-user provisioning. Resolves true when vsftpd knows the
// login; false on local dev / Windows where the helper doesn't exist — the
// Mongo login is still created so the API stays testable everywhere.
function provision(action: "add" | "passwd" | "del", username: string, password?: string): Promise<boolean> {
  if (!FTP_SCRIPT) return Promise.resolve(false);
  return new Promise((resolve) => {
    const child = execFile("sudo", [FTP_SCRIPT, action, username], { timeout: 15000 }, (err: Error | null) => {
      if (err) {
        logger.error("[ftp] provision failed", { action, username, error: err.message });
        resolve(false);
      } else {
        resolve(true);
      }
    });
    // Password via stdin — never argv (visible in ps).
    if (password && child.stdin) {
      child.stdin.write(password);
      child.stdin.end();
    }
  });
}

function badId(res: Response, id: unknown): boolean {
  if (typeof id !== "string" || !mongoose.Types.ObjectId.isValid(id)) {
    res.status(400).json({ message: "Invalid event ID." });
    return true;
  }
  return false;
}

async function ownedEvent(
  id: string,
  caller: unknown
): Promise<{ error: string; status: number } | { event: OwnedEvent }> {
  const event = (await Event.findById(id).select("_id created_id ftp")) as unknown as OwnedEvent | null;
  if (!event) return { error: "Event not found.", status: 404 };
  if (typeof caller !== "string" || caller !== event.created_id) {
    return { error: "Only the event owner can manage camera upload.", status: 403 };
  }
  return { event };
}

const callerOf = (body: unknown): unknown =>
  body && typeof body === "object" && "created_id" in body ? body.created_id : undefined;

// Public connection info — no secrets. Null host = VPS FTP not set up yet.
function connInfo() {
  return { host: FTP_HOST, port: FTP_PORT, tls: "explicit" as const };
}

//---------------------------------------------------------------------------------------------------
// POST /events/:id/ftp/enable — create shooter logins { created_id, shooters?: 1-5 }
// Returns plaintext passwords ONCE. Subsequent reads never include them.
router.post("/events/:id/ftp/enable", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (badId(res, id)) return;
    const body: unknown = req.body || {};
    const found = await ownedEvent(id as string, callerOf(body));
    if ("error" in found) return res.status(found.status).json({ message: found.error });
    const { event } = found;

    // Idempotency guard: credentials are shown once — a retry/double-click must
    // never mint duplicate tags sharing one username (rotate uses positional $).
    if ((event.ftp?.logins || []).length > 0) {
      return res.status(409).json({ message: "Camera upload already enabled — use /logins to add shooters." });
    }
    const rawShooters = body && typeof body === "object" && "shooters" in body ? body.shooters : undefined;
    const shooters = rawShooters === undefined ? 1 : Number(rawShooters);
    if (!Number.isInteger(shooters) || shooters < 1 || shooters > MAX_LOGINS) {
      return res.status(400).json({ message: `shooters must be an integer 1-${MAX_LOGINS}.` });
    }

    const tags = ["a", "b", "c", "d", "e"].slice(0, shooters);
    const logins: { tag: string; username: string; password: string }[] = [];
    let provisioned = true;
    event.ftp ??= { enabled: false, logins: [] };
    for (const tag of tags) {
      const username = buildUsername(event._id.toString(), tag);
      if (!isValidUsername(username)) return res.status(500).json({ message: "Internal server error" });
      const password = generatePassword();
      event.ftp.logins.push({ tag, username, passwordHash: sha256hex(password) });
      logins.push({ tag, username, password });
      if (!(await provision("add", username, password))) provisioned = false;
    }
    event.ftp.enabled = true;
    await Event.findByIdAndUpdate(event._id, { $set: { ftp: event.ftp } });
    if (FTP_SCRIPT && !provisioned) {
      // Server is configured but provisioning broke: roll back rather than hand out dead credentials.
      // (Safe: enable 409s whenever logins already exist, so this only clears what we just added.)
      await Event.findByIdAndUpdate(event._id, { $set: { "ftp.enabled": false, "ftp.logins": [] } });
      return res.status(502).json({ message: "Camera server provisioning failed. Check FTP_USER_SCRIPT and sudo on the server." });
    }
    return res.status(200).json({ ...connInfo(), provisioned, logins });
  } catch {
    logger.error("[ftp] enable error");
    return res.status(500).json({ message: "Internal server error" });
  }
});

//---------------------------------------------------------------------------------------------------
// POST /events/:id/ftp/logins — add one shooter { created_id, tag?: a-e }
router.post("/events/:id/ftp/logins", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (badId(res, id)) return;
    const body: unknown = req.body || {};
    const found = await ownedEvent(id as string, callerOf(body));
    if ("error" in found) return res.status(found.status).json({ message: found.error });
    const { event } = found;

    event.ftp ??= { enabled: false, logins: [] };
    const rawTag: unknown = body && typeof body === "object" && "tag" in body ? body.tag : undefined;
    const used = new Set(event.ftp.logins.map((l) => l.tag));
    const tag: unknown = rawTag === undefined ? ["a", "b", "c", "d", "e"].find((t) => !used.has(t)) : rawTag;
    if (!isValidTag(tag)) return res.status(400).json({ message: "tag must be one of a-e." });
    if (used.has(tag)) return res.status(409).json({ message: `Login ${tag} already exists.` });
    if (event.ftp.logins.length >= MAX_LOGINS) {
      return res.status(409).json({ message: `Maximum ${MAX_LOGINS} shooter logins per event.` });
    }

    const username = buildUsername(event._id.toString(), tag);
    const password = generatePassword();
    event.ftp.logins.push({ tag, username, passwordHash: sha256hex(password) });
    event.ftp.enabled = true;
    await Event.findByIdAndUpdate(event._id, { $set: { ftp: event.ftp } });
    const provisioned = await provision("add", username, password);
    if (FTP_SCRIPT && !provisioned) {
      await Event.findOneAndUpdate({ _id: event._id }, { $pull: { "ftp.logins": { username } } });
      return res.status(502).json({ message: "Camera server provisioning failed. Check FTP_USER_SCRIPT and sudo on the server." });
    }
    return res.status(200).json({ ...connInfo(), provisioned, tag, username, password });
  } catch {
    logger.error("[ftp] add login error");
    return res.status(500).json({ message: "Internal server error" });
  }
});

//---------------------------------------------------------------------------------------------------
// POST /events/:id/ftp/logins/rotate — new password { created_id, username }
router.post("/events/:id/ftp/logins/rotate", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (badId(res, id)) return;
    const body: unknown = req.body || {};
    const found = await ownedEvent(id as string, callerOf(body));
    if ("error" in found) return res.status(found.status).json({ message: found.error });
    const { event } = found;

    const rawUser = body && typeof body === "object" && "username" in body ? body.username : undefined;
    if (!isValidUsername(rawUser)) return res.status(400).json({ message: "username is not a valid camera login." });
    const login = (event.ftp?.logins || []).find((l) => l.username === rawUser);
    if (!login) return res.status(404).json({ message: "Login not found for this event." });

    const password = generatePassword();
    const oldHash = login.passwordHash;
    await Event.findOneAndUpdate(
      { _id: event._id, "ftp.logins.username": rawUser },
      { $set: { "ftp.logins.$.passwordHash": sha256hex(password) } }
    );
    const provisioned = await provision("passwd", rawUser, password);
    if (FTP_SCRIPT && !provisioned) {
      // Restore the previous hash: the camera's old password is still the live one.
      await Event.findOneAndUpdate(
        { _id: event._id, "ftp.logins.username": rawUser },
        { $set: { "ftp.logins.$.passwordHash": oldHash } }
      );
      return res.status(502).json({ message: "Camera server provisioning failed. Check FTP_USER_SCRIPT and sudo on the server." });
    }
    return res.status(200).json({ provisioned, username: rawUser, password });
  } catch {
    logger.error("[ftp] rotate error");
    return res.status(500).json({ message: "Internal server error" });
  }
});

//---------------------------------------------------------------------------------------------------
// DELETE /events/:id/ftp/logins — revoke { created_id, username }
router.delete("/events/:id/ftp/logins", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (badId(res, id)) return;
    const body: unknown = req.body || {};
    const found = await ownedEvent(id as string, callerOf(body));
    if ("error" in found) return res.status(found.status).json({ message: found.error });
    const { event } = found;

    const rawUser = body && typeof body === "object" && "username" in body ? body.username : undefined;
    if (!isValidUsername(rawUser)) return res.status(400).json({ message: "username is not a valid camera login." });
    const updated = await Event.findOneAndUpdate(
      { _id: event._id, "ftp.logins.username": rawUser },
      { $pull: { "ftp.logins": { username: rawUser } } },
      { new: true }
    ).select("_id");
    if (!updated) return res.status(404).json({ message: "Login not found for this event." });
    await provision("del", rawUser);
    return res.status(200).json({ revoked: rawUser });
  } catch {
    logger.error("[ftp] revoke error");
    return res.status(500).json({ message: "Internal server error" });
  }
});

//---------------------------------------------------------------------------------------------------
// GET /events/:id/ftp/status?created_id= — dashboard LIVE card. Never includes secrets.
router.get("/events/:id/ftp/status", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (badId(res, id)) return;
    const found = await ownedEvent(id as string, req.query.created_id);
    if ("error" in found) return res.status(found.status).json({ message: found.error });
    const { event } = found;
    return res.status(200).json({
      ...connInfo(),
      enabled: event.ftp?.enabled ?? false,
      skipped: event.ftp?.skipped ?? 0,
      failed: event.ftp?.failed ?? 0,
      logins: (event.ftp?.logins || []).map((l) => ({
        tag: l.tag,
        username: l.username,
        lastSeenAt: l.lastSeenAt ?? null,
        bytesIn: l.bytesIn ?? 0,
      })),
    });
  } catch {
    logger.error("[ftp] status error");
    return res.status(500).json({ message: "Internal server error" });
  }
});

//---------------------------------------------------------------------------------------------------
// GET /events/:id/live?pin= — SSE stream of ingest events (photo.created + keepalive).
// PIN-gated like the selection gallery: 404 on wrong PIN reveals nothing about existence.
router.get("/events/:id/live", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (badId(res, id)) return;
    const pin = typeof req.query.pin === "string" ? req.query.pin : undefined;
    const event = await Event.findById(id).select("_id pin").catch(() => null);
    if (!event) return res.status(404).json({ message: "Event not found." });
    if (typeof pin !== "string" || event.pin !== pin) {
      return res.status(404).json({ message: "Pin is wrong! Contact the photographer to provide the correct (Pin)" });
    }
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });
    res.write(`event: ingest.heartbeat\ndata: {"ok":true}\n\n`);
    const off = subscribeLive(id as string, (type, data) => {
      try {
        res.write(`event: ${type}\ndata: ${JSON.stringify(data)}\n\n`);
      } catch {
        // Dead socket — close handler below cleans up.
      }
    });
    const beat = setInterval(() => {
      try {
        res.write(`: ping\n\n`);
      } catch {
        // Dead socket — close handler below cleans up.
      }
    }, 15000);
    req.on("close", () => {
      clearInterval(beat);
      off();
    });
  } catch {
    logger.error("[ftp] live error");
    if (!res.headersSent) return res.status(500).json({ message: "Internal server error" });
  }
});

export default router;
