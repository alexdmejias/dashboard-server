import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { PROJECT_ROOT } from "../projectRoot";
import {
  FONTS_READY_ATTRIBUTE,
  FONTS_READY_FALLBACK_MS,
  FONTS_READY_SELECTOR,
  FONTS_READY_TIMEOUT_MS,
} from "./fontsReady";

// The remote renderers wait for the attribute head.liquid sets, so the two
// must agree or every Cloudflare/Browserless screenshot times out.
describe("fonts-ready marker", () => {
  it("is set by views/partials/head.liquid", async () => {
    const head = await readFile(
      path.join(PROJECT_ROOT, "views/partials/head.liquid"),
      "utf-8",
    );

    expect(head).toContain(
      `document.documentElement.setAttribute("${FONTS_READY_ATTRIBUTE}", "")`,
    );
    expect(head).toContain(
      `setTimeout(markFontsReady, ${FONTS_READY_FALLBACK_MS})`,
    );
    expect(FONTS_READY_SELECTOR).toBe(`html[${FONTS_READY_ATTRIBUTE}]`);
  });

  it("waits longer than the head.liquid fallback", () => {
    expect(FONTS_READY_TIMEOUT_MS).toBeGreaterThan(FONTS_READY_FALLBACK_MS);
  });
});
