// @vitest-environment jsdom
import { render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ArkitektProvider } from "./provider";
import { useArkitektStore } from "./hooks";
import {
  createProfileFromSession,
  emptyProfileBook,
  loadStoredProfileBook,
  PROFILE_BOOK_STORAGE_KEY,
  setActiveProfile,
  upsertProfile,
  writeStoredProfileBook,
} from "./fakts/profileStorageSchema";

// The alias probe does real network work and is not what this file is about.
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

const sessionFor = (host: string) => ({
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
    access_token: "at",
    token_type: "Bearer",
    expires_in: 3600,
    refresh_token: "rt",
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

const bookWith = (profileId: string, host = "alpha.test") =>
  setActiveProfile(
    upsertProfile(
      emptyProfileBook(),
      createProfileFromSession(sessionFor(host), 1, profileId),
    ),
    profileId,
    10,
  );

const serviceBuilderMap = {
  lok: {
    key: "lok",
    service: "live.arkitekt.lok",
    builder: () => ({ client: {}, dispose: () => {} }),
  },
} as never;
const selfServiceBuilder = (() => ({ client: {}, dispose: () => {} })) as never;

/** Every `activeProfileId` this tree rendered with, in order. */
let frames: (string | null)[] = [];

const Probe = () => {
  const activeProfileId = useArkitektStore((s) => s.profileBook.activeProfileId);
  frames.push(activeProfileId);
  return null;
};

const renderProvider = (storageProvider?: () => Promise<Storage>) =>
  render(
    <ArkitektProvider
      manifest={{ identifier: "test", version: "1", scopes: [] } as never}
      serviceBuilderMap={serviceBuilderMap}
      selfServiceBuilder={selfServiceBuilder}
      storageProvider={storageProvider}
    >
      <Probe />
    </ArkitektProvider>,
  );

beforeEach(() => {
  frames = [];
  localStorage.clear();
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("fetch failed")));
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("the profile book is seeded before the first paint", () => {
  it("knows the active profile on the very FIRST render", async () => {
    // This is the whole bug: everything else about startup is async, so paint 1
    // used to know nothing and `AppShell` had to guess "signed out".
    writeStoredProfileBook(bookWith("id-alpha"), localStorage);

    renderProvider();

    expect(frames[0]).toBe("id-alpha");
    await waitFor(() => expect(frames.length).toBeGreaterThan(0));
  });

  it("has no profile on a first launch, so the welcome screen is right", () => {
    renderProvider();
    expect(frames[0]).toBeNull();
  });

  it("does not read localStorage when the caller supplied a storage seam", async () => {
    // A caller that passes `storageProvider` may not be on localStorage at all,
    // and the load is not a pure read — it migrates legacy keys and drops
    // corrupt entries, both of which write.
    writeStoredProfileBook(bookWith("id-alpha"), localStorage);
    const before = localStorage.getItem(PROFILE_BOOK_STORAGE_KEY);
    const storage = new MemoryStorage();

    renderProvider(async () => storage);

    expect(frames[0]).toBeNull();
    // Give the async load its turn; the seam's storage is empty, so nothing
    // about the book changes and localStorage is never touched.
    await new Promise((r) => setTimeout(r, 20));
    expect(localStorage.getItem(PROFILE_BOOK_STORAGE_KEY)).toBe(before);
  });

  it("drops a seeded profile that is no longer persisted", async () => {
    // Another window removed it while this one was already painting its shell.
    // The seed runs in the store initializer; the async load happens after the
    // first paint, so overwriting storage here is exactly that race — and
    // `adoptPersistedBook` must not let the seed resurrect a login that is gone.
    writeStoredProfileBook(bookWith("id-alpha"), localStorage);

    renderProvider();
    expect(frames[0]).toBe("id-alpha");

    writeStoredProfileBook(emptyProfileBook(), localStorage);

    await waitFor(() => expect(frames[frames.length - 1]).toBeNull());
  });
});
