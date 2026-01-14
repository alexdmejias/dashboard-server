import { Liquid } from "liquidjs";

const engine = new Liquid({
  partials: "../views/partials/",
});

export const createLiquidStory = (template: string) => {
  return (args: any) => {
    const html = engine.parseAndRenderSync(template, args);
    return html;
  };
};
