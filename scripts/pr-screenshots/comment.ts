/**
 * Builds the PR comment body from before/after capture runs.
 *
 *   tsx scripts/pr-screenshots/comment.ts --after <dir> [--before <dir>] \
 *     --image-base <url> --head-sha <sha> --base-ref <name> --out comment.md
 *
 * <dir> are capture.ts output directories. Images are linked as
 * <image-base>/before/<file> and <image-base>/after/<file>, so the caller
 * must publish both directories under that URL with the same layout.
 */
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { parseArgs } from "node:util";
import { buildComment, type StoryResult } from "./format";
import type { ManifestEntry } from "./select";

async function readManifest(dir: string): Promise<ManifestEntry[] | null> {
  try {
    return JSON.parse(await readFile(path.join(dir, "manifest.json"), "utf8"));
  } catch {
    return null;
  }
}

async function hashFile(file: string): Promise<string> {
  return createHash("sha256")
    .update(await readFile(file))
    .digest("hex");
}

async function main() {
  const { values } = parseArgs({
    options: {
      before: { type: "string" },
      after: { type: "string" },
      "image-base": { type: "string" },
      "head-sha": { type: "string" },
      "base-ref": { type: "string" },
      out: { type: "string" },
    },
  });
  const { after, out } = values;
  const imageBase = values["image-base"];
  if (!after || !out || !imageBase) {
    throw new Error("--after, --image-base and --out are required");
  }

  const afterManifest = (await readManifest(after)) ?? [];
  const beforeManifest = values.before
    ? await readManifest(values.before)
    : null;
  const beforeById = new Map((beforeManifest ?? []).map((e) => [e.id, e]));

  const results: StoryResult[] = [];
  for (const entry of afterManifest) {
    const label = `${entry.title.replaceAll("/", " / ")} › ${entry.name}`;
    if (!entry.file) {
      results.push({ label, status: "error", error: entry.error });
      continue;
    }
    const afterUrl = `${imageBase}/after/${entry.file}`;
    const before = beforeById.get(entry.id);
    if (!before?.file || !values.before) {
      results.push({ label, status: "new", afterUrl });
      continue;
    }
    const same =
      (await hashFile(path.join(values.before, before.file))) ===
      (await hashFile(path.join(after, entry.file)));
    results.push({
      label,
      status: same ? "unchanged" : "changed",
      beforeUrl: `${imageBase}/before/${before.file}`,
      afterUrl,
    });
  }

  await writeFile(
    out,
    buildComment(results, {
      headSha: values["head-sha"] ?? "HEAD",
      baseRef: values["base-ref"] ?? "base",
      beforeAvailable: beforeManifest !== null,
    }),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
