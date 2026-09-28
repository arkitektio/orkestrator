// @vitest-environment jsdom
import { render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { checkAliasHealth, resolveWorkingAlias } from "./alias/resolve";
import {
  createProfileFromSession,
  emptyProfileBook,
  PROFILE_BOOK_STORAGE_KEY,
  setActiveProfile,
  upsertProfile,
  writeStoredProfileBook,
} from "./fakts/profileStorageSchema";
import { useArkitektStore } from "./hooks";
import { ArkitektProvider } from "./provider";

/**
 * A re-check of a service that is already up must be invisible: no trip
 * through `checking` (which unmounts every guarded subtree), no new client
 * when the alias did not move, and no book write for nothing.
 */

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
const MOVED = { id: "a2", host: "elsewhere", ssl: false, challenge: "ht" };

const session = {
  endpoint: {
    name: "alpha",
    version: "0.1.0",
    base_url: "https://alpha.test/lok/f/",
    frontend_url: "https://alpha.test/",
    configure: "https://alpha.test/configure/{code}",
    device_authorization_endpoint: "https://alpha.test/lok/o/app-authorization/",
    token_endpoint: "https://alpha.test/lok/o/token/",
  },
  fakts: {
    instances: { lok: { service: "live.arkitekt.lok", identifier: "3", aliases: [ALIAS, MOVED] } },
    self: { deployment_name: "alpha", alias: ALIAS },
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
};

let built = 0;
const serviceBuilderMap = {
  lok: {
    key: "lok",
    service: "live.arkitekt.lok",
    builder: () => {
      built += 1;
      return { client: { n: built }, dispose: () => {} };
    },
  },
} as never;
const selfServiceBuilder = (() => ({ client: {}, dispose: () => {} })) as never;

/** Every status the lok service rendered with, in order. */
let statuses: string[] = [];
const Probe = () => {
  const status = useArkitektStore((s) => s.serviceStates.lok?.status);
  if (status && statuses[statuses.length - 1] !== status) statuses.push(status);
  return null;
};

const renderProvider = () =>
  render(
    <ArkitektProvider
      manifest={{ identifier: "test", version: "1", scopes: [] } as never}
      serviceBuilderMap={serviceBuilderMap}
      selfServiceBuilder={selfServiceBuilder}
    >
      <Probe />
    </ArkitektProvider>,
  );

let bookWrites = 0;

beforeEach(() => {
  built = 0;
  statuses = [];
  bookWrites = 0;
  localStorage.clear();
  writeStoredProfileBook(
    setActiveProfile(upsertProfile(emptyProfileBook(), createProfileFromSession(session, 1, "id-alpha")), "id-alpha", 10),
    localStorage,
  );
  const setItem = Storage.prototype.setItem;
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(function (this: Storage, key: string, value: string) {
    if (key === PROFILE_BOOK_STORAGE_KEY) bookWrites += 1;
    return setItem.call(this, key, value);
  });
  // Nothing should reach the token endpoint (the stored token is fresh); if
  // something does, it gets a rotated token for the same chain.
  vi.stubGlobal(
    "fetch",
    vi.fn(async () =>
      new Response(
        JSON.stringify({ ...session.token, access_token: "at2", refresh_token: "rt2", ...session.fakts }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    ),
  );
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("re-checking a service at boot", () => {
  it("stays ready, keeps its client and writes nothing when the alias did not move", async () => {
    renderProvider();

    await waitFor(() => expect(checkAliasHealth).toHaveBeenCalled());
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(statuses).not.toContain("checking");
    expect(statuses[statuses.length - 1]).toBe("ready");
    expect(built).toBe(1);
    // A fresh token is used as it is and the alias did not move: a boot that
    // changes nothing writes nothing.
    expect(bookWrites).toBe(0);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("rebuilds the one client, and writes once, when the alias moved", async () => {
    vi.mocked(checkAliasHealth).mockResolvedValueOnce(false);
    vi.mocked(resolveWorkingAlias).mockResolvedValueOnce(MOVED);

    renderProvider();

    await waitFor(() => expect(built).toBe(2));
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(statuses).not.toContain("checking");
    // One write: the moved alias.
    expect(bookWrites).toBe(1);
    const stored = JSON.parse(localStorage.getItem(PROFILE_BOOK_STORAGE_KEY)!);
    expect(stored.profiles["id-alpha"].session.aliasMap.aliasMap.lok.id).toBe("a2");
  });
});
