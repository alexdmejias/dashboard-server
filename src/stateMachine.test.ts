import { beforeEach, describe, expect, it, vi } from "vitest";
import CallbackBase from "./base-callbacks/base";
import StateMachine from "./stateMachine";
import type { Playlist } from "./types";
import { renderLiquidFile } from "./utils/getRenderedTemplate";

vi.mock("./utils/getRenderedTemplate", () => ({
  renderLiquidFile: vi.fn().mockResolvedValue("<div>rendered</div>"),
}));
vi.mock("./status/weather", () => ({
  getStatusWeather: vi.fn(async (zipcode?: string) =>
    zipcode ? { tempF: 50, condition: "Clear", icon: "x.png" } : undefined,
  ),
}));

class DummyCallback extends CallbackBase {
  constructor() {
    super({ name: "weather" });
  }

  async getData() {
    return { text: "dummy" };
  }
}

const playlist: Playlist = [
  {
    id: "one",
    title: "One",
    layout: "full",
    callbacks: { content: { name: "weather" } },
  },
  {
    id: "two",
    title: "Two",
    layout: "full",
    callbacks: { content: { name: "weather" } },
  },
  {
    id: "three",
    title: "Three",
    layout: "full",
    callbacks: { content: { name: "weather" } },
  },
];

async function makeClient(statusBar = {}) {
  const client = new StateMachine(playlist, statusBar);
  await client.addCallbacks([
    { name: "weather", instance: new DummyCallback() },
  ]);
  return client;
}

/** status passed to the last layout render */
function lastLayoutStatus() {
  const calls = vi.mocked(renderLiquidFile).mock.calls;
  const layoutCall = calls
    .filter(([path]) => path.includes("views/layouts"))
    .at(-1);
  return layoutCall?.[1].status;
}

describe("StateMachine status bar", () => {
  beforeEach(() => {
    vi.mocked(renderLiquidFile).mockClear();
  });

  it("passes the rendered item's position, previous and next to the layout on tick", async () => {
    const client = await makeClient();

    await client.tick("html");
    let status = lastLayoutStatus();
    expect(status.current.id).toBe("one");
    expect(status.previous.id).toBe("three");
    expect(status.next.id).toBe("two");
    expect(status.position).toBe("1 / 3");

    await client.tick("html");
    status = lastLayoutStatus();
    expect(status.current.id).toBe("two");
    expect(status.position).toBe("2 / 3");
  });

  it("uses the requested item's position when rendering by id", async () => {
    const client = await makeClient();
    await client.renderPlaylistItemById("three", "html");
    const status = lastLayoutStatus();
    expect(status.current.id).toBe("three");
    expect(status.next.id).toBe("one");
    expect(status.position).toBe("3 / 3");
  });

  it("includes weather only when a zipcode is configured", async () => {
    await (await makeClient()).tick("html");
    expect(lastLayoutStatus().weather).toBeUndefined();

    await (await makeClient({ zipcode: "10001" })).tick("html");
    expect(lastLayoutStatus().weather).toMatchObject({ tempF: 50 });
  });
});
