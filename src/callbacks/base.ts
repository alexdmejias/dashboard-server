import getScreenshot from "../utils/getScreenshot";

abstract class CallbackBase {
  name: string;
  callbackUrl: string;
  inRotation: boolean;

  constructor(name: string) {
    this.name = name;
    this.callbackUrl = `http://localhost:3000/callbacks/${name}`;
    this.inRotation = true;
  }

  abstract getData(): Promise<any>;

  async render() {
    const lastUpdated = Date.now();
    const data = await this.getData();

    return {
      path: await getScreenshot({
        data: data,
        name: this.name,
      }),
      lastUpdated,
    };
  }
}

export default CallbackBase;
