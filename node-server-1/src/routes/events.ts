import { Router, type Request, type Response } from "express";
import mongoose from "mongoose";
import axios from "axios";
import fs from "fs";
import path from "path";
import { EVENT_PROFILE_DIR, FLASK_URL, UPLOAD_DIR } from "../config";
import User from "../models/User";
import Event from "../models/Event";
import Photo from "../models/Photo";
import { Job } from "../queue/mongoQueue";
import logger from "../utils/logger";
import { deleteObject } from "../utils/r2";
import { eventProfileUpload } from "../middleware/upload";

const router = Router();

router.post("/event", eventProfileUpload.any(), async (req: Request, resp: Response) => {
    const { event_name, created_id, pin } = req.body || {};
    if (event_name && created_id) {
        try {
            const createBody: unknown = req.body || {};
            const rawFolders: unknown =
                createBody && typeof createBody === "object" && "folders" in createBody ? createBody.folders : undefined;
            const rawLimit: unknown =
                createBody && typeof createBody === "object" && "selectionLimit" in createBody
                    ? createBody.selectionLimit
                    : undefined;
            let folders: { name: string }[] | undefined;
            if (rawFolders !== undefined) {
                const parsed = sanitizeFolders(rawFolders);
                if (!parsed.ok) return resp.status(400).send({ result: parsed.error });
                folders = parsed.folders;
            }
            let selectionLimit = 0;
            if (rawLimit !== undefined) {
                const n = Number(rawLimit);
                if (!Number.isInteger(n) || n < 0 || n > 100000) {
                    return resp.status(400).send({ result: "selectionLimit must be an integer 0-100000." });
                }
                selectionLimit = n;
            }
            const userCheck = await User.findById(created_id);
            if (userCheck) {
                const files = req.files as Express.Multer.File[] | undefined;
                const uploadedFile = files && files.length > 0 ? files[0] : (req.file || null);
                const event = new Event({
                    event_name: String(event_name).trim(),
                    pin: pin ? String(pin).trim() : '123456',
                    created_id,
                    event_photo: uploadedFile ? uploadedFile.filename : null,
                    ...(folders !== undefined ? { folders } : {}),
                    selectionLimit,
                });

                const result = await event.save();
                if (result) {
                    const { event_name: eName, _id, event_photo } = result;
                    resp.status(200).send({ event_name: eName, _id, event_photo, pin: result.pin });
                } else {
                    resp.status(500).send({ result: "Failed to create event" });
                }
            } else {
                resp.status(404).send({ result: "User account is not valid or not available" });
            }
        } catch (error: any) {
            resp.status(500).send({ result: "An error occurred", error: error.message });
        }
    } else {
        resp.status(400).send({ result: "Event name and created_id are required" });
    }
});


//-------------------------------------------------------------------------------------------------------------------

router.post("/display_event", async (req: Request, resp: Response) => {
    try {
        const { userId } = req.body || {};
        if (userId) {
            const events = await Event.find({ created_id: userId }).sort({ createdAt: -1 });
            resp.status(200).send(events || []);
        } else {
            resp.status(400).send({ message: "User ID is required" });
        }
    } catch (error: any) {
        logger.error("Error retrieving events:", error);
        resp.status(500).send({ message: "An error occurred while retrieving events" });
    }
});

router.post('/in-event', async (req: Request, resp: Response) => {
    const { _id } = req.body || {};
    if (!_id) {
        return resp.status(400).send({ result: "Event ID is required" });
    }

    try {
        // Guest-visible gallery: project out owner-equivalent ids (upload_by) + embedding/hash ballast.
        // PUT /events/:id ownership check depends on created_id staying photographer-known.
        const result = await Photo.find({ event_id: _id })
            .select("_id name folder_name isSelected createdAt")
            .sort({ createdAt: -1 });
        resp.status(200).send(result || []);
    } catch (error: any) {
        resp.status(500).send({ result: "An error occurred while retrieving images", error: error.message });
    }
});


// P0: shared folder sanitize for POST /event + PUT /events/:id
type FoldersResult = { ok: true; folders: { name: string }[] } | { ok: false; error: string };
const sanitizeFolders = (input: unknown): FoldersResult => {
    // Multipart text fields arrive as strings — accept a JSON-stringified array too
    if (typeof input === "string") {
        try {
            input = JSON.parse(input);
        } catch {
            return { ok: false, error: "folders must be an array." };
        }
    }
    if (!Array.isArray(input)) return { ok: false, error: "folders must be an array." };
    const rawNames: unknown[] = input.map((f: unknown) => {
        if (typeof f === "string") return f;
        if (f && typeof f === "object" && "name" in f) return f.name;
        return undefined;
    });
    const names = rawNames
        .filter((n: unknown): n is string => typeof n === "string")
        .map((n) => n.trim().slice(0, 60))
        .filter((n) => n.length > 0);
    if (input.length > 0 && names.length === 0) return { ok: false, error: "folders has no valid names." };
    if (names.length > 20) return { ok: false, error: "folders limited to 20." };
    const seen = new Set<string>();
    const deduped = names.filter((n) => {
        const k = n.toLowerCase();
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
    });
    return { ok: true, folders: deduped.map((name) => ({ name })) };
};

// Strict flag parse — Boolean("false") === true trap, so only bool + "true"/"false"
const parseFlag = (v: unknown): boolean | undefined => {
    if (typeof v === "boolean") return v;
    if (v === "true") return true;
    if (v === "false") return false;
    return undefined;
};

