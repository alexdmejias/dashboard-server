import StateMachine from "../stateMachine";

export type SupportedViewTypes = "html" | "json" | "png";
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
