import { setProjectAnnotations } from "@storybook/html-vite";
import { afterEach, expect } from "vitest";
import { page } from "vitest/browser";
import * as projectAnnotations from "./preview";

setProjectAnnotations([projectAnnotations]);

// Resolves once every stylesheet has loaded. TRMNL's CSS (18MB) sets the
// frame's size, so a screenshot taken earlier is wrong.
function stylesheetsLoaded(): Promise<unknown> {
  const links = [
    ...document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]'),
  ];
  return Promise.all(
    links
      .filter((link) => !link.sheet)
      .map(
        (link) =>
          new Promise((resolve, reject) => {
            link.addEventListener("load", resolve, { once: true });
            link.addEventListener(
              "error",
              () =>
                reject(new Error(`Stylesheet failed to load: ${link.href}`)),
              { once: true },
            );
          }),
      ),
  );
}

// Every story renders a 1200x825 `.screen` device frame (views/partials/head.liquid).
// Compare it against the reference image committed next to the story file.
afterEach(async () => {
  const screen = document.querySelector(".screen");
  if (!screen) return;
  await stylesheetsLoaded();
  // Force a layout so pending font loads have started before waiting on them.
  screen.getBoundingClientRect();
  await document.fonts.ready;
  await expect.element(page.elementLocator(screen)).toMatchScreenshot();
});
