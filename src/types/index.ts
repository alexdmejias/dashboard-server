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

export type PossibleTemplateData<T extends object = object> = Promise<
  T | TemplateDataError
>;

export type DataFromCallback = TemplateDataError | any[] | Record<string, any>;
export type PossibleCallbacks = Record<string, any>;

export type PlaylistItem = {
  id: string;
  callbackName: string;
  options?: object;
};
export type Playlist = PlaylistItem[];

export type WASDWASD = { instance: CallbackBase; id: string };

declare module "fastify" {
  interface FastifyReply {
    internalServerError(message: string): FastifyReply;
    notFound(message: string): FastifyReply;
  }
}
