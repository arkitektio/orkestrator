// @vitest-environment jsdom
import { act, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { flow } from "./fakts/flow";
import {
  createProfileFromSession,
  deriveProfileId,
  emptyProfileBook,
  loadStoredProfileBook,
  PROFILE_BOOK_STORAGE_KEY,
  setActiveProfile,
  upsertProfile,
  writeStoredProfileBook,
} from "./fakts/profileStorageSchema";
import { useArkitektActions, useArkitektStore } from "./hooks";
import { ArkitektProvider } from "./provider";
import { report } from "./utils";
import { claimProfileMesh, joinAndPark } from "@/lib/mesh/profileMesh";

/**
 * A fresh grant: what it writes, in what order, and what it leaves alone when
 * it fails. The browser round trip itself (`flow`) is faked.
 */

vi.mock("./fakts/flow", () => ({ flow: vi.fn() }));
vi.mock("./alias/resolve", () => ({
  checkAliasHealth: vi.fn(async () => true),
  resolveWorkingAlias: vi.fn(async ({ instance }) => instance.aliases[0]),
}));
vi.mock("./utils", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./utils")>()),
  enhanceManifest: vi.fn(async (m) => ({ ...m, node_id: "node" })),
  report: vi.fn(async () => true),
}));
vi.mock("@/lib/mesh/profileMesh", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/mesh/profileMesh")>()),
  claimProfileMesh: vi.fn(async () => {}),
  joinAndPark: vi.fn(async () => "running"),
}));

const ALIAS = { id: "a1", host: "localhost", ssl: false, challenge: "ht" };
const BASE = "https://alpha.test/lok/f/";

const endpoint = {
  name: "alpha",
  version: "0.1.0",
  base_url: BASE,
  frontend_url: "https://alpha.test/",
  configure: "https://alpha.test/configure/{code}",
  device_authorization_endpoint: "https://alpha.test/lok/o/app-authorization/",
  token_endpoint: "https://alpha.test/lok/o/token/",
  mesh_coord_url: "https://mesh.alpha.test",
};

const fakts = {
  instances: { lok: { service: "live.arkitekt.lok", identifier: "3", aliases: [ALIAS] } },
  self: { deployment_name: "alpha", alias: ALIAS },
  statuses: { lok: "granted" },
};

const token = (at: string) => ({
  access_token: at,
  token_type: "Bearer",
  expires_in: 3600,
  refresh_token: `rt-${at}`,
  client_id: "cid",
  received_at: Date.now(),
});

const grant = (overrides: Record<string, unknown> = {}) => ({
  fakts,
  token: token("granted"),
  mesh: { authKey: "tskey-once", controlUrl: "https://mesh.alpha.test" },
  identity: { userId: "2", orgId: "3", hubId: "49" },
  ...overrides,
});

const FINAL_ID = deriveProfileId({ baseUrl: BASE, userId: "2", organizationId: "3", hubId: "49" });

class MemoryStorage implements Storage {
  private map = new Map<string, string>();
  get length() { return this.map.size; }
  clear() { this.map.clear(); }
  getItem(key: string) { return this.map.get(key) ?? null; }
  key(index: number) { return Array.from(this.map.keys())[index] ?? null; }
  removeItem(key: string) { this.map.delete(key); }
  setItem(key: string, value: string) { this.map.set(key, value); }
}

const serviceBuilderMap = {
  lok: { key: "lok", service: "live.arkitekt.lok", builder: () => ({ client: {}, dispose: () => {} }) },
} as never;
const selfServiceBuilder = (() => ({ client: {}, dispose: () => {} })) as never;

let storage: MemoryStorage;
/** What happened, in order: book writes and mesh claims. */
let events: string[];

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
      manifest={{ identifier: "test", version: "1", scopes: [], requirements: [{ key: "lok" }] } as never}
      serviceBuilderMap={serviceBuilderMap}
      selfServiceBuilder={selfServiceBuilder}
      storageProvider={async () => storage}
    >
      <Probe />
    </ArkitektProvider>,
  );

const connect = async () => {
  await act(async () => {
    await harness.actions.connect({ endpoint, controller: new AbortController() } as never);
  });
};

beforeEach(() => {
  storage = new MemoryStorage();
  events = [];
  const setItem = storage.setItem.bind(storage);
  storage.setItem = (key: string, value: string) => {
    if (key === PROFILE_BOOK_STORAGE_KEY) {
      const book = JSON.parse(value);
      events.push(`write:${Object.keys(book.profiles).join(",")}`);
    }
    setItem(key, value);
  };
  vi.mocked(claimProfileMesh).mockImplementation(async (_mesh, key) => {
    events.push(`claim:${key}`);
  });
  vi.mocked(joinAndPark).mockImplementation(async (_mesh, key) => {
    events.push(`join:${key}`);
    return "running";
  });
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("offline")));
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

