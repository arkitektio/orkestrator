import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  pollToken,
  splitGrantResponse,
  splitRefreshResponse,
} from "./pollToken";

/**
 * The device-code poll loop. Its branching is the easiest part of the protocol
 * to get subtly wrong, because the token endpoint inverts the convention the
 * old `/f/challenge/` poll used: "still waiting" arrives as an HTTP **400**
 * carrying `{"error": ...}`, not an HTTP 200 with a status field. Branching on
 * `response.ok` instead of on `error` would treat a decline as retryable and
 * spin forever, and ignoring the server's `interval` earns a `slow_down` on
 * every poll.
 */

const ENVELOPE = {
  self: {
    deployment_name: "test-deployment",
    alias: { id: "self", host: "localhost", ssl: false, challenge: "ht" },
  },
  instances: {
    lok: {
      service: "live.arkitekt.lok",
      identifier: "3",
      aliases: [{ id: "a1", host: "localhost", ssl: false, challenge: "ht" }],
    },
  },
  statuses: { lok: "granted" },
};

const GRANT = {
  access_token: "at",
  refresh_token: "rt",
  token_type: "Bearer",
  expires_in: 3600,
  scope: "openid",
  client_id: "cid",
  ...ENVELOPE,
};

const ok = (body: unknown) => ({
  ok: true,
  status: 200,
  statusText: "OK",
  json: async () => body,
});

/** The token endpoint signals every non-success with HTTP 400 + `error`. */
const oauthError = (error: string) => ({
  ok: false,
  status: 400,
  statusText: "Bad Request",
  json: async () => ({ error }),
});

let fetchMock: ReturnType<typeof vi.fn>;

const poll = (overrides: Partial<Parameters<typeof pollToken>[0]> = {}) =>
  pollToken({
    tokenEndpoint: "https://lok.test/o/token/",
    deviceCode: "dc",
    clientId: "cid",
    controller: new AbortController(),
    interval: 5,
    expiresIn: 300,
    ...overrides,
  });

