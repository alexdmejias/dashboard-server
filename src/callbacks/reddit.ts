import CallbackBase from "./base";
import base64Encode from "../utils/base64Encode";
import { RedditResponseRoot } from "../types";
import logger from "../logger";

type RedditPost = { title: string }[];

class CallbackReddit extends CallbackBase<RedditPost> {
  constructor() {
    super({
      name: "reddit",
      envVariablesNeeded: [
        "REDDIT_USERNAME",
        "REDDIT_PASSWORD",
        "REDDIT_CLIENTID",
        "REDDIT_SECRET",
      ],
    });
  }

  getEnvVariables() {
    const username = process.env.REDDIT_USERNAME;
    const password = process.env.REDDIT_PASSWORD;
    const clientId = process.env.REDDIT_CLIENTID;
    const secret = process.env.REDDIT_SECRET;

    return {
      username,
      password,
      clientId,
      secret,
    };
  }

  async auth() {
    const { username, password, clientId, secret } = this.getEnvVariables();

    const data = new URLSearchParams({
      grant_type: "password",
      username: username as string,
      password: password as string,
    });

    const res = await fetch("https://www.reddit.com/api/v1/access_token", {
      method: "POST",
      headers: {
        Authorization: "Basic " + base64Encode(`${clientId}:${secret}`),
      },
      body: data,
    });

    const json = await res.json();

    if (json.error) {
      throw new Error(json.error);
    }

    return json;
  }

  async getData() {
    try {
      const authJSON = await this.auth();
      const subreddit = process.env.REDDIT_SUBREDDIT;
      const qty = process.env.REDDIT_POST_QTY;

      if (!qty || !subreddit) {
        throw new Error("missing reddit subreddit or reddit post qty");
      }

      const dataRes = await fetch(
        `https://oauth.reddit.com/r/${subreddit}/new?limit=${qty}`,
        {
          headers: {
            Authorization: `bearer ${authJSON.access_token}`,
          },
        }
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
