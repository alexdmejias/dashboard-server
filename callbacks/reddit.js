import CallbackBase from "./base.js";
import base64Encode from "../utils/base64Encode.js";

class CallbackReddit extends CallbackBase {
  constructor() {
    super("reddit");
  }

  async auth() {
    const username = process.env.REDDIT_USERNAME;
    const password = process.env.REDDIT_PASSWORD;
    const clientId = process.env.REDDIT_CLIENTID;
    const secret = process.env.REDDIT_SECRET;

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

      const json = await dataRes.json();

      const posts = json.data.children.map((p) => ({
        title: p.data.title,
      }));

      return posts;
    } catch (e) {
      return {
        error: e.message || e,
      };
    }
  }
}

export default CallbackReddit;
