import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

import { RefreshTokenError } from "./auth";
import {
  classifyRefreshFailure,
  describeRefreshFailure,
  refreshSession,
} from "./profileAuth";
import {
  createProfileFromSession,
  type StoredProfile,
} from "../fakts/profileStorageSchema";

const ALIAS = { id: "a1", host: "localhost", ssl: false, challenge: "ht" };

const SESSION = {
  endpoint: {
    name: "test",
    version: "0.1.0",
    base_url: "https://lok.test/lok/f/",
    frontend_url: "https://lok.test/",
    configure: "https://lok.test/configure/{code}",
    device_authorization_endpoint: "https://lok.test/lok/o/app-authorization/",
    token_endpoint: "https://lok.test/lok/o/token/",
  },
  fakts: {
    instances: { lok: { service: "live.arkitekt.lok", identifier: "3", aliases: [ALIAS] } },
    self: { deployment_name: "test", alias: ALIAS },
    statuses: { lok: "granted" },
  },
  token: {
    access_token: "old-at",
    token_type: "Bearer",
    expires_in: 3600,
    refresh_token: "old-rt",
    client_id: "cid",
    received_at: 1_700_000_000_000,
  },
  aliasMap: { aliasMap: { lok: ALIAS } },
};

const profile = (): StoredProfile =>
  createProfileFromSession(SESSION, 1, "id-a");

describe("classifyRefreshFailure", () => {
  it("treats invalid_grant as expired", () => {
    expect(
      classifyRefreshFailure(new RefreshTokenError("nope", 400, "invalid_grant")),
    ).toBe("expired");
  });

  it("treats a bare 401 as expired", () => {
    expect(classifyRefreshFailure(new RefreshTokenError("nope", 401))).toBe("expired");
  });

  it("treats a network failure as unreachable, NOT expired", () => {
    // Marking stale on a blip would greet a user coming back from a tunnel with
    // a list of organizations all claiming to be signed out.
    expect(classifyRefreshFailure(new TypeError("fetch failed"))).toBe("unreachable");
  });

  it("treats an abort as unreachable", () => {
    expect(classifyRefreshFailure(new Error("The operation was aborted"))).toBe(
      "unreachable",
    );
  });

  it("treats a server fault as unknown — it says nothing about our token", () => {
    expect(classifyRefreshFailure(new RefreshTokenError("boom", 500))).toBe("unknown");
  });
});

describe("describeRefreshFailure", () => {
  it("names the organization when one is known", () => {
    const p = { ...profile(), label: { ...profile().label, organizationName: "Acme" } };
    expect(describeRefreshFailure(new RefreshTokenError("x", 400, "invalid_grant"), p))
      .toMatchObject({ kind: "expired", message: expect.stringContaining("Acme") });
  });

  it("falls back to the deployment name", () => {
    expect(describeRefreshFailure(new TypeError("fetch failed"), profile()))
      .toMatchObject({ kind: "unreachable", message: expect.stringContaining("test") });
  });
});

describe("refreshSession", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset();
  });
  afterEach(() => vi.unstubAllGlobals());

  it("returns the rotated refresh token against the profile's own endpoint", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        access_token: "new-at",
        token_type: "Bearer",
        expires_in: 3600,
        refresh_token: "new-rt",
        client_id: "cid",
        instances: SESSION.fakts.instances,
        self: SESSION.fakts.self,
        statuses: {},
      }),
    });

    const session = await refreshSession(profile().session);

    expect(fetchMock.mock.calls[0][0]).toBe("https://lok.test/lok/o/token/");
    expect(session.token.refresh_token).toBe("new-rt");
    expect(session.token.access_token).toBe("new-at");
  });

  it("keeps the profile's existing config when the response carries no envelope", async () => {
    // The server renders the envelope best-effort; its absence means "could not
    // re-render", not "your config went away".
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        access_token: "new-at",
        token_type: "Bearer",
        refresh_token: "new-rt",
        client_id: "cid",
      }),
    });

    const session = await refreshSession(profile().session);

    expect(session.fakts).toEqual(SESSION.fakts);
  });

  it("throws a classifiable error when the endpoint refuses the token", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 400,
      statusText: "Bad Request",
      json: async () => ({ error: "invalid_grant" }),
    });

    await expect(refreshSession(profile().session)).rejects.toBeInstanceOf(RefreshTokenError);
    await expect(refreshSession(profile().session).catch(classifyRefreshFailure)).resolves.toBe(
      "expired",
    );
  });
});
