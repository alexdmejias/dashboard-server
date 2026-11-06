/** Markdown for the PR screenshots comment — pure, so it can be unit tested. */

/** Hidden marker the workflow uses to find and update its own comment. */
export const COMMENT_MARKER = "<!-- pr-screenshots -->";

export type StoryResult =
  | {
      label: string;
      status: "changed" | "unchanged";
      beforeUrl: string;
      afterUrl: string;
    }
  | { label: string; status: "new"; afterUrl: string }
  | { label: string; status: "error"; error?: string };

const img = (alt: string, url: string) => `[![${alt}](${url})](${url})`;

export function buildComment(
  results: StoryResult[],
  opts: { headSha: string; baseRef: string; beforeAvailable: boolean },
): string {
  const shortSha = opts.headSha.slice(0, 7);
  const changed = results.filter((r) => r.status === "changed");
  const added = results.filter((r) => r.status === "new");
  const unchanged = results.filter((r) => r.status === "unchanged");
  const errored = results.filter((r) => r.status === "error");

  const counts = [
    changed.length && `${changed.length} changed`,
    added.length && `${added.length} new`,
    unchanged.length && `${unchanged.length} unchanged`,
    errored.length && `${errored.length} failed`,
  ].filter(Boolean);

  const lines = [
    COMMENT_MARKER,
    "### 📸 Storybook screenshots",
    "",
    "Stories affected by this PR, rendered from Storybook fixtures at 1200×825 (inkplate_10). " +
      `**Before** uses the templates and styles from \`${opts.baseRef}\`, **After** is \`${shortSha}\`. ` +
      `${counts.join(", ") || "No stories"}.`,
    "",
  ];

  if (!opts.beforeAvailable) {
    lines.push(
      "> [!NOTE]",
      `> Stories couldn't be rendered from \`${opts.baseRef}\` (e.g. a story imports a template that only exists in this PR), so only **After** screenshots are shown.`,
      "",
    );
  }

  for (const r of changed) {
    if (r.status !== "changed") continue;
    lines.push(
      `#### ${r.label}`,
      "",
      "| Before | After |",
      "| :-: | :-: |",
      `| ${img("before", r.beforeUrl)} | ${img("after", r.afterUrl)} |`,
      "",
    );
  }

  for (const r of added) {
    if (r.status !== "new") continue;
    lines.push(`#### ${r.label} (new)`, "", img("after", r.afterUrl), "");
  }

  if (unchanged.length > 0) {
    lines.push(
      `<details><summary>${unchanged.length} ${unchanged.length === 1 ? "story" : "stories"} with no visual change</summary>`,
      "",
      ...unchanged.map((r) =>
        r.status === "unchanged" ? `- [${r.label}](${r.afterUrl})` : "",
      ),
      "",
      "</details>",
      "",
    );
  }

  if (errored.length > 0) {
    lines.push(
      "<details><summary>⚠️ Stories that failed to render</summary>",
      "",
      ...errored.map(
        (r) =>
          `- ${r.label}${r.status === "error" && r.error ? `: \`${r.error.replaceAll("`", "'")}\`` : ""}`,
      ),
      "",
      "</details>",
      "",
    );
  }

  return `${lines.join("\n").trimEnd()}\n`;
}