describe("a fresh grant", () => {
  it("is admitted under its final id in one write, after the mesh claim", async () => {
    vi.mocked(flow).mockResolvedValue(grant() as never);
    renderProvider();
    await waitFor(() => expect(harness.state().activity.kind).not.toBe("booting"));

    await connect();

    const book = loadStoredProfileBook(storage);
    expect(Object.keys(book.profiles)).toEqual([FINAL_ID]);
    expect(book.activeProfileId).toBe(FINAL_ID);
    expect(book.profiles[FINAL_ID].identity).toMatchObject({ userId: "2", organizationId: "3", hubId: "49" });
    // Only the admission writes a profile, and the node is already joining by
    // then — once, to register, since none of this hub's addresses is on the mesh.
    const admission = events.findIndex((event) => event === `write:${FINAL_ID}`);
    expect(events.indexOf("join:tskey-once")).toBeLessThan(admission);
    expect(events.indexOf("join:tskey-once")).toBeGreaterThanOrEqual(0);
    expect(claimProfileMesh).not.toHaveBeenCalled();
    expect(events.filter((event) => event.startsWith("write:") && event !== "write:")).toHaveLength(2); // admission + the alias the check resolved
  });

  it("a hub with an address on the mesh gets its node for good, not joined-and-parked", async () => {
    const MESH_ALIAS = { id: "m1", host: "mikro.lab.mesh.alpha.test", ssl: true, challenge: "ht" };
    vi.mocked(flow).mockResolvedValue(
      grant({ fakts: { ...fakts, instances: { lok: { ...fakts.instances.lok, aliases: [ALIAS, MESH_ALIAS] } } } }) as never,
    );
    renderProvider();
    await waitFor(() => expect(harness.state().activity.kind).not.toBe("booting"));

    await connect();

    expect(events).toContain("claim:tskey-once");
    expect(joinAndPark).not.toHaveBeenCalled();
  });

  it("re-approval lands on the row it already had, keeping its label, mesh node and creation date", async () => {
    const existing = {
      ...createProfileFromSession({ endpoint, fakts, token: token("old"), aliasMap: { aliasMap: { lok: ALIAS } } }, 5, FINAL_ID),
      identity: { baseUrl: BASE, userId: "2", organizationId: "3", hubId: "49" },
      label: { endpointName: "alpha", organizationName: "Lab", brandHue: 200 },
      mesh: { id: "node-1", label: "alpha", controlUrl: "https://mesh.alpha.test", hosts: ["pinned.lab"], enabled: true },
    };
    writeStoredProfileBook(upsertProfile(emptyProfileBook(), existing), storage);
    vi.mocked(flow).mockResolvedValue(grant() as never);
    renderProvider();
    await waitFor(() => expect(harness.state().activity.kind).not.toBe("booting"));

    await connect();

    const profile = loadStoredProfileBook(storage).profiles[FINAL_ID];
    expect(Object.keys(loadStoredProfileBook(storage).profiles)).toEqual([FINAL_ID]);
    expect(profile.session.token.refresh_token).toBe("rt-granted");
    expect(profile.label).toMatchObject({ organizationName: "Lab", brandHue: 200 });
    expect(profile.mesh).toMatchObject({ id: "node-1", hosts: ["pinned.lab"] });
    expect(profile.createdAt).toBe(5);
  });

  it("falls back to a provisional id on a lok that does not name the identity", async () => {
    vi.mocked(flow).mockResolvedValue(grant({ identity: undefined }) as never);
    renderProvider();
    await waitFor(() => expect(harness.state().activity.kind).not.toBe("booting"));

    await connect();

    const [id] = Object.keys(loadStoredProfileBook(storage).profiles);
    expect(id).toContain("::pending::");
  });

  it("reports the checks after they ran, not before hydrating", async () => {
    vi.mocked(flow).mockResolvedValue(grant() as never);
    renderProvider();
    await waitFor(() => expect(harness.state().activity.kind).not.toBe("booting"));

    await connect();

    await waitFor(() => expect(report).toHaveBeenCalled());
    expect(vi.mocked(report).mock.calls[0][2]).toEqual({
      alias_reports: { lok: { valid: true, alias_id: "a1" } },
      functional: true,
    });
  });

  it("a failed grant leaves the live connection — and its token — exactly as they are", async () => {
    const live = setActiveProfile(
      upsertProfile(
        emptyProfileBook(),
        createProfileFromSession({ endpoint, fakts, token: token("live"), aliasMap: { aliasMap: { lok: ALIAS } } }, 1, "id-live"),
      ),
      "id-live",
    );
    writeStoredProfileBook(live, storage);
    vi.mocked(flow).mockRejectedValue(new Error("The authorization request was declined"));
    renderProvider();
    await waitFor(() => expect(harness.state().connection).toBeDefined());
    const connection = harness.state().connection;

    // It rejects — so the caller can show the failure where the user clicked…
    await act(async () => {
      await expect(
        harness.actions.connect({ endpoint, controller: new AbortController() } as never),
      ).rejects.toThrow("The authorization request was declined");
    });

    // …and touches nothing live.
    expect(harness.state().connection).toBe(connection);
    expect(harness.state().storedSession?.token.access_token).toBe("live");
    expect(harness.state().autoLoginError).toBe("The authorization request was declined");
    expect(harness.state().activity.kind).toBe("settled");
  });
});
