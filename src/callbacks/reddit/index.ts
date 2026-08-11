import { z } from "zod/v4";
import CallbackBase from "../../base-callbacks/base";
import { getSettings, updateSettings } from "../../settings";

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

type ConfigType = z.infer<typeof expectedConfig>;

const TOKEN_URL = "https://www.reddit.com/api/v1/access_token";
const USER_AGENT = "dashboard/0.1 by u/thruiethruthier";
// Refresh the token a bit early so a request never races an expiry.
const REFRESH_BUFFER_MS = 60_000;

class CallbackReddit extends CallbackBase<RedditPost, typeof expectedConfig> {
  static defaultOptions: ConfigType = {
    title: "default reddit title",
    qty: 3,
    subreddit: "pets",
  };

  #tokenPromise: Promise<string> | null = null;

  constructor(options = {}) {
    super({
      name: "reddit",
      expectedConfig: expectedConfig,
      dbSettingsNeeded: ["redditClientId", "redditClientSecret"],
      receivedConfig: options,
    });
  }

  async getAccessToken(): Promise<string> {
    const { redditAccessToken, redditAccessTokenExpiresAt } = getSettings();

    if (
      redditAccessToken &&
      redditAccessTokenExpiresAt &&
      redditAccessTokenExpiresAt - REFRESH_BUFFER_MS > Date.now()
    ) {
      return redditAccessToken;
    }

    if (!this.#tokenPromise) {
      this.#tokenPromise = this.#fetchAccessToken().finally(() => {
        this.#tokenPromise = null;
      });
    }

    return this.#tokenPromise;
  }

  async #fetchAccessToken(): Promise<string> {
    const { redditClientId, redditClientSecret } = getSettings();
    const authValue = `${redditClientId}:${redditClientSecret}`;

    const res = await fetch(TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": USER_AGENT,
        Authorization: `Basic ${Buffer.from(authValue, "utf8").toString("base64")}`,
      },
      body: "grant_type=client_credentials",
    });

    if (!res.ok) {
      throw new Error(
        `Reddit token request failed: ${res.status} ${res.statusText}`,
      );
    }

    const json = (await res.json()) as {
      access_token: string;
      expires_in: number;
    };

    await updateSettings({
      redditAccessToken: json.access_token,
      redditAccessTokenExpiresAt: Date.now() + json.expires_in * 1000,
    });

    return json.access_token;
  }

  async getData(config: z.infer<typeof expectedConfig>) {
    try {
      const { qty, subreddit } = config;

      const token = await this.getAccessToken();
      const dataRes = await fetch(
        `https://oauth.reddit.com/r/${subreddit}/new.json?sort=new&limit=${qty}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "User-Agent": USER_AGENT,
          },
        },
      );

      if (!dataRes.ok) {
        throw new Error(
          `Failed to fetch data from Reddit: ${dataRes.statusText}`,
        );
      }

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
