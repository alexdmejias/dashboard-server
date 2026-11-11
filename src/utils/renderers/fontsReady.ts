/**
 * Web fonts load asynchronously, so a screenshot taken once the page is
 * "loaded" (even with `networkidle2`) can still show text in a fallback font,
 * or none at all.
 *
 * views/partials/head.liquid sets this attribute on <html> once the page has
 * loaded and `document.fonts.ready` has resolved. The Cloudflare and
 * Browserless APIs can't await a promise in the page, so they wait for the
 * attribute with `waitForSelector` before taking the screenshot.
 */
export const FONTS_READY_ATTRIBUTE = "data-fonts-ready";
export const FONTS_READY_SELECTOR = `html[${FONTS_READY_ATTRIBUTE}]`;

/**
 * How long to wait for fonts before taking the screenshot anyway, so a hung
 * font request can't block rendering. head.liquid uses the same delay.
 */
export const FONTS_READY_FALLBACK_MS = 10_000;

/**
 * `waitForSelector` timeout for the remote renderers. Longer than the
 * fallback, so the attribute always appears before the request times out.
 */
export const FONTS_READY_TIMEOUT_MS = FONTS_READY_FALLBACK_MS + 5_000;
