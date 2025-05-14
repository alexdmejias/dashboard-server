import CallbackBase from "../base-callbacks/base";
import base64Encode from "../utils/base64Encode";
import logger from "../logger";
import { z } from "zod";

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

const expectedConfig = z.object({
  subreddit: z.string(),
  qty: z.number().positive(),
});

class CallbackReddit extends CallbackBase<RedditPost, typeof expectedConfig> {
  constructor(options = {}) {
    super({
      name: "reddit",
      expectedConfig: expectedConfig,
      receivedConfig: options,
    });
  }

  async getData() {
    try {
      const subreddit = process.env.REDDIT_SUBREDDIT || "asknyc";
      const qty = process.env.REDDIT_POST_QTY || 10;

      if (!qty || !subreddit) {
        throw new Error("missing reddit subreddit or reddit post qty");
      }

      const dataRes = await fetch(
        `https://reddit.com/r/${subreddit}/new.json?sort=new&limit=${qty}`
      );

      const json: RedditResponseRoot = await dataRes.json();
      const posts = json.data.children.map((p) => ({
        title: p.data.title,
      }));

      return posts;
    } catch (e) {
      return { error: e instanceof Error ? e.message : (e as string) };
    }
  }
}

export default CallbackReddit;
