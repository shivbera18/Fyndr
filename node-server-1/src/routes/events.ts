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
            const userCheck = await User.findById(created_id);
            if (userCheck) {
                const files = req.files as Express.Multer.File[] | undefined;
                const uploadedFile = files && files.length > 0 ? files[0] : (req.file || null);
                const event = new Event({
                    event_name: String(event_name).trim(),
                    pin: pin ? String(pin).trim() : '123456',
                    created_id,
                    event_photo: uploadedFile ? uploadedFile.filename : null
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
        const result = await Photo.find({ event_id: _id }).sort({ createdAt: -1 });
        resp.status(200).send(result || []);
    } catch (error: any) {
        resp.status(500).send({ result: "An error occurred while retrieving images", error: error.message });
    }
});


//---------------------------------------------------------------------------------------------------------

router.put("/events/:id", async (req: Request, res: Response) => {
    const { id } = req.params; // Extract event ID from URL params
    const { updateName, updatePin, folders, selectionLimit, selectionLocked, requireLead } = req.body || {};
    const event_name = updateName ?? req.body?.event_name;
    const pin = updatePin ?? req.body?.pin;
    try {
        const set: Record<string, unknown> = {};
        if (event_name !== undefined) set.event_name = event_name;
        if (pin !== undefined) set.pin = pin;
        // ponytail: capped inline sanitize, separate folder route if this grows
        if (folders !== undefined) {
            if (!Array.isArray(folders)) return res.status(400).json({ message: "folders must be an array." });
            const rawNames: unknown[] = folders.map((f: unknown) => {
                if (typeof f === "string") return f;
                if (f && typeof f === "object" && "name" in f) return f.name;
                return undefined;
            });
            const names = rawNames
                .filter((n: unknown): n is string => typeof n === "string")
                .map((n: string) => n.trim().slice(0, 60))
                .filter(Boolean)
                .slice(0, 20);
            const seen = new Set<string>();
            set.folders = names.filter((n) => (seen.has(n.toLowerCase()) ? false : (seen.add(n.toLowerCase()), true))).map((name) => ({ name }));
        }
        if (selectionLimit !== undefined) {
            const n = Number(selectionLimit);
            if (!Number.isInteger(n) || n < 0 || n > 100000) return res.status(400).json({ message: "selectionLimit must be an integer 0-100000." });
            set.selectionLimit = n;
        }
        if (selectionLocked !== undefined) set.selectionLocked = Boolean(selectionLocked);
        if (requireLead !== undefined) set.requireLead = Boolean(requireLead);
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

        // Success response
        res.status(200).json({ message: "Event updated successfully.", updatedEvent });
    } catch (error: any) {
        logger.error("Error updating event:", error);
        res.status(500).json({ message: "Internal server error.", error: error.message });
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
