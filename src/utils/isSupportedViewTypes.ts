import { SupportedViewTypes } from "../types";

export function isSupportedViewTypes(
  viewType: string
): viewType is SupportedViewTypes {
  // TODO should use something like ZOD to validate this
  return ["html", "json", "png"].includes(viewType);
}
