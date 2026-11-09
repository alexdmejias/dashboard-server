/**
 * Stories load TRMNL's stylesheet from .storybook/static/trmnl/css/<version>/
 * instead of usetrmnl.com: it's 18MB, so fetching it per story is slow and
 * flaky, and a local copy keeps visual test references reproducible offline.
 * Its /fonts/Inter.ttf then resolves to .storybook/static/fonts/Inter.ttf.
 *
 * When head.liquid moves to a new TRMNL version, download that version to
 * .storybook/static/trmnl/css/<version>/plugins.css (Storybook 404s until then).
 */
export function localizeTrmnlAssets(html: string): string {
  return html.replaceAll("https://usetrmnl.com/css/", "/trmnl/css/");
}
