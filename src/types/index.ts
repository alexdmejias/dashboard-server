import type { z } from "zod/v4";
import type CallbackBase from "../base-callbacks/base";

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

export type PossibleTemplateData<T extends object = object> = Promise<
  T | TemplateDataError
>;

export type DataFromCallback = TemplateDataError | any[] | Record<string, any>;
export type PossibleCallback = {
  name: string;
  callback: any; // import from a callback file
  expectedConfig?: z.ZodObject<any>;
};
export type PossibleCallbacks = Record<string, PossibleCallback>;

export * from "./browser-renderer";

export const supportedLayouts = ["full", "2-col"] as const;
export type SupportedLayout = (typeof supportedLayouts)[number];

export type CallbackConfig = {
  name: string;
  options?: object;
};

export type TwoColCallbacks = {
  content_left: CallbackConfig;
  content_right: CallbackConfig;
};

export type FullCallbacks = {
  content: CallbackConfig;
};

export type PlaylistItem = {
  id: string;
  layout: SupportedLayout;
  callbacks: TwoColCallbacks | FullCallbacks;
};
export type Playlist = PlaylistItem[];

export type ValidCallback = {
  instance: CallbackBase;
  name: string;
  expectedConfig?: z.ZodObject<any>;
};

declare module "fastify" {
  interface FastifyReply {
    internalServerError(message: string): FastifyReply;
    notFound(message: string): FastifyReply;
  }
}
