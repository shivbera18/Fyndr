import { Router, Request, Response, NextFunction } from "express";
import fs from "fs";
import path from "path";
import Studio from "../models/Studio";
import logger from "../utils/logger";
import { EVENT_PROFILE_DIR } from "../config";
import { eventProfileUpload } from "../middleware/upload";

const router = Router();

router.post("/studio", async (req: Request, resp: Response) => {
  const { studio_name, phone_no, address, offer, description, create_by, logoUrl, logoUpdatedAt } = req.body;

  if (create_by && studio_name && phone_no) {
    try {
      // Check if the record exists
      const existingStudio = await Studio.findOne({ create_by: create_by });

      if (existingStudio) {
        // Logo removed client-side (null/empty logoUrl): unlink the orphan file.
        if ((logoUrl === null || logoUrl === "") && existingStudio.logoUrl) {
          await fs.promises.unlink(path.join(EVENT_PROFILE_DIR, path.basename(existingStudio.logoUrl))).catch(() => {});
        }
        // Update existing record
        const updatedStudio = await Studio.findOneAndUpdate(
          { create_by: create_by },
          { studio_name, phone_no, address, offer, description, ...(logoUrl !== undefined ? { logoUrl } : {}), ...(logoUpdatedAt !== undefined ? { logoUpdatedAt } : {}) },
          { new: true }
        );
        if (updatedStudio) {
          return resp.status(200).send({ message: "Updated your details!", updatedStudio });
        } else {
          return resp.status(404).send({ message: "Failed to update your details!" });
        }
      } else {
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
router.post(
  "/studio/logo",
  (req: Request, res: Response, next: NextFunction) => {
    eventProfileUpload.single("logo")(req, res, (err: unknown) => {
      if (err) return res.status(400).send({ message: err instanceof Error ? err.message : "logo upload failed" });
      next();
    });
  },
  async (req: Request, res: Response) => {
    const file = req.file;
    if (!file) return res.status(400).send({ message: "logo file required" });
    if (!LOGO_MIMES[file.mimetype] || file.size > 2 * 1024 * 1024) {
      await fs.promises.unlink(file.path).catch(() => {});
      return res.status(400).send({ message: "logo must be png/jpeg/webp under 2MB" });
    }
    const create_by = typeof req.body.create_by === "string" ? req.body.create_by : "";
    if (!create_by) {
      await fs.promises.unlink(file.path).catch(() => {});
      return res.status(400).send({ message: "create_by required" });
    }
    const logoUrl = `/event_profile/${file.filename}`;
    try {
      const prev = await Studio.findOne({ create_by }).select("logoUrl");
      await Studio.findOneAndUpdate({ create_by }, { logoUrl, logoUpdatedAt: new Date() }, { upsert: true });
      if (prev?.logoUrl && prev.logoUrl !== logoUrl) {
        await fs.promises.unlink(path.join(EVENT_PROFILE_DIR, path.basename(prev.logoUrl))).catch(() => {});
      }
    } catch (e) {
      await fs.promises.unlink(file.path).catch(() => {});
      logger.warn("[studio] logo persist failed", { error: e instanceof Error ? e.message : String(e) });
      return res.status(500).send({ message: "failed to save logo" });
    }
    return res.status(200).send({ logoUrl, logoUpdatedAt: new Date().toISOString() });
  },
);

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
