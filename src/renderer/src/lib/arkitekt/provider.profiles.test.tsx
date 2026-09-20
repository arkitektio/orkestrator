// @vitest-environment jsdom
import { render, waitFor } from "@testing-library/react";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ArkitektProvider } from "./provider";
import { useArkitektActions, useArkitektStore } from "./hooks";
import {
  createProfileFromSession,
  emptyProfileBook,
  loadStoredProfileBook,
  PROFILE_BOOK_STORAGE_KEY,
  setActiveProfile,
  updateProfileSession,
  upsertProfile,
  writeStoredProfileBook,
} from "./fakts/profileStorageSchema";

// The alias probe does real network work and is not what these tests are about:
// pin it so every service resolves to its first alias instantly.
vi.mock("./builder", () => ({
  buildAliases: vi.fn(async ({ fakts }) => ({
    aliasReports: { lok: { valid: true } },
    aliasMap: { lok: fakts.instances.lok.aliases[0] },
  })),
}));
vi.mock("./alias/resolve", () => ({
  checkAliasHealth: vi.fn(async () => true),
  resolveWorkingAlias: vi.fn(async ({ instance }) => instance.aliases[0]),
}));
vi.mock("./utils", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./utils")>()),
  enhanceManifest: vi.fn(async (m) => ({ ...m, node_id: "node" })),
  report: vi.fn(async () => true),
}));

const ALIAS = { id: "a1", host: "localhost", ssl: false, challenge: "ht" };

const sessionFor = (host: string, accessToken: string) => ({
  endpoint: {
    name: `deployment at ${host}`,
    version: "0.1.0",
    base_url: `https://${host}/lok/f/`,
    frontend_url: `https://${host}/`,
    configure: `https://${host}/configure/{code}`,
    device_authorization_endpoint: `https://${host}/lok/o/app-authorization/`,
    token_endpoint: `https://${host}/lok/o/token/`,
  },
  fakts: {
    instances: { lok: { service: "live.arkitekt.lok", identifier: "3", aliases: [ALIAS] } },
    self: { deployment_name: host, alias: ALIAS },
    statuses: { lok: "granted" },
  },
  token: {
    access_token: accessToken,
    token_type: "Bearer",
    expires_in: 3600,
    refresh_token: `rt-${accessToken}`,
    client_id: "cid",
    received_at: Date.now(),
  },
  aliasMap: { aliasMap: { lok: ALIAS } },
});

class MemoryStorage implements Storage {
  private map = new Map<string, string>();
  get length() { return this.map.size; }
  clear() { this.map.clear(); }
  getItem(key: string) { return this.map.get(key) ?? null; }
  key(index: number) { return Array.from(this.map.keys())[index] ?? null; }
  removeItem(key: string) { this.map.delete(key); }
  setItem(key: string, value: string) { this.map.set(key, value); }
}

/** Records every client it builds, so teardown can be asserted. */
const built: { key: string; disposed: boolean; token: string }[] = [];

const makeBuilder = (key: string) => ({
  key,
  service: `live.arkitekt.${key}`,
  builder: ({ fakts }: { fakts: { self: { deployment_name: string } } }) => {
    const record = { key, disposed: false, token: fakts.self.deployment_name };
    built.push(record);
    return { client: {}, dispose: () => { record.disposed = true; } };
  },
});

const serviceBuilderMap = { lok: makeBuilder("lok") } as never;
const selfServiceBuilder = (({ fakts }: { fakts: { self: { deployment_name: string } } }) => {
  const record = { key: "self", disposed: false, token: fakts.self.deployment_name };
  built.push(record);
  return { client: {}, dispose: () => { record.disposed = true; } };
}) as never;

let storage: MemoryStorage;
let fetchMock: ReturnType<typeof vi.fn>;

/** Exposes the store + actions to the test body. */
let harness: {
  state: () => ReturnType<typeof useArkitektStore>;
  actions: ReturnType<typeof useArkitektActions>;
};

