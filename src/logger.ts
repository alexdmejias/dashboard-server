import pino, { type LoggerOptions } from "pino";

const hasLogtailToken = !!process.env.LOGTAIL_SOURCE_TOKEN;
const isProduction = process.env.NODE_ENV === "production";
const logLevel = process.env.LOG_LEVEL || "trace";
// Define each transport as a variable
const prettyTransport = {
  target: "pino-pretty",
  options: {
    colorize: true,
  },
};

const logtailTransport = {
  target: "@logtail/pino",
  options: {
    sourceToken: process.env.LOGTAIL_SOURCE_TOKEN,
    endpoint: process.env.LOGTAIL_ENDPOINT || undefined,
  },
};

// Build the transport config as a variable
let loggerTransport: LoggerOptions["transport"];
if (isProduction) {
  if (hasLogtailToken) {
    loggerTransport = {
      targets: [prettyTransport, logtailTransport],
    };
  } else {
    loggerTransport = {
      targets: [prettyTransport],
    };
  }
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
