import pino from "pino";
import pretty from "pino-pretty";
import { logBufferStream } from "./logBuffer";
import { getSettings } from "./settings";

const isProduction = process.env.NODE_ENV === "production";
const logLevel = process.env.LOG_LEVEL || "debug";
const settings = getSettings();
const logtailSourceToken = settings.logtailSourceToken;
const hasLogtailToken = !!logtailSourceToken;

console.log("logger options", {
  hasLogtailToken,
  isProduction,
  logLevel,
});

// Build a multistream destination so we can:
//  1. Display human-readable output at the terminal (dev) or raw NDJSON (prod/PM2)
//  2. Always buffer the last 1000 raw NDJSON lines in-process for the admin UI
const destinations = pino.multistream([
  // Human-readable terminal output in development; raw NDJSON to stdout in production
  isProduction
    ? { stream: process.stdout, level: logLevel }
    : { stream: pretty({ colorize: true }), level: logLevel },

  // In-memory ring buffer – always active, used by the admin /api/admin/raw-logs endpoint
  { stream: logBufferStream, level: logLevel },
]);

const logger = pino({ level: logLevel }, destinations);

export default logger;
