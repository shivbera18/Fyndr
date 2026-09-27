import { createApp } from "./app";
import { PORT } from "./config";
import { startFtpWatcher } from "./ftp/watcher";
import { startIngestWorker } from "./photos/ingestWorker";
import logger from "./utils/logger";

process.on("uncaughtException", (err) => logger.error("uncaughtException", { error: err.message, stack: err.stack }));
process.on("unhandledRejection", (reason: unknown) =>
  logger.error("unhandledRejection", {
    error: String(reason),
    stack: (reason as { stack?: string } | null)?.stack,
  })
);

const app = createApp();
app.listen(PORT);
logger.info(`server is running on port ${PORT}`);
// Camera-to-cloud drop watcher. No-op unless FTP_WATCH_DIR is set (VPS only).
startFtpWatcher();
// Two-stage ingest worker: heavy ML/storage runs here, POST /photo only stages stubs.
if (process.env.DISABLE_INGEST_WORKER !== "true") startIngestWorker();
