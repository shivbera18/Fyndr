import { Router, Request, Response } from "express";
import mongoose from "mongoose";
import Event from "../models/Event";
import Studio from "../models/Studio";
import logger from "../utils/logger";

const router = Router();

router.post("/collect_event", async (req: Request, resp: Response) => {
  try {
    if (!req.body._id || req.body._id.length !== 24) {
      return resp.status(400).send({ message: "Event link is not Correct" });
    }

    const { _id } = req.body;
    const objectId = new mongoose.Types.ObjectId(_id);

    // Find the event by its ID
    const event: any = await Event.findById(objectId);

    if (event) {
      const studio = await Studio.findOne({ create_by: event.created_id }).select("-create_by");

      event.pin = 1; // Update the pin field
      // Owner id must never reach guests: PUT /events/:id ownership check depends on it staying photographer-known
      const eventObj: Record<string, unknown> = event.toObject();
      delete eventObj.created_id;

      if (studio) {
        resp.status(200).send({ event: eventObj, studio });
      } else {
        resp.status(200).send({ event: eventObj });
      }
    } else {
      resp.status(404).send({ message: "Event not found or deleted!" });
    }
  } catch (error) {
    logger.error("Error retrieving events:", error);
    resp.status(500).send({ message: "An error occurred while retrieving events" });
  }
});

router.post("/confirm_pin", async (req: Request, resp: Response) => {
  try {
    const { _id, pin } = req.body;
    if (_id) {
      // Convert _id to ObjectId if necessary
      const objectId = new mongoose.Types.ObjectId(_id);

      // Query the database to find the event by _id
      const event: any = await Event.findById(objectId).select("pin");

      if (event) {
        if (event.pin == pin) {
          resp.status(200).send({ result: "Pin confirmed", pin: event.pin });
        } else {
          resp.status(404).send({ result: "Pin is wrong! Contact the photographer to provide the correct (Pin)" });
        }
      } else {
        resp.status(404).send({ result: "Event not found. Please check the Event ID." });
      }
    } else {
      resp.status(400).send({ result: "Event ID is required." });
    }
  } catch (error: any) {
    logger.error("Server Error:", error);
    // Send a more specific error response to the client
    resp.status(500).send({
      result: "An error occurred on the server!",
      error: error.message, // Include the actual error message (for debugging)
    });
  }
});

export default router;
