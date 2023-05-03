import CallbackBase, { CallbackConstructor } from "./base";
import { TemplateGeneric } from "../types";

class CallbackBaseDB<T> extends CallbackBase<TemplateGeneric<T>> {
  constructor(args: CallbackConstructor) {
    super(args);
  }

  async getData() {
    try {
      const data = await this.getItemFromFile<T>();

      return data;
    } catch (e) {
      return { error: e instanceof Error ? e.message : (e as string) };
    }
  }
}

export default CallbackBaseDB;
