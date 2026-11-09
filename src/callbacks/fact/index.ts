import { z } from "zod/v4";
import DataFileCallback, {
  type DataFileConfig,
  dataFileConfig,
} from "../../base-callbacks/data-file";

// Accept either a bare string or an object with an optional source.
const itemSchema = z.union([
  z.string(),
  z.object({ content: z.string(), source: z.string().optional() }),
]);

export type FactData = { content: string; source?: string };

export const expectedConfig = dataFileConfig;

class CallbackFact extends DataFileCallback<typeof itemSchema, FactData> {
  static defaultOptions: Partial<DataFileConfig> = {
    title: "Did you know?",
  };

  constructor(options = {}) {
    super({
      name: "fact",
      dataFileName: "facts",
      itemSchema,
      receivedConfig: options,
    });
  }

  transform(item: z.infer<typeof itemSchema>): FactData {
    return typeof item === "string" ? { content: item } : item;
  }
}

export default CallbackFact;
