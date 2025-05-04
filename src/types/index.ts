import StateMachine from "../stateMachine";

export const supportedViewTypes = ["html", "json", "png", "bmp"] as const;
export type SupportedViewTypes = (typeof supportedViewTypes)[number];

export type SupportedDBCallbacks = "jokes" | "words" | "facts" | "quotes";

export type TemplateDataError = {
  error: string;
};

export type TemplateGeneric<T> = {
  index: number;
  item: T;
};

export type PossibleTemplateData<T> = Promise<T | TemplateDataError>;

export type DataFromCallback = TemplateDataError | any[] | Record<string, any>;

export * from "./reddit-api";
export * from "./weather-api";

declare module "fastify" {
  interface FastifyInstance {
    clients: Record<string, StateMachine>;
  }
}
