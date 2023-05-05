import CallbackBase, { CallbackConstructor } from "./base";
import { SupportedDBCallbacks } from "../types";
import DB from "../db";

export type CallbackBaseDBConstrutor = {
  dataFile: SupportedDBCallbacks;
} & CallbackConstructor;

abstract class CallbackBaseDB<
  DBTableShape,
  Transformed = DBTableShape
> extends CallbackBase<Transformed> {
  dataFile: SupportedDBCallbacks;

  constructor(args: CallbackBaseDBConstrutor) {
    super(args);
    this.dataFile = args.dataFile;
  }

  transformer(data: DBTableShape) {
    return data as unknown as Transformed;
  }

  async getData() {
    try {
      const data = await DB.getRecord<DBTableShape>(this.dataFile);

      return this.transformer(data);
    } catch (e) {
      return { error: e instanceof Error ? e.message : (e as string) };
    }
  }
}

export default CallbackBaseDB;
