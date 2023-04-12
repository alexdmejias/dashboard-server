import getScreenshot from "../utils/getScreenshot.js";
import base64Encode from "../utils/base64Encode.js";
class CallbackBase {
  constructor(name) {
    this.name = name;
    this.callbackUrl = `http://localhost:3000/callbacks/${name}`;
    this.inRotation = true;
  }

  async getData() {
    return { base: "data" };
  }

  async render(state, setState) {
    const lastUpdated = Date.now();
    const data = await this.getData();
    const data64 = encodeURIComponent(base64Encode(JSON.stringify(data)));

    return {
      path: await getScreenshot({
        url: `${this.callbackUrl}/${data64}`,
        data: data64,
        name: this.name,
      }),
      lastUpdated,
    };
  }
}

export default CallbackBase;
