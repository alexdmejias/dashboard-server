import { z } from "zod";
import CallbackBase from "../base-callbacks/base";

export const supportedImageViewTypes = ["png", "bmp"] as const;
export const supportedTextViewTypes = ["html", "json"] as const;
export const supportedViewTypes = [
  ...supportedImageViewTypes,
  ...supportedTextViewTypes,
] as const;

export type SupportedViewType = (typeof supportedViewTypes)[number];
export type SupportedImageViewType = (typeof supportedImageViewTypes)[number];

export type SupportedDBCallbacks = "jokes" | "words" | "facts" | "quotes";

export type ScreenshotSizeOption = {
  width: number;
  height: number;
};

export type TemplateDataError = {
  error: string;
};

export type TemplateGeneric<T> = {
  index: number;
  item: T;
};

export type PossibleTemplateData<T> = Promise<T | TemplateDataError>;

export type DataFromCallback = TemplateDataError | any[] | Record<string, any>;
export type PossibleCallback = {
  callback: typeof CallbackBase;
  options: z.AnyZodObject;
};

export * from "./weather-api";
export * from "./browser-renderer";

declare module "fastify" {
  interface FastifyReply {
    internalServerError(message: string): FastifyReply;
    notFound(message: string): FastifyReply;
  }
}
