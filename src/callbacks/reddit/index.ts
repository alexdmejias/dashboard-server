import { z } from "zod/v4";
import CallbackBase from "../../base-callbacks/base";

export interface RedditResponseRoot {
  kind: string;
  data: {
    children: {
      kind: string;
      data: {
        title: string;
      };
    }[];
  };
}

type RedditPost = RedditResponseRoot["data"]["children"][number]["data"][];

export const expectedConfig = z.object({
  subreddit: z.string(),
  title: z.string().optional(),
  qty: z.number().positive(),
});

type t = z.infer<typeof expectedConfig>;

const defaultClassOptions: t = {
  title: "default reddit title",
  qty: 3,
  subreddit: "pets",
};

class CallbackReddit extends CallbackBase<RedditPost, typeof expectedConfig> {
  constructor(options = {}) {
    super({
      name: "reddit",
      expectedConfig: expectedConfig,
      receivedConfig: options,
    });
  }

  async getData(config: z.infer<typeof expectedConfig>) {
    try {
      const { qty, subreddit } = config;

      const dataRes = await fetch(
        `https://reddit.com/r/${subreddit}/new.json?sort=new&limit=${qty}`,
      );

      const json = (await dataRes.json()) as RedditResponseRoot;
      const data = json.data.children.map((p) => ({
        title: p.data.title,
      }));

      return data;
    } catch (e) {
      return { error: e instanceof Error ? e.message : (e as string) };
    }
  }
}

export default CallbackReddit;
