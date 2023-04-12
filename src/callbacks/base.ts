import getScreenshot from "../utils/getScreenshot";
import base64Encode from "../utils/base64Encode";

class CallbackBase {
  name: string;
  callbackUrl: string;
  inRotation: boolean;

  constructor(name: string) {
    this.name = name;
    this.callbackUrl = `http://localhost:3000/callbacks/${name}`;
    this.inRotation = true;
  }

  async getData(): Promise<any> {
    return undefined;
  }

  async render(state: Record<string, string | number>, setState: Function) {
    const lastUpdated = Date.now();
    const data = await this.getData();
    const data64 = encodeURIComponent(base64Encode(JSON.stringify(data)));

    return {
      path: await getScreenshot({
        url: `${this.callbackUrl}/${data64}`,
        // data: data64,
        name: this.name,
      }),
      lastUpdated,
    };
  }
}

export default CallbackBase;
