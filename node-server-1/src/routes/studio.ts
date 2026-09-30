import { Router, Request, Response } from "express";
import fs from "fs";
import Studio from "../models/Studio";
import logger from "../utils/logger";
import { eventProfileUpload } from "../middleware/upload";

const router = Router();

router.post("/studio", async (req: Request, resp: Response) => {
  const { studio_name, phone_no, address, offer, description, create_by, logoUrl, logoUpdatedAt } = req.body;

  if (create_by && studio_name && phone_no) {
    try {
      // Check if the record exists
      const existingStudio = await Studio.findOne({ create_by: create_by });

      if (existingStudio) {
        // Update existing record
        const updatedStudio = await Studio.findOneAndUpdate(
          { create_by: create_by },
          { studio_name, phone_no, address, offer, description, ...(logoUrl !== undefined ? { logoUrl } : {}), ...(logoUpdatedAt !== undefined ? { logoUpdatedAt } : {}) },
          { new: true } // Return the updated document
        );

        if (updatedStudio) {
          return resp.status(200).send({ message: "Updated your details!", updatedStudio });
        } else {
          return resp.status(404).send({ message: "Failed to update your details!" });
        }
      } else {
        // Create a new record
        const studio = new Studio(req.body);
        const result = await studio.save();

        if (result) {
          return resp.status(200).send({ message: "Saved your details!", studio: result });
        } else {
          return resp.status(404).send({ message: "Failed to save your details!" });
        }
      }
    } catch (error: any) {
      if (error.code === 11000 && error.keyPattern?.create_by) {
        resp.status(400).send({ message: "Studio detail already exists" });
      } else {
        resp.status(500).send({ message: "An unexpected error occurred" });
      }
    }
  } else {
    return resp.status(400).send({ message: "Studio name, Phone No, and Created By are required" });
  }
});

// ponytail: logo rides the existing event_profile static mount
// (/event_profile/<file>); 2MB png/jpeg/webp only, old logo kept on 400.
const LOGO_MIMES: Record<string, true> = { "image/png": true, "image/jpeg": true, "image/webp": true };
router.post("/studio/logo", eventProfileUpload.single("logo"), async (req: Request, res: Response) => {
  const file = req.file;
  if (!file) return res.status(400).send({ message: "logo file required" });
  if (!LOGO_MIMES[file.mimetype] || file.size > 2 * 1024 * 1024) {
    await fs.promises.unlink(file.path).catch(() => {});
    return res.status(400).send({ message: "logo must be png/jpeg/webp under 2MB" });
  }
  return res.status(200).send({ logoUrl: `/event_profile/${file.filename}`, logoUpdatedAt: new Date().toISOString() });
});

router.post("/find_studio", async (req: Request, res: Response) => {
  try {
    const { create_by } = req.body || {};
    if (!create_by) return res.status(400).send({ message: "create_by parameter is required" });
    const studio = await Studio.findOne({ create_by });
    if (studio) {
      return res.status(200).send(studio);
    }
    return res.status(200).send({});
  } catch (error) {
    logger.error("[find_studio]", error);
    return res.status(500).send({ message: "An unexpected error occurred" });
  }
});

router.get("/exist-studio", async (req: Request, res: Response) => {
  try {
    const { create_by } = req.query; // Use query for GET request parameters
    if (create_by) {
      const exist = await Studio.findOne({ create_by });

      if (exist) {
        return res.status(200).send({ message: "Detail is available", exist });
      } else {
        return res.status(404).send({ message: "Detail not present" });
      }
    } else {
      return res.status(400).send({ message: "create_by parameter is required" });
    }
  } catch (error) {
    logger.error(error);
    return res.status(500).send({ message: "An unexpected error occurred" });
  }
});

export default router;
