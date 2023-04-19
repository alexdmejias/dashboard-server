import CallbackBase from "./base";
import base64Encode from "../utils/base64Encode";

class CallbackReddit extends CallbackBase {
  constructor() {
    super({ name: "reddit" });
  }

  async auth() {
    const username = process.env.REDDIT_USERNAME;
    const password = process.env.REDDIT_PASSWORD;
    const clientId = process.env.REDDIT_CLIENTID;
    const secret = process.env.REDDIT_SECRET;

    if (!username || !password) {
      throw new Error("missing reddit username or password");
    }

    if (!clientId || !secret) {
      throw new Error("missing reddit clientId or secret");
    }

    const data = new URLSearchParams({
      grant_type: "password",
      username,
      password,
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

      const headers = {
        Authorization: `bearer ${authJSON.access_token}`,
      };
      const dataRes = await fetch(
        `https://oauth.reddit.com/r/astoria/new?limit=10`,
        { headers }
      );

      // TODO clean this TS up
      const json = (await dataRes.json()) as {
        data: { children: { data: { title: string } }[] };
      };

      const posts: { title: string }[] = json.data.children.map((p) => ({
        title: p.data.title,
      }));

      return posts;
    } catch (e) {
      return { error: e instanceof Error ? e.message : e };
    }
  }
}

export default CallbackReddit;
