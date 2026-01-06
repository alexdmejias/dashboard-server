import pino, { type LoggerOptions } from "pino";

const hasLogtailToken = !!process.env.LOGTAIL_SOURCE_TOKEN;
const isProduction = process.env.NODE_ENV === "production";

export const loggingOptions: LoggerOptions = {
  level: process.env.LOG_LEVEL || "trace",
  // Conditional transport based on environment
  transport: hasLogtailToken
    ? {
        targets: [
          // Only add pino-pretty in non-production environments
          ...(!isProduction
            ? [
                {
                  target: "pino-pretty",
                  options: {
                    colorize: true,
                  },
                },
              ]
            : []),
          {
            target: "@logtail/pino",
            options: {
              sourceToken: process.env.LOGTAIL_SOURCE_TOKEN,
            },
          },
        ],
      }
    : !isProduction
      ? {
          // Development without Logtail: use pino-pretty
          target: "pino-pretty",
          options: {
            colorize: true,
          },
        }
      : undefined, // Production without Logtail: no transport (raw JSON to stdout)
};

const logger = pino(loggingOptions);

export default logger;
