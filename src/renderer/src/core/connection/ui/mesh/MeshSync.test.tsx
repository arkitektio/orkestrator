// @vitest-environment jsdom
import { act, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The window claims its profile's mesh only when the hub has an address on it
 * — or while the node joins once to register.
 */

const state = { profile: undefined as unknown };
vi.mock("@/core/connection/arkitekt/host", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/core/connection/arkitekt/host")>()),
  Arkitekt: { useActiveProfile: () => state.profile },
}));

const { MeshSync } = await import("./MeshSync");
const { demandMesh, joinAndPark, releaseMesh, resetMeshDemands } = await import("@/core/connection/mesh/profileMesh");

const MESH = { id: "lab", label: "Lab", controlUrl: "https://mesh.arkitekt.live", hosts: [], enabled: true };
const alias = (host: string) => ({ id: host, host, ssl: true, challenge: "ht" });
const profileWith = (hosts: string[]) => ({
  id: "p",
  mesh: MESH,
  session: {
    fakts: {
      instances: { mikro: { identifier: "3", service: "live.arkitekt.mikro", aliases: hosts.map(alias) } },
      self: { deployment_name: "lab", alias: alias("go.arkitekt.live") },
      statuses: {},
    },
  },
});

let claim: ReturnType<typeof vi.fn>;
const claimed = () => claim.mock.calls.map(([request]) => request.mesh?.id ?? null);

beforeEach(() => {
  resetMeshDemands();
  claim = vi.fn(async () => ({ sidecar: { state: "ready", version: "t" }, meshes: [] }));
  (window as unknown as { api: unknown }).api = {
    mesh: {
      claim,
      status: async () => ({ sidecar: { state: "ready", version: "t" }, meshes: [] }),
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

  it("keeps claiming a mesh while it joins once, then lets it go", async () => {
    state.profile = profileWith(["mikro.example.org"]);
    render(<MeshSync />);
    vi.useFakeTimers();
    let done: Promise<unknown> = Promise.resolve();
    await act(async () => {
      done = joinAndPark(MESH, "tskey", { timeoutMs: 1000 });
    });
    expect(claimed()).toContain("lab");

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
      await done;
    });
    vi.useRealTimers();
    expect(claimed()[claimed().length - 1]).toBeNull();
  });
});