const Probe = () => {
  const state = useArkitektStore((s) => s);
  const actions = useArkitektActions();
  harness = { state: () => state, actions };
  return null;
};

const renderProvider = () =>
  render(
    <ArkitektProvider
      manifest={{ identifier: "test", version: "1", scopes: [] } as never}
      serviceBuilderMap={serviceBuilderMap}
      selfServiceBuilder={selfServiceBuilder}
      storageProvider={async () => storage}
    >
      <Probe />
    </ArkitektProvider>,
  );

const seedTwoProfiles = () => {
  const alpha = createProfileFromSession(sessionFor("alpha.test", "alpha-1"), 1, "id-alpha");
  const beta = createProfileFromSession(sessionFor("beta.test", "beta-1"), 2, "id-beta");
  const book = setActiveProfile(
    upsertProfile(upsertProfile(emptyProfileBook(), alpha), beta),
    "id-alpha",
    10,
  );
  writeStoredProfileBook(book, storage);
};

/** A token endpoint that always says yes, minting a rotated refresh token. */
const okRefresh = (accessToken: string) => ({
  ok: true,
  status: 200,
  json: async () => ({
    access_token: accessToken,
    token_type: "Bearer",
    expires_in: 3600,
    refresh_token: `rt-${accessToken}`,
    client_id: "cid",
  }),
});

