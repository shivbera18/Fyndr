import { createLogger, format, transports } from "winston";
import path from "path";
import fs from "fs";

// NOTE: compiled output lives in dist/utils, so step up to the repo logs dir
// (same folder index.js-era logger used via node-server-1/../..).
const LOG_DIR = path.resolve(__dirname, "..", "..", "..", "logs");
if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });
const { combine, timestamp, errors, json, printf, colorize } = format;

const logFormat = printf(({ level, message, timestamp, stack, ...meta }) => {
  const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : "";
  return `${timestamp} ${level}: ${stack || message}${metaStr}`;
});

const logger = createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: combine(
    timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    errors({ stack: true }),
    json()
  ),
  defaultMeta: { service: "fyndr-api" },
  transports: [
    // main error log — focus for debugging signup etc
    new transports.File({
      filename: path.join(LOG_DIR, "error.log"),
      level: "error",
      maxsize: 5 * 1024 * 1024,
      maxFiles: 5,
      tailable: true,
    }),
    // combined basic logs
    new transports.File({
      filename: path.join(LOG_DIR, "combined.log"),
      maxsize: 5 * 1024 * 1024,
      maxFiles: 5,
      tailable: true,
    }),
  ],
});

// also log to console in dev (with colors) — tee will still capture to logs/api.log
if (process.env.NODE_ENV !== "production") {
  logger.add(
    new transports.Console({
      format: combine(
        colorize(),
        timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
        errors({ stack: true }),
        logFormat
      ),
    })
  );
}

export default logger;
