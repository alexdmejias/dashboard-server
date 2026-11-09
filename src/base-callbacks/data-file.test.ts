import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import CallbackFact from "../callbacks/fact";
import CallbackJoke from "../callbacks/joke";
import CallbackQuote from "../callbacks/quote";
import CallbackWord from "../callbacks/word";
import {
  type DataFileConfig,
  getDayNumber,
  pickItem,
  resolveDataFilePath,
} from "./data-file";

describe("getDayNumber", () => {
  it("uses the calendar date in the given timezone", () => {
    // 04:00 UTC on Jan 13 is still Jan 12 in New York
    const date = new Date("2026-01-13T04:00:00.000Z");
    expect(getDayNumber(date, "America/New_York")).toBe(
      getDayNumber(date, "UTC") - 1,
    );
  });
});

describe("pickItem", () => {
  const items = ["a", "b", "c"];

  it("returns the same item all day in daily mode", () => {
    const morning = new Date("2026-03-04T06:00:00-05:00");
    const night = new Date("2026-03-04T23:30:00-05:00");
    expect(pickItem(items, "daily", "America/New_York", morning)).toBe(
      pickItem(items, "daily", "America/New_York", night),
    );
  });

  it("advances one item per day in daily mode", () => {
    const today = new Date("2026-03-04T12:00:00Z");
    const tomorrow = new Date("2026-03-05T12:00:00Z");
    const i = items.indexOf(pickItem(items, "daily", "UTC", today));
    const j = items.indexOf(pickItem(items, "daily", "UTC", tomorrow));
    expect(j).toBe((i + 1) % items.length);
  });

  it("uses the random source in random mode", () => {
    expect(pickItem(items, "random", "UTC", new Date(), () => 0)).toBe("a");
    expect(pickItem(items, "random", "UTC", new Date(), () => 0.99)).toBe("c");
  });
});

describe("resolveDataFilePath", () => {
  let root: string;

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it("prefers data/<name>.json over the sample file", () => {
    root = mkdtempSync(path.join(tmpdir(), "data-file-"));
    expect(resolveDataFilePath("words", root)).toBe(
      path.join(root, "data", "words.sample.json"),
    );

    mkdirSync(path.join(root, "data"));
    writeFileSync(path.join(root, "data", "words.json"), "[]");
    expect(resolveDataFilePath("words", root)).toBe(
      path.join(root, "data", "words.json"),
    );
  });
});

describe("data file callbacks (sample data)", () => {
  it("word returns a word with definitions, daily by default", async () => {
    const callback = new CallbackWord();
    expect(callback.receivedConfig).toMatchObject({ mode: "daily" });

    const data = await callback.getData(
      callback.receivedConfig as DataFileConfig,
    );
    expect(data).toHaveProperty("word");
    expect(data).toMatchObject({ definitions: expect.any(Array) });
  });

  it("fact normalises bare strings to { content }", async () => {
    const callback = new CallbackFact();
    const data = await callback.getData(
      callback.receivedConfig as DataFileConfig,
    );
    expect(data).toMatchObject({ content: expect.any(String) });
    expect(callback.transform("x")).toEqual({ content: "x" });
  });

  it("joke splits lines into setup and punchline", async () => {
    const callback = new CallbackJoke();
    expect(callback.transform(["setup", "punchline"])).toEqual({
      setup: ["setup"],
      punchline: "punchline",
    });
    expect(callback.transform("one-liner")).toEqual({
      setup: [],
      punchline: "one-liner",
    });
    const data = await callback.getData(
      callback.receivedConfig as DataFileConfig,
    );
    expect(data).toHaveProperty("punchline");
  });

  it("quote returns content and author", async () => {
    const callback = new CallbackQuote({ mode: "daily" });
    const data = await callback.getData(
      callback.receivedConfig as DataFileConfig,
    );
    expect(data).toHaveProperty("content");
    expect(data).toHaveProperty("author");
  });

  it("returns an error when the file has the wrong shape", async () => {
    const callback = new CallbackQuote();
    callback.dataFileName = "words"; // words have no `content`
    const data = await callback.getData(
      callback.receivedConfig as DataFileConfig,
    );
    expect(data).toHaveProperty("error");
    expect(data).toMatchObject({
      error: expect.stringContaining("invalid shape"),
    });
  });

  it("renders each callback to HTML", async () => {
    for (const callback of [
      new CallbackWord(),
      new CallbackFact(),
      new CallbackJoke(),
      new CallbackQuote(),
    ]) {
      const result = await callback.render("html");
      expect(result.viewType).toBe("html");
    }
  });
});
