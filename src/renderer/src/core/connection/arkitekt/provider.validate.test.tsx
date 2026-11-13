// @vitest-environment jsdom
import { render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { checkAliasHealth } from "./alias/resolve";
import {
  createProfileFromSession,
  emptyProfileBook,
  PROFILE_BOOK_STORAGE_KEY,
  setActiveProfile,
  upsertProfile,
  writeStoredProfileBook,
} from "./fakts/profileStorageSchema";
import { useArkitektActions, useArkitektStore } from "./hooks";
import { ArkitektProvider } from "./provider";

/**
 * A service is up only on an address that answered in THIS session: at boot
 * it reads `checking` and has no client until one does. Once up, a re-check
 * must be invisible: no trip through `checking` (which unmounts every guarded
 * subtree), no new client when the alias did not move, and no book write for
 * nothing.
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
/** What the service's client calls when a request got no answer. */
let networkError: () => void = () => {};
const serviceBuilderMap = {
  lok: {
    key: "lok",
    service: "live.arkitekt.lok",
    builder: (options: { onNetworkError?: () => void }) => {
      built += 1;
      networkError = options.onNetworkError ?? (() => {});
      return { client: { n: built }, dispose: () => {} };
    },
  },
} as never;
const selfServiceBuilder = (() => ({ client: {}, dispose: () => {} })) as never;

/** Every status the lok service rendered with, in order. */
let statuses: string[] = [];
let retry: () => Promise<void> = async () => {};
const Probe = () => {
  const status = useArkitektStore((s) => s.serviceStates.lok?.status);
  const { retryService } = useArkitektActions();
  retry = () => retryService("lok");
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
  vi.mocked(checkAliasHealth).mockClear();
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
  vi.mocked(checkAliasHealth).mockImplementation(async () => true);
});

describe("checking a service at boot", () => {
  it("has no client until the stored alias answered, then one, and writes nothing", async () => {
    let answer: (ok: boolean) => void = () => {};
    vi.mocked(checkAliasHealth).mockImplementationOnce(() => new Promise<boolean>((resolve) => (answer = resolve)));
    renderProvider();

    await waitFor(() => expect(checkAliasHealth).toHaveBeenCalled());
    // Not ready on last session's word: nothing may be sent there yet.
    expect(statuses[statuses.length - 1]).toBe("checking");
    expect(built).toBe(0);

    answer(true);
    await waitFor(() => expect(statuses[statuses.length - 1]).toBe("ready"));
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(built).toBe(1);
    // A fresh token is used as it is and the alias did not move: a boot that
    // changes nothing writes nothing.
    expect(bookWrites).toBe(0);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("builds the one client on the alias that answers, and writes once, when it moved", async () => {
    vi.mocked(checkAliasHealth).mockImplementation(async (alias) => alias.id === MOVED.id);

    renderProvider();

    await waitFor(() => expect(statuses[statuses.length - 1]).toBe("ready"));
    await new Promise((resolve) => setTimeout(resolve, 20));

    // Never one on the address that no longer answers.
    expect(built).toBe(1);
    // One write: the moved alias.
    expect(bookWrites).toBe(1);
    const stored = JSON.parse(localStorage.getItem(PROFILE_BOOK_STORAGE_KEY)!);
    expect(stored.profiles["id-alpha"].session.aliasMap.aliasMap.lok.id).toBe("a2");
  });
});

describe("re-checking a service that is up", () => {
  it("stays ready, keeps its client and writes nothing when the alias did not move", async () => {
    renderProvider();
    await waitFor(() => expect(statuses[statuses.length - 1]).toBe("ready"));
    statuses = ["ready"];

    await retry();
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(statuses).toEqual(["ready"]);
    expect(built).toBe(1);
    expect(bookWrites).toBe(0);
  });

  it("goes invalid without its client when nothing answers any more, and comes back on a retry", async () => {
    renderProvider();
    await waitFor(() => expect(statuses[statuses.length - 1]).toBe("ready"));

    vi.mocked(checkAliasHealth).mockImplementation(async () => false);
    await retry();
    await waitFor(() => expect(statuses[statuses.length - 1]).toBe("invalid"));

    vi.mocked(checkAliasHealth).mockImplementation(async () => true);
    await retry();
    await waitFor(() => expect(statuses[statuses.length - 1]).toBe("ready"));
    expect(built).toBe(2);
  });
});

describe("a check overtaken by new fakts", () => {
  it("checks the new addresses instead of staying in `checking`", async () => {
    let answer: (ok: boolean) => void = () => {};
    vi.mocked(checkAliasHealth).mockImplementationOnce(() => new Promise<boolean>((resolve) => (answer = resolve)));
    renderProvider();
    await waitFor(() => expect(checkAliasHealth).toHaveBeenCalledTimes(1));

    // Another window rotated the token, and the refresh brought other addresses.
    const rotated = {
      ...session,
      token: { ...session.token, refresh_token: "rt2" },
      fakts: { ...session.fakts, instances: { lok: { ...session.fakts.instances.lok, aliases: [MOVED] } } },
    };
    writeStoredProfileBook(
      setActiveProfile(upsertProfile(emptyProfileBook(), createProfileFromSession(rotated, 1, "id-alpha")), "id-alpha", 10),
      localStorage,
    );
    window.dispatchEvent(new StorageEvent("storage", { key: PROFILE_BOOK_STORAGE_KEY }));
    await waitFor(() => expect(checkAliasHealth).toHaveBeenCalledTimes(1));
    await new Promise((resolve) => setTimeout(resolve, 20));

    // The old address answers, but it is no longer one of the service's.
    answer(true);

    await waitFor(() => expect(statuses[statuses.length - 1]).toBe("ready"));
    expect(vi.mocked(checkAliasHealth).mock.calls.at(-1)?.[0]).toMatchObject({ id: "a2" });
    expect(built).toBe(1);
  });
});

describe("after the first check", () => {
  const ready = async () => {
    renderProvider();
    await waitFor(() => expect(statuses[statuses.length - 1]).toBe("ready"));
    statuses = ["ready"];
    vi.mocked(checkAliasHealth).mockClear();
  };

  it("checks again when the network changed, without leaving ready", async () => {
    await ready();

    window.dispatchEvent(new Event("online"));
    await waitFor(() => expect(checkAliasHealth).toHaveBeenCalledTimes(1), { timeout: 3000 });
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(statuses).toEqual(["ready"]);
    expect(built).toBe(1);
  });

  it("moves to the address that answers now when the network changed under it", async () => {
    await ready();
    vi.mocked(checkAliasHealth).mockImplementation(async (alias) => alias.id === MOVED.id);

    window.dispatchEvent(new Event("online"));
    await waitFor(() => expect(built).toBe(2), { timeout: 5000 });

    // Never through "checking" or "invalid": the page stays up while it moves.
    expect(statuses).toEqual(["ready"]);
  });

  it("checks a service whose client keeps failing to reach it", async () => {
    await ready();

    networkError();
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(checkAliasHealth).not.toHaveBeenCalled();

    networkError();
    await waitFor(() => expect(checkAliasHealth).toHaveBeenCalledTimes(1));
    expect(statuses).toEqual(["ready"]);
  });
});
