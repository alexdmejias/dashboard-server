import {
  type SupportedImageViewType,
  type SupportedViewType,
  supportedImageViewTypes,
  supportedViewTypes,
} from "../types";

export function isSupportedImageViewType(
  viewType: string,
): viewType is SupportedImageViewType {
  return (supportedImageViewTypes as readonly string[]).includes(viewType);
}

export function isSupportedViewType(
  viewType: SupportedViewType,
): viewType is SupportedViewType {
  return supportedViewTypes.includes(viewType);
}
