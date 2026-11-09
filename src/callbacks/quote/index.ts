import { z } from "zod/v4";
import DataFileCallback, {
  type DataFileConfig,
  dataFileConfig,
} from "../../base-callbacks/data-file";

const itemSchema = z.object({
  content: z.string(),
  author: z.string().optional(),
});

export type QuoteData = z.infer<typeof itemSchema>;

export const expectedConfig = dataFileConfig;

class CallbackQuote extends DataFileCallback<typeof itemSchema, QuoteData> {
  static defaultOptions: Partial<DataFileConfig> = {};

  constructor(options = {}) {
    super({
      name: "quote",
      dataFileName: "quotes",
      itemSchema,
      receivedConfig: options,
    });
  }

  transform(item: QuoteData): QuoteData {
    return item;
  }
}

export default CallbackQuote;
