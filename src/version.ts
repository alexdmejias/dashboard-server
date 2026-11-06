import fs from "node:fs";
import path from "node:path";
import showdown from "showdown";
import { PROJECT_ROOT } from "./utils/projectRoot";

export function getVersion(): string {
  const pkg = JSON.parse(
    fs.readFileSync(path.join(PROJECT_ROOT, "package.json"), "utf-8"),
  );
  return pkg.version;
}

export function getChangelog(): string {
  const changelogPath = path.join(PROJECT_ROOT, "CHANGELOG.md");
  if (!fs.existsSync(changelogPath)) {
    return "";
  }
  return fs.readFileSync(changelogPath, "utf-8");
}

export function getChangelogHtml(): string {
  const conv = new showdown.Converter({
    noHeaderId: true,
    tables: true,
    strikethrough: true,
    ghCompatibleHeaderId: true,
  });
  return conv.makeHtml(getChangelog());
}
