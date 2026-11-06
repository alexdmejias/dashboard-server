/**
 * Screenshots Storybook stories from a static Storybook build.
 *
 * Used by .github/workflows/pr-screenshots.yml, but runnable locally too:
 *
 *   npm run build-storybook
 *   tsx scripts/pr-screenshots/capture.ts --storybook storybook-static \
 *     --out /tmp/shots --all
 *
 * Story selection (exactly one of):
 *   --all                     every story
 *   --changed-files <file>    stories affected by the files listed (one path
 *                             per line, e.g. `git diff --name-only` output)
 *   --stories <manifest.json> the same stories as a previous run's manifest
 *                             (used for the "before" pass so both sides match)
 *
 * Writes <out>/<story-id>.png plus <out>/manifest.json. Set CHROMIUM_BIN to
 * use a system Chromium instead of Puppeteer's bundled one (same env var the
 * app's PuppeteerBrowserRenderer honours).
 */
import { createReadStream } from "node:fs";
import { appendFile, mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import path from "node:path";
import { parseArgs } from "node:util";
import puppeteer, { type Page } from "puppeteer";
import { type ManifestEntry, type StoryEntry, selectStories } from "./select";

// Matches the inkplate_10 screen size the app renders at
// (PuppeteerBrowserRenderer default + views/partials/head.liquid).
const VIEWPORT = { width: 1200, height: 825 };
// Keeps a PR that touches shared styles from producing a giant comment.
const MAX_STORIES = 30;

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript",
  ".mjs": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".map": "application/json",
  ".txt": "text/plain",
};

function serveStatic(root: string): Promise<Server> {
  const absRoot = path.resolve(root);
  const server = createServer(async (req, res) => {
    const urlPath = decodeURIComponent(
      new URL(req.url ?? "/", "http://localhost").pathname,
    );
    let filePath = path.join(absRoot, urlPath);
    if (!filePath.startsWith(absRoot)) {
      res.writeHead(403).end();
      return;
    }
    try {
      if ((await stat(filePath)).isDirectory()) {
        filePath = path.join(filePath, "index.html");
      }
      await stat(filePath);
    } catch {
      res.writeHead(404).end();
      return;
    }
    res.writeHead(200, {
      "Content-Type":
        MIME[path.extname(filePath)] ?? "application/octet-stream",
    });
    createReadStream(filePath).pipe(res);
  });
  return new Promise((resolve) =>
    server.listen(0, "127.0.0.1", () => resolve(server)),
  );
}

async function loadStories(storybookDir: string): Promise<StoryEntry[]> {
  const index = JSON.parse(
    await readFile(path.join(storybookDir, "index.json"), "utf8"),
  ) as { entries: Record<string, StoryEntry & { type: string }> };
  return Object.values(index.entries)
    .filter((e) => e.type === "story")
    .map(({ id, title, name, importPath }) => ({
      id,
      title,
      name,
      importPath,
    }));
}

async function captureStory(
  page: Page,
  baseUrl: string,
  storyId: string,
  target: string,
) {
  await page.goto(
    `${baseUrl}/iframe.html?id=${encodeURIComponent(storyId)}&viewMode=story`,
    { waitUntil: "load", timeout: 60_000 },
  );
  await page.waitForFunction(
    () => (document.querySelector("#storybook-root")?.children.length ?? 0) > 0,
    { timeout: 30_000 },
  );
  // Best effort: let the TRMNL stylesheet, fonts and images settle, but don't
  // fail the story if some request (e.g. a favicon) never goes quiet.
  await page
    .waitForNetworkIdle({ idleTime: 500, timeout: 15_000 })
    .catch(() => console.warn(`    network never went idle for ${storyId}`));
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all(
      Array.from(document.images)
        .filter((img) => !img.complete)
        .map(
          (img) =>
            new Promise((r) => {
              img.onload = img.onerror = r;
            }),
        ),
    );
  });
  const screen = await page.$("#storybook-root .screen");
  const png = target as `${string}.png`;
  if (screen) {
    await screen.screenshot({ path: png });
  } else {
    await page.screenshot({ path: png });
  }
}

async function main() {
  const { values } = parseArgs({
    options: {
      storybook: { type: "string" },
      out: { type: "string" },
      all: { type: "boolean", default: false },
      "changed-files": { type: "string" },
      stories: { type: "string" },
    },
  });
  if (!values.storybook || !values.out) {
    throw new Error("--storybook and --out are required");
  }
  const outDir = values.out;
  await mkdir(outDir, { recursive: true });

  const available = await loadStories(values.storybook);
  let selected: StoryEntry[];
  if (values.stories) {
    const previous = JSON.parse(
      await readFile(values.stories, "utf8"),
    ) as ManifestEntry[];
    const byId = new Map(available.map((s) => [s.id, s]));
    // Stories missing from this build (e.g. added by the PR) are skipped;
    // the comment shows them as new.
    selected = previous
      .map((p) => byId.get(p.id))
      .filter((s): s is StoryEntry => Boolean(s));
  } else if (values["changed-files"]) {
    const files = (await readFile(values["changed-files"], "utf8"))
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    selected = selectStories(available, files);
  } else if (values.all) {
    selected = available;
  } else {
    throw new Error("pass one of --all, --changed-files or --stories");
  }

  if (selected.length > MAX_STORIES) {
    console.warn(
      `${selected.length} stories selected, capturing the first ${MAX_STORIES}`,
    );
    selected = selected.slice(0, MAX_STORIES);
  }
  console.log(`Capturing ${selected.length} stories`);

  const manifest: ManifestEntry[] = [];
  if (selected.length > 0) {
    const server = await serveStatic(values.storybook);
    const { port } = server.address() as AddressInfo;
    const browser = await puppeteer.launch({
      headless: true,
      executablePath: process.env.CHROMIUM_BIN || undefined,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    try {
      const page = await browser.newPage();
      await page.setViewport(VIEWPORT);
      const baseUrl = `http://127.0.0.1:${port}`;
      for (const story of selected) {
        const entry: ManifestEntry = { ...story };
        const file = `${story.id}.png`;
        // One retry: a slow response from the TRMNL CDN shouldn't fail a story.
        for (let attempt = 1; attempt <= 2; attempt++) {
          try {
            await captureStory(
              page,
              baseUrl,
              story.id,
              path.join(outDir, file),
            );
            entry.file = file;
            delete entry.error;
            console.log(`  ✓ ${story.id}`);
            break;
          } catch (error) {
            entry.error =
              error instanceof Error ? error.message : String(error);
            console.error(
              `  ✗ ${story.id} (attempt ${attempt}): ${entry.error}`,
            );
          }
        }
        manifest.push(entry);
      }
    } finally {
      await browser.close();
      server.close();
    }
  }

  await writeFile(
    path.join(outDir, "manifest.json"),
    `${JSON.stringify(manifest, null, 2)}\n`,
  );
  if (process.env.GITHUB_OUTPUT) {
    await appendFile(process.env.GITHUB_OUTPUT, `count=${manifest.length}\n`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
