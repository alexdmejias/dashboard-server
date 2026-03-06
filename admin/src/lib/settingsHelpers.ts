import {
  SETTINGS_FIELDS,
  type FieldMeta,
  type SettingsFormValues,
} from "../../../src/plugins/settingsSchema";

export type { FieldMeta };

export interface DiffEntry {
  field: FieldMeta;
  from: unknown;
  to: unknown;
}

/** Mask a sensitive value for display */
export function maskValue(value: unknown): string {
  if (value === undefined || value === null || value === "") return "(empty)";
  const str = String(value);
  return str.length <= 4
    ? "••••"
    : `${str.slice(0, 2)}${"•".repeat(str.length - 4)}${str.slice(-2)}`;
}

/** Format a value for diff display */
export function displayValue(meta: FieldMeta, value: unknown): string {
  if (value === undefined || value === null || value === "") return "(empty)";
  if (meta.sensitive) return maskValue(value);
  if (meta.type === "boolean") return value ? "true" : "false";
  return String(value);
}

/** Coerce raw API values to the types expected by the form */
export function coerceSettings(
  raw: Record<string, unknown>,
): SettingsFormValues {
  const result: Record<string, unknown> = {};
  for (const field of SETTINGS_FIELDS) {
    const val = raw[field.name];
    if (val === undefined) continue;
    if (field.type === "number") {
      const num = typeof val === "number" ? val : Number(val);
      if (!Number.isNaN(num)) result[field.name] = num;
    } else if (field.type === "boolean") {
      result[field.name] = Boolean(val);
    } else {
      result[field.name] = val;
    }
  }
  return result as SettingsFormValues;
}

/** Build the diff between server values and submitted form values */
export function buildDiff(
  server: Record<string, unknown>,
  submitted: SettingsFormValues,
): DiffEntry[] {
  const diff: DiffEntry[] = [];
  for (const field of SETTINGS_FIELDS) {
    const from = server[field.name];
    const to = (submitted as Record<string, unknown>)[field.name];
    const fromStr = from === undefined || from === null ? "" : String(from);
    const toStr = to === undefined || to === null ? "" : String(to);
    if (fromStr !== toStr) {
      diff.push({ field, from, to });
    }
  }
  return diff;
}
