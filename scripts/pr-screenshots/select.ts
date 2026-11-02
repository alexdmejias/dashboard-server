/** Story selection for PR screenshots — kept free of side effects so it can be unit tested. */

// Changes under these paths can affect every story, so select all of them.
export const GLOBAL_PATHS = [
  "views/",
  "src/styles/",
  ".storybook/preview-head.html",
  ".storybook/preview.ts",
];

export interface StoryEntry {
  id: string;
  title: string;
  name: string;
  importPath: string;
}

export interface ManifestEntry extends StoryEntry {
  file?: string;
  error?: string;
}

/** Callback names touched by a list of changed paths. */
export function changedCallbacks(files: string[]): Set<string> {
  const names = new Set<string>();
  for (const file of files) {
    // src/callbacks/reddit/template.liquid -> reddit
    // src/callbacks/joke.ts                -> joke
    const match = file.match(/^src\/callbacks\/([^/.]+)/);
    if (match) names.add(match[1]);
  }
  return names;
}

/**
 * Picks the stories affected by a set of changed files: every story in a
 * changed callback's own directory, plus layout stories whose export name
 * mentions that callback (e.g. "RedditAndWeather" -> id "...--reddit-and-weather").
 */
export function selectStories(
  stories: StoryEntry[],
  files: string[],
): StoryEntry[] {
  if (files.some((f) => GLOBAL_PATHS.some((g) => f.startsWith(g)))) {
    return stories;
  }
  const callbacks = changedCallbacks(files);
  return stories.filter((story) => {
    const importPath = story.importPath.replace(/^\.\//, "");
    const storySlug = story.id.split("--")[1] ?? "";
    for (const cb of callbacks) {
      if (
        importPath.startsWith(`src/callbacks/${cb}/`) ||
        importPath.startsWith(`src/callbacks/${cb}.`)
      ) {
        return true;
      }
      if (
        importPath.startsWith("src/layouts/") &&
        new RegExp(`(^|-)${cb}(-|$)`).test(storySlug)
      ) {
        return true;
      }
    }
    return false;
  });
}
