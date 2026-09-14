import multer from "multer";
import cors from "cors";
import express, { type NextFunction, type Request, type Response } from "express";
import "./db";
import { CORS_ORIGIN, EVENT_PROFILE_DIR, UPLOAD_DIR, corsOrigins } from "./config";
import { metricsMiddleware } from "./middleware/metricsMiddleware";
import logger from "./utils/logger";
import authRouter from "./routes/auth";
import eventsRouter from "./routes/events";
import guestRouter from "./routes/guest";
import leadsRouter from "./routes/leads";
import opsRouter from "./routes/ops";
import photosRouter from "./routes/photos";
import studioRouter from "./routes/studio";
import analyticsRouter from "./routes/analytics";
import ftpRouter from "./routes/ftp";
import musicRouter from "./routes/music";

export function createApp(): express.Express {
  const app = express();

  app.use(express.json());
  app.use(cors({ origin: corsOrigins(), credentials: CORS_ORIGIN !== "*" }));
  app.use(metricsMiddleware);

  app.use("/uploads", express.static(UPLOAD_DIR));
  app.use("/event_profile", express.static(EVENT_PROFILE_DIR));

  app.use(authRouter);
  app.use(eventsRouter);
  app.use(photosRouter);
  app.use(guestRouter);
  app.use(leadsRouter);
  app.use(studioRouter);
  app.use(opsRouter);
  app.use("/api/analytics", analyticsRouter);
  app.use(musicRouter);
  app.use(ftpRouter);

  // Global error logging — main error log is logs/error.log
  app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
    void _next;
    if (err instanceof multer.MulterError) {
      logger.warn("Multer upload error", {
        code: err.code,
        message: err.message,
        method: req.method,
        route: req.path,
      });
      const errorMessage =
        err.code === "LIMIT_UNEXPECTED_FILE"
          ? "Too many files in a single batch (max 100). Please upload in smaller batches."
          : err.message;
      return res.status(400).send({
        error: errorMessage,
        message: errorMessage,
      });
    }
    logger.error("Unhandled Express error", {
      error: err.message,
      stack: err.stack,
      method: req.method,
      route: req.path,
    });
    res.status(500).send({ message: "Internal server error" });
  });

  return app;
}
