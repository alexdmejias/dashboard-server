import CallbackBase, { CallbackConstructor } from "./base";
import { SupportedDBCallbacks } from "../types";
import DB from "../db";

export type CallbackBaseDBConstrutor = {
  dataFile: SupportedDBCallbacks;
} & CallbackConstructor;

abstract class CallbackBaseDB<
  DBTableShape extends object = object,
  Transformed extends object = DBTableShape
> extends CallbackBase<Transformed> {
  dataFile: SupportedDBCallbacks;
  abstract migration: string;

  constructor(args: CallbackBaseDBConstrutor) {
    super(args);
    this.dataFile = args.dataFile;
  }

  transformer(data: DBTableShape) {
    return data as unknown as Transformed;
  }

  async runMigration() {
    return DB.runMigration(this.migration);
  }

  // exportData() {}

  async getData() {
    try {
      const data = await DB.getRecord<DBTableShape>(this.dataFile);

      if (!data) {
        throw new Error(`${this.name}: no data received`);
      }

      return this.transformer(data);
    } catch (e) {
      return { error: e instanceof Error ? e.message : (e as string) };
    }
  }
}

export default CallbackBaseDB;