beforeEach(() => {
  vi.useFakeTimers();
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("pollToken", () => {
  it("splits a successful response into token and config, and stops polling", async () => {
    fetchMock.mockResolvedValue(ok(GRANT));

    const { token, fakts } = await poll();

    expect(token.access_token).toBe("at");
    expect(token.refresh_token).toBe("rt");
    // client_id has to survive onto the token: with no `auth` block left it is
    // the only record of the identity the refresh grant needs.
    expect(token.client_id).toBe("cid");
    expect(token.received_at).toEqual(expect.any(Number));
    expect(fakts.instances.lok.service).toBe("live.arkitekt.lok");
    expect(fakts.statuses).toEqual({ lok: "granted" });
    // The envelope must not leak into the stored token, nor the token into the
    // stored config.
    expect(token).not.toHaveProperty("instances");
    expect(fakts).not.toHaveProperty("access_token");

    // The device code is single-use and burned by this response — polling
    // again would fail.
    await vi.advanceTimersByTimeAsync(60_000);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("sends the device-code grant as form encoding", async () => {
    fetchMock.mockResolvedValue(ok(GRANT));
    await poll();

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://lok.test/o/token/");
    expect(init.headers["Content-Type"]).toBe("application/x-www-form-urlencoded");
    expect(Object.fromEntries(new URLSearchParams(init.body))).toEqual({
      grant_type: "urn:ietf:params:oauth:grant-type:device_code",
      device_code: "dc",
      client_id: "cid",
    });
  });

  it("keeps polling while pending, waiting the server's interval between tries", async () => {
    fetchMock
      .mockResolvedValueOnce(oauthError("authorization_pending"))
      .mockResolvedValueOnce(oauthError("authorization_pending"))
      .mockResolvedValueOnce(ok(GRANT));

    const pending = poll({ interval: 5 });

    await vi.advanceTimersByTimeAsync(0);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    // Nothing at 4s — polling faster than `interval` earns a slow_down.
    await vi.advanceTimersByTimeAsync(4_000);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(1_000);
    expect(fetchMock).toHaveBeenCalledTimes(2);

    await vi.advanceTimersByTimeAsync(5_000);
    expect((await pending).token.access_token).toBe("at");
  });

  it("backs off by 5s when the server says slow_down", async () => {
    fetchMock
      .mockResolvedValueOnce(oauthError("slow_down"))
      .mockResolvedValueOnce(ok(GRANT));

    const pending = poll({ interval: 5 });
    await vi.advanceTimersByTimeAsync(0);

    // The interval is now 10s, not 5s.
    await vi.advanceTimersByTimeAsync(9_000);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(1_000);
    expect((await pending).token.access_token).toBe("at");
  });

  it.each(["access_denied", "expired_token"])(
    "treats %s as terminal instead of retrying",
    async (error) => {
      fetchMock.mockResolvedValue(oauthError(error));

      await expect(poll()).rejects.toThrow();
      // One attempt only: the old challenge loop retried every non-ok response,
      // which against this endpoint would never terminate.
      expect(fetchMock).toHaveBeenCalledTimes(1);
    },
  );

  it("gives up when the code expires, not after a fixed retry count", async () => {
    fetchMock.mockResolvedValue(oauthError("authorization_pending"));

    const pending = poll({ interval: 5, expiresIn: 30 });
    const assertion = expect(pending).rejects.toThrow(/expired/);

    await vi.advanceTimersByTimeAsync(60_000);
    await assertion;

    // ~30s at 5s intervals — far more than the 20 retries the old flow allowed,
    // which would have given up ~20s in, before most humans finish approving.
    expect(fetchMock.mock.calls.length).toBeGreaterThan(5);
  });
});

describe("splitRefreshResponse", () => {
  it("keeps the envelope when the server rendered one", () => {
    const { token, fakts } = splitRefreshResponse(GRANT);
    expect(token.access_token).toBe("at");
    expect(fakts?.statuses).toEqual({ lok: "granted" });
  });

  it("accepts a valid token with no envelope, signalling 'keep current config'", () => {
    // The server appends the envelope best-effort: a rendering failure returns
    // the plain token rather than failing the grant. That must refresh the
    // session, not destroy it.
    const { token, fakts } = splitRefreshResponse({
      access_token: "at2",
      token_type: "Bearer",
      client_id: "cid",
    });

    expect(token.access_token).toBe("at2");
    expect(fakts).toBeNull();
  });

  it("still rejects a response that is not a token at all", () => {
    expect(() => splitRefreshResponse({ error: "invalid_grant" })).toThrow();
  });
});

describe("splitGrantResponse", () => {
  it("requires the envelope — the device-code grant always carries one", () => {
    expect(() =>
      splitGrantResponse({ access_token: "at", token_type: "Bearer", client_id: "cid" }),
    ).toThrow();
  });
});

describe("mesh key on the grant", () => {
  const envelope = {
    access_token: "at",
    token_type: "Bearer",
    client_id: "cid",
    self: { deployment_name: "Lab", alias: { id: "a", host: "go.arkitekt.live", ssl: true, challenge: "ok" } },
    instances: {},
  };
  const auth = { jwks_url: "x", ionscale_auth_key: "tskey-auth-minted", ionscale_coord_url: "https://mesh.example.org" };

  it("comes out of the auth block, and out of the stored token", () => {
    const result = splitGrantResponse({ ...envelope, auth });
    expect(result.mesh).toEqual({ authKey: "tskey-auth-minted", controlUrl: "https://mesh.example.org" });
    expect(result.token).not.toHaveProperty("auth");
    expect(result.fakts).not.toHaveProperty("auth");
  });

  it("is absent when the block is missing or has no key", () => {
    expect(splitGrantResponse(envelope).mesh).toBeUndefined();
    expect(splitGrantResponse({ ...envelope, auth: { jwks_url: "x" } }).mesh).toBeUndefined();
    expect(splitGrantResponse({ ...envelope, auth: null }).mesh).toBeUndefined();
  });

  it("is dropped from a refresh response", () => {
    const result = splitRefreshResponse({ ...envelope, auth });
    expect(result).not.toHaveProperty("mesh");
    expect(result.token).not.toHaveProperty("auth");
  });
});
