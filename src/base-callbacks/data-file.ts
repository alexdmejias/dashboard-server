import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod/v4";
import { PROJECT_ROOT } from "../utils/projectRoot";
import CallbackBase from "./base";

export const pickModes = ["random", "daily"] as const;
export type PickMode = (typeof pickModes)[number];

/**
 * Config shared by every callback that reads its items from `data/*.json`.
 * - `random` picks a new item on every render.
 * - `daily` picks the same item for the whole day (in `timezone`) and
 *   walks through the file in order, one item per day.
 */
export const dataFileConfig = z.object({
  title: z.string().optional(),
  mode: z.enum(pickModes).default("random"),
  timezone: z.string().default("America/New_York"),
});

export type DataFileConfig = z.infer<typeof dataFileConfig>;

/**
 * Resolve `data/<name>.json`, falling back to the committed
 * `data/<name>.sample.json` so the callback works out of the box.
 */
export function resolveDataFilePath(
  name: string,
  root: string = PROJECT_ROOT,
): string {
  const custom = path.join(root, "data", `${name}.json`);
  if (existsSync(custom)) return custom;
  return path.join(root, "data", `${name}.sample.json`);
}

/** Whole days since the Unix epoch for the calendar date in `timezone`. */
export function getDayNumber(date: Date, timezone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).formatToParts(date);
  const get = (type: string) =>
    Number.parseInt(parts.find((p) => p.type === type)?.value ?? "0", 10);

  return Math.floor(
    Date.UTC(get("year"), get("month") - 1, get("day")) / 86_400_000,
  );
}

export function pickItem<T>(
  items: T[],
  mode: PickMode,
  timezone: string,
  now: Date = new Date(),
  random: () => number = Math.random,
): T {
  const index =
    mode === "daily"
      ? getDayNumber(now, timezone) % items.length
      : Math.floor(random() * items.length);
  return items[index];
}

type DataFileCallbackOptions<Item extends z.ZodType> = {
  name: string;
  /** Base name of the file in `data/`, e.g. "words" for data/words.json */
  dataFileName: string;
  itemSchema: Item;
  receivedConfig?: unknown;
};

/**
 * Base for callbacks that show one item from a JSON array in `data/`.
 * The file is read on every render, so edits show up without a restart.
 */
abstract class DataFileCallback<
  Item extends z.ZodType,
  TemplateData extends object,
> extends CallbackBase<TemplateData, typeof dataFileConfig> {
  dataFileName: string;
  itemSchema: Item;

  constructor({
    name,
    dataFileName,
    itemSchema,
    receivedConfig,
  }: DataFileCallbackOptions<Item>) {
    super({
      name,
      expectedConfig: dataFileConfig,
      receivedConfig,
    });
    this.dataFileName = dataFileName;
    this.itemSchema = itemSchema;
  }

  abstract transform(item: z.infer<Item>): TemplateData;

  async loadItems(): Promise<z.infer<Item>[]> {
    const filePath = resolveDataFilePath(this.dataFileName);
    const raw = JSON.parse(await readFile(filePath, "utf-8"));
    const result = z.array(this.itemSchema).safeParse(raw);

    if (!result.success) {
      throw new Error(
        `${path.basename(filePath)} has an invalid shape: ${z.prettifyError(result.error)}`,
      );
    }
    return result.data;
  }

  async getData(config: DataFileConfig) {
    try {
      const items = await this.loadItems();
      if (!items.length) {
        return { error: `no items found in data/${this.dataFileName}.json` };
      }
      return this.transform(pickItem(items, config.mode, config.timezone));
    } catch (e) {
      return { error: e instanceof Error ? e.message : String(e) };
    }
  }
}

export default DataFileCallback;
