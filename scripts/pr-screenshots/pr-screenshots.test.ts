import { describe, expect, it } from "vitest";
import { buildComment, COMMENT_MARKER } from "./format";
import { changedCallbacks, type StoryEntry, selectStories } from "./select";

const story = (id: string, importPath: string): StoryEntry => ({
  id,
  title: id.split("--")[0],
  name: id.split("--")[1],
  importPath,
});

const stories = [
  story("reddit--default", "./src/callbacks/reddit/reddit.stories.ts"),
  story("weather--default", "./src/callbacks/weather/weather.stories.ts"),
  story("joke--default", "./src/callbacks/joke.stories.ts"),
  story(
    "layouts-2-col-layout--reddit-and-weather",
    "./src/layouts/2-col-layout.stories.ts",
  ),
  story(
    "layouts-2-col-layout--weather-comparison",
    "./src/layouts/2-col-layout.stories.ts",
  ),
  story(
    "layouts-2-col-layout--year-progress-and-weather",
    "./src/layouts/2-col-layout.stories.ts",
  ),
];

const ids = (selected: StoryEntry[]) => selected.map((s) => s.id);

describe("changedCallbacks", () => {
  it("extracts callback names from directory and single-file callbacks", () => {
    expect(
      changedCallbacks([
        "src/callbacks/reddit/template.liquid",
        "src/callbacks/joke.ts",
        "src/app.ts",
        "README.md",
      ]),
    ).toEqual(new Set(["reddit", "joke"]));
  });
});

describe("selectStories", () => {
  it("selects a callback's own stories and layout stories that name it", () => {
    expect(
      ids(selectStories(stories, ["src/callbacks/reddit/template.liquid"])),
    ).toEqual(["reddit--default", "layouts-2-col-layout--reddit-and-weather"]);
  });

  it("matches whole hyphenated names only", () => {
    // "progress" must not match "year-progress", but "year-progress" should.
    expect(
      ids(selectStories(stories, ["src/callbacks/year-progress/index.ts"])),
    ).toEqual(["layouts-2-col-layout--year-progress-and-weather"]);
  });

  it("selects single-file callback stories", () => {
    expect(ids(selectStories(stories, ["src/callbacks/joke.ts"]))).toEqual([
      "joke--default",
    ]);
  });

  it("selects everything when shared views or styles change", () => {
    expect(selectStories(stories, ["views/layouts/2-col.liquid"])).toHaveLength(
      stories.length,
    );
    expect(selectStories(stories, ["src/styles/tailwind.css"])).toHaveLength(
      stories.length,
    );
  });

  it("selects nothing for unrelated changes", () => {
    expect(selectStories(stories, ["src/app.ts", "README.md"])).toEqual([]);
  });
});

describe("buildComment", () => {
  const opts = {
    headSha: "abcdef1234567",
    baseRef: "main",
    beforeAvailable: true,
  };

  it("includes the marker, a before/after table and collapses unchanged stories", () => {
    const body = buildComment(
      [
        {
          label: "Layouts / 2-Col Layout › Reddit And Weather",
          status: "changed",
          beforeUrl: "https://img/before/a.png",
          afterUrl: "https://img/after/a.png",
        },
        {
          label: "Reddit › Empty",
          status: "unchanged",
          beforeUrl: "https://img/before/b.png",
          afterUrl: "https://img/after/b.png",
        },
        { label: "Reddit › Broken", status: "error", error: "Timeout `x`" },
      ],
      opts,
    );
    expect(body.startsWith(COMMENT_MARKER)).toBe(true);
    expect(body).toContain("1 changed, 1 unchanged, 1 failed");
    expect(body).toContain("`abcdef1`");
    expect(body).toContain(
      "| [![before](https://img/before/a.png)](https://img/before/a.png) | [![after](https://img/after/a.png)](https://img/after/a.png) |",
    );
    expect(body).toContain("1 story with no visual change");
    expect(body).toContain("- Reddit › Broken: `Timeout 'x'`");
  });

  it("notes when the base build was unavailable", () => {
    const body = buildComment(
      [
        {
          label: "Reddit › Default",
          status: "new",
          afterUrl: "https://img/after/c.png",
        },
      ],
      { ...opts, beforeAvailable: false },
    );
    expect(body).toContain("only **After** screenshots are shown");
    expect(body).toContain("#### Reddit › Default (new)");
  });
});
