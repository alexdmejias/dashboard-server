import { z } from "zod/v4";
import DataFileCallback, {
  type DataFileConfig,
  dataFileConfig,
} from "../../base-callbacks/data-file";

const itemSchema = z.object({
  word: z.string(),
  partOfSpeech: z.string().optional(),
  pronunciation: z.string().optional(),
  definitions: z.array(z.string()).default([]),
  sentences: z.array(z.string()).default([]),
});

export type WordData = z.infer<typeof itemSchema>;

export const expectedConfig = dataFileConfig;

class CallbackWord extends DataFileCallback<typeof itemSchema, WordData> {
  // A word of the *day*: stays the same until midnight.
  static defaultOptions: Partial<DataFileConfig> = {
    title: "Word of the Day",
    mode: "daily",
  };

  constructor(options = {}) {
    super({
      name: "word",
      dataFileName: "words",
      itemSchema,
      receivedConfig: options,
    });
  }

  transform(item: WordData): WordData {
    return item;
  }
}

export default CallbackWord;
