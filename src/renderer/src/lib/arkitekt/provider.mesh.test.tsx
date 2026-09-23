// @vitest-environment jsdom
import { render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { MeshEvent, MeshStatusPayload } from "../../../../main/mesh/protocol";
import { checkAliasHealth } from "./alias/resolve";
import {
  createProfileFromSession,
  emptyProfileBook,
  loadStoredProfileBook,
  setActiveProfile,
  upsertProfile,
  writeStoredProfileBook,
} from "./fakts/profileStorageSchema";
import { useArkitektStore } from "./hooks";
import { ArkitektProvider } from "./provider";

/**
 * A service that lives behind the profile's mesh is not probed until the
 * node runs — and one that failed is checked again when the mesh comes up.
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

const MESH_ALIAS = { id: "m1", host: "mikro.lab.ts.net", ssl: true, challenge: "ht" };
const SELF_ALIAS = { id: "s1", host: "go.arkitekt.live", ssl: true, challenge: "ht" };

const session = {
  endpoint: {
    name: "lab",
    version: "0.1.0",
    base_url: "https://go.arkitekt.live/lok/f/",
    frontend_url: "https://go.arkitekt.live/",
    configure: "https://go.arkitekt.live/configure/{code}",
    device_authorization_endpoint: "https://go.arkitekt.live/lok/o/app-authorization/",
    token_endpoint: "https://go.arkitekt.live/lok/o/token/",
  },
  fakts: {
    instances: { mikro: { service: "live.arkitekt.mikro", identifier: "3", aliases: [MESH_ALIAS] } },
    self: { deployment_name: "lab", alias: SELF_ALIAS },
    statuses: { mikro: "granted" },
  },
  token: {
    access_token: "at",
    token_type: "Bearer",
    expires_in: 3600,
    refresh_token: "rt",
    client_id: "cid",
    received_at: Date.now(),
  },
  aliasMap: { aliasMap: {} },
};

const MESH = { id: "lab", label: "lab", controlUrl: "https://mesh.arkitekt.live", hosts: [], enabled: true };

const payload = (state: string, proxyPort?: number): MeshStatusPayload =>
  ({
    sidecar: { state: "ready", version: "t" },
    meshes: [
      {
        config: { ...MESH, hasNodeState: true },
        status: { id: "lab", state, proxyPort, magicDnsSuffix: "lab.ts.net" },
      },
    ],
  }) as MeshStatusPayload;

let emit: (next: MeshStatusPayload) => void;

const serviceBuilderMap = {
  mikro: { key: "mikro", service: "live.arkitekt.mikro", builder: () => ({ client: {}, dispose: () => {} }) },
} as never;
const selfServiceBuilder = (() => ({ client: {}, dispose: () => {} })) as never;

let status: string | undefined;
const Probe = () => {
  status = useArkitektStore((s) => s.serviceStates.mikro?.status);
  return null;
};

beforeEach(() => {
  localStorage.clear();
  status = undefined;
  writeStoredProfileBook(
    setActiveProfile(
      upsertProfile(emptyProfileBook(), { ...createProfileFromSession(session, 1, "id-lab"), mesh: MESH }),
      "id-lab",
    ),
    localStorage,
  );
  const listeners = new Set<(event: MeshEvent) => void>();
  emit = (next) => listeners.forEach((listener) => listener({ type: "status", payload: next }));
  (window as unknown as { api: unknown }).api = {
    mesh: {
      claim: vi.fn(async () => payload("starting")),
      status: vi.fn(async () => payload("starting")),
      onEvent: (listener: (event: MeshEvent) => void) => {
        listeners.add(listener);
        return () => listeners.delete(listener);
      },
    },
  };
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("offline")));
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  delete (window as unknown as { api?: unknown }).api;
  vi.unstubAllGlobals();
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

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

describe("services behind the mesh", () => {
  it("are not probed until the node runs, then come up", async () => {
    renderProvider();
    await waitFor(() => expect(status).toBeDefined());
    await new Promise((resolve) => setTimeout(resolve, 30));

    expect(checkAliasHealth).not.toHaveBeenCalled();
    expect(status).not.toBe("invalid");

    emit(payload("running", 1080));

    await waitFor(() => expect(status).toBe("ready"));
    expect(vi.mocked(checkAliasHealth).mock.calls[0][0].host).toBe(MESH_ALIAS.host);
    // The suffix is cached for the next launch.
    await waitFor(() =>
      expect(loadStoredProfileBook(localStorage).profiles["id-lab"].mesh?.magicDnsSuffix).toBe("lab.ts.net"),
    );
  });

  it("that failed are checked again when the mesh comes back", async () => {
    vi.mocked(checkAliasHealth).mockResolvedValueOnce(false);
    renderProvider();
    await waitFor(() => expect(status).toBeDefined());

    emit(payload("running", 1080));
    await waitFor(() => expect(status).toBe("invalid"));

    emit(payload("starting"));
    emit(payload("running", 1081));
    await waitFor(() => expect(status).toBe("ready"));
  });
});