router.put("/events/:id", async (req: Request, res: Response) => {
    const { id } = req.params; // Extract event ID from URL params
    if (typeof id !== "string" || !mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ message: "Invalid event ID." });
    }
    try {
        const event = await Event.findById(id).select("_id created_id");
        if (!event) {
            return res.status(404).json({ message: "Event not found." });
        }
        // Owner-only: caller proves ownership with created_id (their user _id).
        // Guests never receive created_id (collect_event strips it), so a bare QR link can't mutate.
        // ponytail: shared-secret ownership per event — JWT session middleware if abuse appears.
        const body: unknown = req.body || {};
        const caller: unknown = body && typeof body === "object" && "created_id" in body ? body.created_id : undefined;
        if (typeof caller !== "string" || caller !== event.created_id) {
            return res.status(403).json({ message: "Only the event owner can update this event." });
        }
        const rawName: unknown =
            body && typeof body === "object" && "updateName" in body && body.updateName !== undefined
                ? body.updateName
                : body && typeof body === "object" && "event_name" in body
                  ? body.event_name
                  : undefined;
        const rawPin: unknown =
            body && typeof body === "object" && "updatePin" in body && body.updatePin !== undefined
                ? body.updatePin
                : body && typeof body === "object" && "pin" in body
                  ? body.pin
                  : undefined;
        const rawFolders: unknown = body && typeof body === "object" && "folders" in body ? body.folders : undefined;
        const rawLimit: unknown =
            body && typeof body === "object" && "selectionLimit" in body ? body.selectionLimit : undefined;
        const rawLocked: unknown =
            body && typeof body === "object" && "selectionLocked" in body ? body.selectionLocked : undefined;
        const set: Record<string, unknown> = {};
        if (rawName !== undefined) {
            if (typeof rawName !== "string" || rawName.trim().length === 0 || rawName.trim().length > 120) {
                return res.status(400).json({ message: "event_name must be 1-120 characters." });
            }
            set.event_name = rawName.trim();
        }
        if (rawPin !== undefined) {
            if (typeof rawPin !== "string" || rawPin.trim().length < 4 || rawPin.trim().length > 24) {
                return res.status(400).json({ message: "pin must be 4-24 characters." });
            }
            set.pin = rawPin.trim();
        }
        let nextFolders: { name: string }[] | undefined;
        if (rawFolders !== undefined) {
            const parsed = sanitizeFolders(rawFolders);
            if (!parsed.ok) return res.status(400).json({ message: parsed.error });
            nextFolders = parsed.folders;
            set.folders = parsed.folders;
        }
        if (rawLimit !== undefined) {
            const n = Number(rawLimit);
            if (!Number.isInteger(n) || n < 0 || n > 100000) return res.status(400).json({ message: "selectionLimit must be an integer 0-100000." });
            set.selectionLimit = n;
        }
        if (rawLocked !== undefined) {
            const flag = parseFlag(rawLocked);
            if (flag === undefined) return res.status(400).json({ message: "selectionLocked must be true or false." });
            set.selectionLocked = flag;
        }
        if (Object.keys(set).length === 0) {
            return res.status(400).json({ message: "Not Provide event_name or pin to update." });
        }

        // Update the event
        const updatedEvent = await Event.findByIdAndUpdate(
            id,
            { $set: set },
            { new: true, runValidators: true } // Return the updated document and run schema validators
        );

        if (!updatedEvent) {
            return res.status(404).json({ message: "Event not found." });
        }

        // Remap photos orphaned by a folder rename/delete back to General
        if (nextFolders !== undefined) {
            const kept = [...nextFolders.map((f) => f.name), "General"];
            await Photo.updateMany({ event_id: id, folder_name: { $nin: kept } }, { $set: { folder_name: "General" } });
        }

        // Success response
        res.status(200).json({ message: "Event updated successfully.", updatedEvent });
    } catch {
        logger.error("Error updating event");
        res.status(500).json({ message: "Internal server error." });
    }
});


//---------------------------------------------------------------------------------------------------

router.delete('/delete-event', async (req: Request, res: Response) => {
    try {
        const { _id } = req.body;
        if (!_id) return res.status(400).send({ message: "Event is Missing! Please Reload" });
        if (!mongoose.Types.ObjectId.isValid(_id)) return res.status(400).send({ message: "Invalid Event ID" });

        const event = await Event.findByIdAndDelete(new mongoose.Types.ObjectId(_id));
        if (!event) return res.status(404).send({ message: "Event not found! Reload the page." });

        if (event.event_photo) {
            const coverImage_path = path.join(EVENT_PROFILE_DIR, event.event_photo);
            fs.unlink(coverImage_path,(err)=>{
                if(err) logger.error(`failed to deleted cover image ${coverImage_path}`, err);
                else logger.info(`Deleted cover image ${coverImage_path}`);
            });
        }

        const photos = await Photo.find({ event_id: _id }).select('name _id');
        await Photo.deleteMany({ event_id: _id });
        // cleanup jobs + faiss
        try { await Job.deleteMany({ event_id: _id }); } catch(_){}
        try { await axios.post(`${FLASK_URL}/faiss_delete_event`, { event_id: _id }, { timeout: 5000 }); } catch(e: any){ logger.info('[faiss] delete_event failed', e.message); }

        photos.forEach((photo) => {
            const photoPath = path.join(UPLOAD_DIR, photo.name);
            fs.unlink(photoPath, (err) => {
                if (err) logger.error(`Failed to delete file: ${photoPath}`, err);
                else logger.info(`Deleted file: ${photoPath}`);
            });
            deleteObject(photo.name).catch(() => {});
        });

        return res.status(200).send(event);
    } catch (error: any) {
        logger.error("Error deleting event:", error);
        res.status(500).json({ success: false, message: "Error deleting Event!" });
    }
});

export default router;
