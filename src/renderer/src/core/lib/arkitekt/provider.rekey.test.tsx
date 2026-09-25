// @vitest-environment jsdom
import { act, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  createProfileFromSession,
  deriveProfileId,
  emptyProfileBook,
  loadStoredProfileBook,
  provisionalProfileId,
  setActiveProfile,
  upsertProfile,
  writeStoredProfileBook,
} from "./fakts/profileStorageSchema";
import { useArkitektActions, useArkitektStore } from "./hooks";
import { ArkitektProvider } from "./provider";
import type { GetToken } from "./types";

/**
 * The worst bug the login refactor found: a profile re-keyed (provisional id →
 * `baseUrl::user::org::hub`, once `mycontext` answers) while its refresh is in
 * flight. The rotation used to write the new token to the OLD id — dropped,
 * since that row is gone — and refuse to adopt it in memory because the
 * active id had changed. The next refresh then replayed the spent token and
 * lok revoked the whole chain. Rotations now find their profile by chain.
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
const BASE = "https://alpha.test/lok/f/";

const session = {
  endpoint: {
    name: "alpha",
    version: "0.1.0",
    base_url: BASE,
    frontend_url: "https://alpha.test/",
    configure: "https://alpha.test/configure/{code}",
    device_authorization_endpoint: "https://alpha.test/lok/o/app-authorization/",
    token_endpoint: "https://alpha.test/lok/o/token/",
  },
  fakts: {
    instances: { lok: { service: "live.arkitekt.lok", identifier: "3", aliases: [ALIAS] } },
    self: { deployment_name: "alpha", alias: ALIAS },
    statuses: { lok: "granted" },
  },
  token: {
    access_token: "at-1",
    token_type: "Bearer",
    expires_in: 3600,
    refresh_token: "rt-1",
    client_id: "chain-alpha",
    received_at: Date.now(),
  },
  aliasMap: { aliasMap: { lok: ALIAS } },
};

class MemoryStorage implements Storage {
  private map = new Map<string, string>();
  get length() { return this.map.size; }
  clear() { this.map.clear(); }
  getItem(key: string) { return this.map.get(key) ?? null; }
  key(index: number) { return Array.from(this.map.keys())[index] ?? null; }
  removeItem(key: string) { this.map.delete(key); }
  setItem(key: string, value: string) { this.map.set(key, value); }
}

let getToken: GetToken | undefined;
const serviceBuilderMap = {
  lok: {
    key: "lok",
    service: "live.arkitekt.lok",
    builder: (options: { getToken: GetToken }) => {
      getToken = options.getToken;
      return { client: {}, dispose: () => {} };
    },
  },
} as never;
const selfServiceBuilder = (() => ({ client: {}, dispose: () => {} })) as never;

let storage: MemoryStorage;
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

beforeEach(() => {
  storage = new MemoryStorage();
  getToken = undefined;
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("a re-key during a refresh", () => {
  it("keeps the rotated token, in the book and in memory", async () => {
    const pendingId = provisionalProfileId(BASE);
    writeStoredProfileBook(
      setActiveProfile(upsertProfile(emptyProfileBook(), createProfileFromSession(session, 1, pendingId)), pendingId),
      storage,
    );

    let answer: (response: Response) => void = () => {};
    const fetchMock = vi.fn(
      () => new Promise<Response>((resolve) => { answer = resolve; }),
    );
    vi.stubGlobal("fetch", fetchMock);

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
    await waitFor(() => expect(getToken).toBeDefined());

    // A client is told its token was rejected: a forced refresh starts...
    const refreshed = getToken!({ forceRefresh: true });
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());

    // ...and lok's `mycontext` answers meanwhile, re-keying the profile.
    const identity = { baseUrl: BASE, userId: "2", organizationId: "3", hubId: "49" };
    const finalId = deriveProfileId(identity);
    act(() => harness.actions.setProfileIdentity(pendingId, { identity }));
    await waitFor(() => expect(loadStoredProfileBook(storage).profiles[finalId]).toBeDefined());

    // Now the token endpoint answers with the rotated token.
    answer(
      new Response(
        JSON.stringify({ ...session.token, access_token: "at-2", refresh_token: "rt-2", ...session.fakts }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );
    await act(async () => {
      await refreshed;
    });

    const book = loadStoredProfileBook(storage);
    expect(Object.keys(book.profiles)).toEqual([finalId]);
    expect(book.profiles[finalId].session.token.refresh_token).toBe("rt-2");
    expect(harness.state().storedSession?.token.refresh_token).toBe("rt-2");
  });
});
