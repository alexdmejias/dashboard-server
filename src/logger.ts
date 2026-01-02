import pino, { type LoggerOptions } from "pino";

const hasLogtailToken = !!process.env.LOGTAIL_SOURCE_TOKEN;

export const loggingOptions: LoggerOptions = {
  level: process.env.LOG_LEVEL || "trace",
  transport: hasLogtailToken
    ? {
        targets: [
          {
            target: "pino-pretty",
            options: {
              colorize: true,
            },
          },
          {
            target: "@logtail/pino",
            options: {
              sourceToken: process.env.LOGTAIL_SOURCE_TOKEN,
            },
          },
        ],
      }
    : {
        target: "pino-pretty",
        options: {
          colorize: true,
        },
      },
};

const logger = pino(loggingOptions);

export default logger;
