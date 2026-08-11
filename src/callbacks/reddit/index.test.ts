import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  vi,
  type Mock,
} from "vitest";
import { _resetForTesting, initSettings, updateSettings } from "../../settings";
import CallbackReddit from "./index";

const TOKEN_URL = "https://www.reddit.com/api/v1/access_token";

function mockTokenResponse(access_token: string, expires_in = 3600) {
  return {
    ok: true,
    status: 200,
    json: vi.fn().mockResolvedValue({ access_token, expires_in }),
    text: vi.fn().mockResolvedValue(""),
  };
}

function mockListingResponse(titles: string[]) {
  return {
    ok: true,
    status: 200,
    json: vi
      .fn()
      .mockResolvedValue({ kind: "Listing", data: { children: [] } }),
  };
}

describe("CallbackReddit", () => {
  let originalFetch: typeof global.fetch;
  let callback: CallbackReddit;

  beforeEach(async () => {
    _resetForTesting();
    await initSettings();
    await updateSettings({
      redditClientId: "test-client-id",
      redditClientSecret: "test-client-secret",
    });
    originalFetch = global.fetch;
    callback = new CallbackReddit({ subreddit: "pets", qty: 3 });
  });

  afterEach(() => {
    global.fetch = originalFetch;
    _resetForTesting();
  });

  describe("construction", () => {
    it("throws when reddit client credentials are missing from settings", async () => {
      _resetForTesting();
      await initSettings();
      // Clear any credentials that may have been loaded from settings.json
      await updateSettings({
        redditClientId: undefined,
        redditClientSecret: undefined,
      });
      expect(() => new CallbackReddit({ subreddit: "pets", qty: 3 })).toThrow(
        /reddit callback requires the following settings to be configured/i,
      );
    });
  });

  describe("getAccessToken", () => {
    it("mints a new token via client_credentials grant when none is cached", async () => {
      const fetchMock = vi
        .fn()
        .mockResolvedValue(mockTokenResponse("fresh-access-token", 3600));
      global.fetch = fetchMock as any;

      const token = await callback.getAccessToken();

      expect(token).toBe("fresh-access-token");
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(fetchMock).toHaveBeenCalledWith(
        TOKEN_URL,
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            "Content-Type": "application/x-www-form-urlencoded",
            Authorization: expect.stringMatching(/^Basic /),
            "User-Agent": expect.any(String),
          }),
          body: "grant_type=client_credentials",
        }),
      );
    });

    it("uses HTTP Basic auth header derived from configured client id/secret", async () => {
      global.fetch = vi
        .fn()
        .mockResolvedValue(mockTokenResponse("token", 3600)) as any;

      await callback.getAccessToken();

      const call = (global.fetch as Mock).mock.calls[0];
      const authHeader = call[1].headers.Authorization;
      const decoded = Buffer.from(
        authHeader.replace(/^Basic /, ""),
        "base64",
      ).toString("utf8");
      expect(decoded).toBe("test-client-id:test-client-secret");
    });

    it("does not fetch a new token while the cached one is still valid", async () => {
      const fetchMock = vi
        .fn()
        .mockResolvedValue(mockTokenResponse("first-token", 3600)) as any;
      global.fetch = fetchMock;

      await callback.getAccessToken();
      await callback.getAccessToken();

      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it("refreshes the token when the cached one has expired", async () => {
      await updateSettings({
        redditAccessToken: "stale-token",
        // expired 5 minutes ago
        redditAccessTokenExpiresAt: Date.now() - 5 * 60 * 1000,
      });

      const fetchMock = vi
        .fn()
        .mockResolvedValue(mockTokenResponse("new-token", 3600)) as any;
      global.fetch = fetchMock;

      const token = await callback.getAccessToken();

      expect(token).toBe("new-token");
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it("refreshes proactively within the refresh buffer before expiry", async () => {
      // expires in 10 seconds – inside the 60s buffer
      await updateSettings({
        redditAccessToken: "about-to-expire",
        redditAccessTokenExpiresAt: Date.now() + 10 * 1000,
      });

      global.fetch = vi
        .fn()
        .mockResolvedValue(mockTokenResponse("refreshed", 3600)) as any;

      const token = await callback.getAccessToken();
      expect(token).toBe("refreshed");
    });

    it("persists the new token and expiry to settings", async () => {
      global.fetch = vi
        .fn()
        .mockResolvedValue(mockTokenResponse("persisted-token", 3600)) as any;

      await callback.getAccessToken();

      // settings are persisted via updateSettings – reload and check
      const { getSettings } = await import("../../settings");
      const settings = getSettings();
      expect(settings.redditAccessToken).toBe("persisted-token");
      expect(typeof settings.redditAccessTokenExpiresAt).toBe("number");
      expect(settings.redditAccessTokenExpiresAt).toBeGreaterThan(Date.now());
    });

    it("throws when Reddit token endpoint returns a non-OK status", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        statusText: "Unauthorized",
        text: vi.fn().mockResolvedValue("invalid_grant"),
      }) as any;

      await expect(callback.getAccessToken()).rejects.toThrow(
        /401 Unauthorized/,
      );
    });

    it("dedupes concurrent in-flight token requests", async () => {
      let resolveJson: (v: any) => void = () => {};
      const jsonPromise = new Promise((resolve) => {
        resolveJson = resolve;
      });
      global.fetch = vi.fn().mockImplementation(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: () => jsonPromise,
          text: vi.fn().mockResolvedValue(""),
        }),
      ) as any;

      const p1 = callback.getAccessToken();
      const p2 = callback.getAccessToken();

      resolveJson({ access_token: "shared-token", expires_in: 3600 });

      await Promise.all([p1, p2]);

      expect((global.fetch as Mock).mock.calls.length).toBe(1);
    });
  });

  describe("getData", () => {
    it("sends the cached access token as a Bearer header on the data request", async () => {
      await updateSettings({
        redditAccessToken: "valid-token",
        redditAccessTokenExpiresAt: Date.now() + 60 * 60 * 1000,
      });

      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue({
          kind: "Listing",
          data: {
            children: [
              { kind: "t3", data: { title: "Post A" } },
              { kind: "t3", data: { title: "Post B" } },
            ],
          },
        }),
      }) as any;
      global.fetch = fetchMock;

      const data = await callback.getData({ subreddit: "golang", qty: 2 });

      // Only the data request should have been made (token was valid)
      expect((global.fetch as Mock).mock.calls.length).toBe(1);
      const [url, init] = (global.fetch as Mock).mock.calls[0];
      expect(url).toBe(
        "https://oauth.reddit.com/r/golang/new.json?sort=new&limit=2",
      );
      expect(init.headers.Authorization).toBe("Bearer valid-token");

      expect(data).toEqual([{ title: "Post A" }, { title: "Post B" }]);
    });

    it("refreshes the token then uses it for the data request when expired", async () => {
      await updateSettings({
        redditAccessToken: "stale-token",
        redditAccessTokenExpiresAt: Date.now() - 1000,
      });

      let callCount = 0;
      global.fetch = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve(mockTokenResponse("refreshed-token", 3600));
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          json: vi.fn().mockResolvedValue({
            kind: "Listing",
            data: { children: [] },
          }),
        });
      }) as any;

      const data = await callback.getData({ subreddit: "pets", qty: 3 });

      expect((global.fetch as Mock).mock.calls.length).toBe(2);
      const dataCall = (global.fetch as Mock).mock.calls[1];
      expect(dataCall[1].headers.Authorization).toBe("Bearer refreshed-token");
      expect(data).toEqual([]);
    });

    it("returns an error object when the data request fails", async () => {
      await updateSettings({
        redditAccessToken: "valid-token",
        redditAccessTokenExpiresAt: Date.now() + 60 * 60 * 1000,
      });

      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: "Server Error",
      }) as any;

      const data = await callback.getData({ subreddit: "pets", qty: 3 });
      expect(data).toEqual({
        error: expect.stringContaining("Failed to fetch"),
      });
    });
  });
});
