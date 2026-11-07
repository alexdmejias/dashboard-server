import { Liquid } from "liquidjs";
import footer from "../views/partials/footer.liquid?raw";
import head from "../views/partials/head.liquid?raw";
import { localizeTrmnlAssets } from "./trmnlAssets";

const engine = new Liquid({
  partials: "../views/partials/",
});

export const createLiquidStory = (template: string) => {
  return (args: any) => {
    const html = engine.parseAndRenderSync(
      localizeTrmnlAssets(head) + template + footer,
      args,
    );
    return html;
  };
};