beforeEach(() => {
  storage = new MemoryStorage();
  built.length = 0;
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("bootstrap from the profile book", () => {
  it("brings the active profile up and leaves the other parked", async () => {
    seedTwoProfiles();
    fetchMock.mockResolvedValue(okRefresh("alpha-2"));

    renderProvider();

    await waitFor(() => expect(harness.state().connection).toBeDefined());
    expect(harness.state().profileBook.activeProfileId).toBe("id-alpha");
    expect(Object.keys(harness.state().profileBook.profiles)).toHaveLength(2);
    // The rotated refresh token is persisted, not just held in memory.
    expect(harness.state().profileBook.profiles["id-alpha"].session.token.refresh_token)
      .toBe("rt-alpha-2");
    expect(harness.state().profileBook.profiles["id-beta"].session.token.refresh_token)
      .toBe("rt-beta-1");
  });

  it("keeps the book when the active profile fails to come up", async () => {
    // Failing to bring ONE profile up is not a reason to forget the user's
    // other logins — they stay one click away in the switcher.
    seedTwoProfiles();
    fetchMock.mockResolvedValue({
      ok: false, status: 400, statusText: "Bad Request",
      json: async () => ({ error: "invalid_grant" }),
    });

    renderProvider();

    await waitFor(() => expect(harness.state().hasBootstrapped).toBe(true));
    expect(harness.state().connection).toBeUndefined();
    expect(Object.keys(harness.state().profileBook.profiles)).toHaveLength(2);
    expect(harness.state().profileBook.profiles["id-alpha"].status).toBe("stale");
  });
});

describe("switchProfile", () => {
  const bootUp = async () => {
    seedTwoProfiles();
    fetchMock.mockResolvedValue(okRefresh("alpha-2"));
    renderProvider();
    await waitFor(() => expect(harness.state().connection).toBeDefined());
    built.length = 0;
  };

  it("swaps the connection and disposes the previous clients", async () => {
    await bootUp();
    fetchMock.mockResolvedValue(okRefresh("beta-2"));

    await harness.actions.switchProfile("id-beta");

    await waitFor(() =>
      expect(harness.state().profileBook.activeProfileId).toBe("id-beta"),
    );
    expect(harness.state().storedSession?.fakts.self.deployment_name).toBe("beta.test");
    // Every Apollo client / graphql-ws socket of the previous profile is torn
    // down rather than orphaned.
    expect(built.filter((b) => b.token === "alpha.test").every((b) => b.disposed)).toBe(true);
    expect(built.some((b) => b.token === "beta.test" && !b.disposed)).toBe(true);
  });

  it("leaves the current connection intact when the parked token is dead", async () => {
    // The whole reason the credential is proven before anything is torn down:
    // otherwise a failed switch leaves the user with a dead app and a browser
    // round-trip to get back.
    await bootUp();
    const before = harness.state().connection;

    fetchMock.mockResolvedValue({
      ok: false, status: 400, statusText: "Bad Request",
      json: async () => ({ error: "invalid_grant" }),
    });

    await expect(harness.actions.switchProfile("id-beta")).rejects.toThrow();

    expect(harness.state().connection).toBe(before);
    expect(harness.state().profileBook.activeProfileId).toBe("id-alpha");
    expect(harness.state().profileBook.profiles["id-beta"].status).toBe("stale");
    expect(harness.state().switchingProfileId).toBeNull();
  });

  it("does NOT mark a profile stale when the deployment is merely unreachable", async () => {
    // A network blip says nothing about the credential. Marking on one would
    // greet a user coming back from a tunnel with a list of organizations all
    // claiming to be signed out.
    await bootUp();
    fetchMock.mockRejectedValue(new TypeError("fetch failed"));

    await expect(harness.actions.switchProfile("id-beta")).rejects.toThrow();

    expect(harness.state().profileBook.profiles["id-beta"].status).toBe("ok");
    expect(harness.state().connection).toBeDefined();
  });

  it("persists the rotated refresh token before swapping the connection", async () => {
    // Refresh tokens rotate on use: if the swap threw after a successful
    // refresh and we had not written, the parked profile would have lost its
    // only refresh token and be permanently dead.
    await bootUp();
    fetchMock.mockResolvedValue(okRefresh("beta-2"));

    await harness.actions.switchProfile("id-beta");

    const persisted = JSON.parse(storage.getItem(PROFILE_BOOK_STORAGE_KEY)!);
    expect(persisted.profiles["id-beta"].session.token.refresh_token).toBe("rt-beta-2");
  });
});

describe("disconnect / forgetAllProfiles", () => {
  const bootUp = async () => {
    seedTwoProfiles();
    fetchMock.mockResolvedValue(okRefresh("alpha-2"));
    renderProvider();
    await waitFor(() => expect(harness.state().connection).toBeDefined());
  };

  it("disconnect parks the active profile, keeping every login", async () => {
    await bootUp();

    await harness.actions.disconnect();

    expect(harness.state().connection).toBeUndefined();
    expect(harness.state().profileBook.activeProfileId).toBeNull();
    expect(Object.keys(harness.state().profileBook.profiles)).toHaveLength(2);
  });

  it("forgetAllProfiles empties the book but remembers the deployment", async () => {
    await bootUp();

    await harness.actions.forgetAllProfiles();

    expect(harness.state().profileBook.profiles).toEqual({});
    expect(harness.state().profileBook.activeProfileId).toBeNull();
    // Forgetting the logins should not also forget which deployment this
    // machine talks to.
    expect(harness.state().profileBook.lastEndpoint).not.toBeNull();
  });

  it("removeProfile of a parked profile leaves the live one alone", async () => {
    await bootUp();

    await harness.actions.removeProfile("id-beta");

    expect(harness.state().connection).toBeDefined();
    expect(Object.keys(harness.state().profileBook.profiles)).toEqual(["id-alpha"]);
  });
});

describe("several windows sharing one book", () => {
  // Popouts run the same shell at the same origin: same storage, separate
  // providers. lok rotates the refresh token on every use and revokes the whole
  // chain on a replay, so a window must never send a token another window has
  // already spent.

  /** What storage looks like after another window rotated `profileId`. */
  const rotatedElsewhere = (profileId: string, accessToken: string) => {
    const book = loadStoredProfileBook(storage);
    const profile = book.profiles[profileId];
    writeStoredProfileBook(
      updateProfileSession(book, profileId, {
        ...profile.session,
        token: { ...profile.session.token, access_token: accessToken, refresh_token: `rt-${accessToken}`, received_at: Date.now() },
      }),
      storage,
    );
  };

  const bootUp = async () => {
    seedTwoProfiles();
    fetchMock.mockResolvedValue(okRefresh("alpha-2"));
    renderProvider();
    await waitFor(() => expect(harness.state().connection).toBeDefined());
    fetchMock.mockClear();
  };

  it("bootstrap adopts a rotation that landed between reading the book and refreshing", async () => {
    seedTwoProfiles();
    // The book is read once to pick the active profile, then re-read under the
    // lock. Between the two, "another window" rotates alpha.
    const realGetItem = storage.getItem.bind(storage);
    let reads = 0;
    vi.spyOn(storage, "getItem").mockImplementation((key: string) => {
      if (key === PROFILE_BOOK_STORAGE_KEY && ++reads === 2) {
        rotatedElsewhere("id-alpha", "alpha-9");
      }
      return realGetItem(key);
    });
    fetchMock.mockResolvedValue(okRefresh("alpha-2"));

    renderProvider();

    await waitFor(() => expect(harness.state().connection).toBeDefined());
    expect(fetchMock).not.toHaveBeenCalled();
    expect(harness.state().storedSession?.token.refresh_token).toBe("rt-alpha-9");
    expect(harness.state().connection?.token.refresh_token).toBe("rt-alpha-9");
  });

  it("a storage event from another window replaces the live token", async () => {
    await bootUp();

    rotatedElsewhere("id-alpha", "alpha-7");
    window.dispatchEvent(new StorageEvent("storage", { key: PROFILE_BOOK_STORAGE_KEY }));

    await waitFor(() =>
      expect(harness.state().storedSession?.token.refresh_token).toBe("rt-alpha-7"),
    );
    expect(harness.state().connection?.token.refresh_token).toBe("rt-alpha-7");
    expect(harness.state().profileBook.profiles["id-alpha"].session.token.refresh_token)
      .toBe("rt-alpha-7");
    // Still our window's choice of profile.
    expect(harness.state().profileBook.activeProfileId).toBe("id-alpha");
  });

  it("writing the book does not clobber another window's rotation of a parked profile", async () => {
    await bootUp();

    // Another window is live on beta and rotated it; this window still holds
    // beta's old token in memory.
    rotatedElsewhere("id-beta", "beta-9");

    await harness.actions.disconnect();

    const persisted = loadStoredProfileBook(storage);
    expect(persisted.profiles["id-beta"].session.token.refresh_token).toBe("rt-beta-9");
    expect(persisted.activeProfileId).toBeNull();
  });
});

describe("React StrictMode", () => {
  it("double-running the bootstrap effect spends the refresh token once", async () => {
    // StrictMode mounts, unmounts and mounts again in development, so the
    // bootstrap effect runs twice with the same stored token. The second run
    // must adopt the first's rotation; replaying the token would make lok
    // revoke the whole chain.
    seedTwoProfiles();
    fetchMock.mockResolvedValue(okRefresh("alpha-2"));

    render(
      <React.StrictMode>
        <ArkitektProvider
          manifest={{ identifier: "test", version: "1", scopes: [] } as never}
          serviceBuilderMap={serviceBuilderMap}
          selfServiceBuilder={selfServiceBuilder}
          storageProvider={async () => storage}
        >
          <Probe />
        </ArkitektProvider>
      </React.StrictMode>,
    );

    await waitFor(() => expect(harness.state().connection).toBeDefined());
    // Let the second run settle too.
    await new Promise((r) => setTimeout(r, 20));

    const tokenCalls = fetchMock.mock.calls.filter(([url]) => String(url).endsWith("/o/token/"));
    expect(tokenCalls).toHaveLength(1);
    expect(loadStoredProfileBook(storage).profiles["id-alpha"].session.token.refresh_token)
      .toBe("rt-alpha-2");
    expect(harness.state().storedSession?.token.refresh_token).toBe("rt-alpha-2");
  });
});
