import { z } from "zod/v4";
import DataFileCallback, {
  type DataFileConfig,
  dataFileConfig,
} from "../../base-callbacks/data-file";

// A joke is a list of lines: everything but the last is the setup and the
// last line is the punchline. A single string is a one-liner.
const itemSchema = z.union([z.string(), z.array(z.string()).min(1)]);

export type JokeData = { setup: string[]; punchline: string };

export const expectedConfig = dataFileConfig;

class CallbackJoke extends DataFileCallback<typeof itemSchema, JokeData> {
  static defaultOptions: Partial<DataFileConfig> = {};

  constructor(options = {}) {
    super({
      name: "joke",
      dataFileName: "jokes",
      itemSchema,
      receivedConfig: options,
    });
  }

  transform(item: z.infer<typeof itemSchema>): JokeData {
    const lines = typeof item === "string" ? [item] : item;
    return { setup: lines.slice(0, -1), punchline: lines[lines.length - 1] };
  }
}

export default CallbackJoke;
