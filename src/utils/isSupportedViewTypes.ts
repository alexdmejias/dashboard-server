import { supportedViewTypes, SupportedViewTypes } from "../types";

export function isSupportedViewTypes(
  viewType: SupportedViewTypes
): viewType is SupportedViewTypes {
  // TODO should use something like ZOD to validate this
  return supportedViewTypes.includes(viewType);
}
