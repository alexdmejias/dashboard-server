import pino from "pino";

export const loggingOptions = {
  level: "debug",
  transport: {
    target: "pino-pretty",
    options: {
      colorize: true,
    },
  },
};

const logger = pino(loggingOptions);

export default logger;
