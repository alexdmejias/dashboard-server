import pino, { type LoggerOptions } from "pino";
import { getSettings } from "./settings";

const hasLogtailToken = !!process.env.LOGTAIL_SOURCE_TOKEN;
const isProduction = process.env.NODE_ENV === "production";
const settings = getSettings();
const logLevel = settings.logLevel;

// Define each transport as a variable
const prettyTransport = {
  target: "pino-pretty",
  level: logLevel,
  options: {
    colorize: true,
  },
};

const logtailTransport = {
  target: "@logtail/pino",
  options: {
    sourceToken: process.env.LOGTAIL_SOURCE_TOKEN,
    endpoint: settings.logtailEndpoint || undefined,
  },
};

// Build the transport config as a variable
// In production with PM2, don't use pino-pretty or logtail as they can cause issues
// Logs go to stdout directly which PM2 captures
let loggerTransport: LoggerOptions["transport"];
if (isProduction) {
  // No transport in production - logs go to stdout directly for PM2
  loggerTransport = undefined;
} else {
  loggerTransport = {
    targets: [prettyTransport],
  };
}

export const loggingOptions: LoggerOptions = {
  level: logLevel,
  transport: loggerTransport,
};

console.log("######## logger options", {
  transport: JSON.stringify(loggingOptions.transport, null, 2),
  hasLogtailToken,
  isProduction,
  logLevel,
});

const logger = pino(loggingOptions);

export default logger;
