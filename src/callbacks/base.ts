import getScreenshot from "../utils/getScreenshot";

abstract class CallbackBase {
  name: string;
  template: string;
  callbackUrl: string;
  inRotation: boolean;

  constructor(name: string, template?: string) {
    this.name = name;
    this.callbackUrl = `http://localhost:3000/callbacks/${name}`;
    this.inRotation = true;
    this.template = template || name;
  }

  abstract getData(): Promise<any>;

  async render() {
    const lastUpdated = Date.now();
    const data = await this.getData();

    return {
      path: await getScreenshot({
        data: data,
        template: this.template,
      }),
      lastUpdated,
    };
  }
}

export default CallbackBase;
