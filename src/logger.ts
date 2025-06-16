import pino, { type LoggerOptions } from "pino";

export const loggingOptions: LoggerOptions = {
  level: "trace",
  transport: {
    target: "pino-pretty",
    options: {
      colorize: true,
    },
  },
};

const logger = pino(loggingOptions);

export default logger;
