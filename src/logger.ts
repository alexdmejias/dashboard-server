import pino, { type LoggerOptions } from "pino";

export const loggingOptions: LoggerOptions = {
  level: process.env.LOG_LEVEL || "trace",
  transport: {
    target: "pino-pretty",
    options: {
      colorize: true,
    },
  },
};

const logger = pino(loggingOptions);

export default logger;
