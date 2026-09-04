import { createApp } from "./app";
import { PORT } from "./config";
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
