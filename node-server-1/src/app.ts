import cors from "cors";
import express, { type NextFunction, type Request, type Response } from "express";
import "./db";
import { CORS_ORIGIN, EVENT_PROFILE_DIR, UPLOAD_DIR, corsOrigins } from "./config";
import { metricsMiddleware } from "./middleware/metricsMiddleware";
import logger from "./utils/logger";
import authRouter from "./routes/auth";
import eventsRouter from "./routes/events";
import guestRouter from "./routes/guest";
import opsRouter from "./routes/ops";
import photosRouter from "./routes/photos";
import studioRouter from "./routes/studio";

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
  app.use(studioRouter);
  app.use(opsRouter);

  // Global error logging — main error log is logs/error.log
  // NOTE: 4-arg signature required so Express treats this as error middleware.
  app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
    void _next;
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
