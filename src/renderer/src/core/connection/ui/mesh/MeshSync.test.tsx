// @vitest-environment jsdom
import { act, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The window claims its profile's mesh only when the hub has an address on it
 * — or while the node joins once to register.
 */

const state = { profile: undefined as unknown };
const renew = vi.fn(async (_profileId: string) => ({ kind: "key" as const, mesh: { authKey: "tskey-renewed" } }));
vi.mock("@/core/connection/arkitekt/host", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/core/connection/arkitekt/host")>()),
  Arkitekt: { useActiveProfile: () => state.profile, useRenewMeshKey: () => renew },
}));

const { MeshSync } = await import("./MeshSync");
const { demandMesh, releaseMesh, resetMeshDemands } = await import("@/core/connection/mesh/profileMesh");
const { resetMeshStatusStore } = await import("@/core/connection/mesh/meshStatusStore");
const { MESH_KEY_FIRST_DELAY_MS, resetMeshKeyPacing } = await import("./useMeshKeyRenewal");
const { MESH_KEY_SETTLE_MS } = await import("@/core/connection/mesh/meshKey");

const MESH = { id: "lab", label: "Lab", controlUrl: "https://mesh.arkitekt.live", hosts: [], enabled: true };
const alias = (host: string) => ({ id: host, host, ssl: true, challenge: "ht" });
const profileWith = (hosts: string[]) => ({
  id: "p",
  mesh: MESH,
  session: {
    token: { client_id: "cid" },
    fakts: {
      instances: { mikro: { identifier: "3", service: "live.arkitekt.mikro", aliases: hosts.map(alias) } },
      self: { deployment_name: "lab", alias: alias("go.arkitekt.live") },
      statuses: {},
    },
  },
});

let claim: ReturnType<typeof vi.fn>;
const claimed = () => claim.mock.calls.map(([request]) => request.mesh?.id ?? null);
/** What main reports for the lab node; `[]` = no node. */
let nodes: { config: unknown; status: { id: string; state: string }; joining: boolean }[];
const withNode = (nodeState: string, joining = false) => [
  { config: MESH, status: { id: "lab", state: nodeState }, joining },
];
let seq = 0;
const payload = () => ({ seq: ++seq, sidecar: { state: "ready", version: "t" }, meshes: nodes });

beforeEach(() => {
  resetMeshDemands();
  resetMeshKeyPacing();
  resetMeshStatusStore();
  renew.mockClear();
  nodes = [];
  claim = vi.fn(async () => payload());
  (window as unknown as { api: unknown }).api = {
    mesh: {
      claim,
      status: async () => payload(),
      onEvent: () => () => {},
    },
  };
});

afterEach(() => {
  delete (window as unknown as { api?: unknown }).api;
});

describe("MeshSync", () => {
  it("claims nothing when none of the hub's addresses are on the mesh", () => {
    state.profile = profileWith(["mikro.example.org"]);
    render(<MeshSync />);
    expect(claimed()).toEqual([null]);
  });

  it("does not start the mesh just because the hub has an address on it", () => {
    state.profile = profileWith(["mikro.lab.mesh.arkitekt.live"]);
    render(<MeshSync />);
    expect(claimed()).toEqual([null]);
  });

  it("claims the mesh while something demands it, and lets it go after", () => {
    state.profile = profileWith(["mikro.example.org", "mikro.lab.mesh.arkitekt.live"]);
    render(<MeshSync />);
    act(() => demandMesh("lab", "mikro"));
    act(() => demandMesh("lab", "self"));
    expect(claimed()).toEqual([null, "lab"]);
    act(() => releaseMesh("lab", "mikro"));
    expect(claimed()).toEqual([null, "lab"]);
    act(() => releaseMesh("lab", "self"));
    expect(claimed()).toEqual([null, "lab", null]);
  });

  it("never claims for a join: main keeps a joining node up by itself", async () => {
    nodes = withNode("starting", true);
    state.profile = profileWith(["mikro.example.org"]);
    render(<MeshSync />);
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(claimed().every((id) => id === null)).toBe(true);
  });

  it("gets a wanted node that is not logged in a fresh key, after a moment, and paces the next ask", async () => {
    vi.useFakeTimers();
    nodes = withNode("needs-login");
    state.profile = profileWith(["mikro.lab.mesh.arkitekt.live"]);
    render(<MeshSync />);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
      demandMesh("lab", "mikro");
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(MESH_KEY_FIRST_DELAY_MS - 1);
    });
    expect(renew).not.toHaveBeenCalled();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });
    expect(renew).toHaveBeenCalledWith("p");

    // Still not logged in: a key needs time to land, and asking sooner would delete it.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(MESH_KEY_SETTLE_MS - 1);
    });
    expect(renew).toHaveBeenCalledTimes(1);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });
    expect(renew).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });

  it("asks nothing for a mesh nobody wants, or one main is joining with a key", async () => {
    vi.useFakeTimers();
    nodes = withNode("needs-login");
    state.profile = profileWith(["mikro.lab.mesh.arkitekt.live"]);
    render(<MeshSync />);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(MESH_KEY_FIRST_DELAY_MS * 2);
    });
    expect(renew).not.toHaveBeenCalled();

    resetMeshStatusStore();
    nodes = withNode("needs-login", true);
    const joining = render(<MeshSync />);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
      demandMesh("lab", "mikro");
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(MESH_KEY_FIRST_DELAY_MS * 2);
    });
    expect(renew).not.toHaveBeenCalled();
    joining.unmount();
    vi.useRealTimers();
  });
});
