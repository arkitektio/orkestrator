// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import type { FaktsEndpoint } from "@/core/lib/arkitekt/fakts/endpointSchema";
import {
  emptyProfileBook,
  type ProfileMesh,
  type StoredProfile,
  type StoredProfileBook,
} from "@/core/lib/arkitekt/fakts/profileStorageSchema";
import { claimProfileMesh, hintedProfileMesh, joinAndPark, joiningMeshes,
  meshForIdentity, meshClaimFor, meshFromGrant } from "./profileMesh";
import type { MeshEvent, MeshStatusPayload } from "../../../../../main/mesh/protocol";

const endpoint = {
  name: "test",
  base_url: "https://go.arkitekt.live/lok/f/",
  mesh_coord_url: "https://mesh.arkitekt.live",
} as FaktsEndpoint;

const MESH: ProfileMesh = {
  id: "mesh-1",
  label: "Lab",
  controlUrl: "https://mesh.arkitekt.live",
  hosts: ["data.lab"],
  enabled: true,
};

const profile = (id: string, userId: string, hubId: string | null, mesh?: ProfileMesh): StoredProfile =>
  ({
    id,
    identity: { baseUrl: "https://go.arkitekt.live/lok/f", userId, organizationId: "o", hubId },
    mesh,
  }) as StoredProfile;

const bookOf = (...profiles: StoredProfile[]): StoredProfileBook => ({
  ...emptyProfileBook(),
  profiles: Object.fromEntries(profiles.map((p) => [p.id, p])),
});

afterEach(() => {
  delete (window as any).api;
});

describe("meshFromGrant", () => {
  it("is nothing without a key or a usable control server", () => {
    expect(meshFromGrant(endpoint, undefined, undefined)).toBeUndefined();
    expect(meshFromGrant({ ...endpoint, mesh_coord_url: null }, { authKey: "k" }, undefined)).toBeUndefined();
    expect(meshFromGrant(endpoint, { authKey: "k", controlUrl: "ftp://nope" }, undefined)).toBeUndefined();
  });

  it("mints a fresh mesh for a first grant, switched on", () => {
    const mesh = meshFromGrant(endpoint, { authKey: "k" }, undefined)!;
    expect(mesh).toMatchObject({ label: "test", controlUrl: "https://mesh.arkitekt.live", hosts: [], enabled: true });
    expect(mesh.id).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(mesh).not.toHaveProperty("authKey");
  });

  it("keeps a re-approved profile's node id, pins and switch", () => {
    expect(meshFromGrant(endpoint, { authKey: "k" }, { ...MESH, enabled: false })).toMatchObject({
      id: "mesh-1",
      hosts: ["data.lab"],
      enabled: false,
    });
  });
});

describe("hintedProfileMesh", () => {
  it("finds the profile the hint names — same deployment, user and hub", () => {
    const book = bookOf(profile("a", "u1", "h1", MESH), profile("b", "u1", "h2", { ...MESH, id: "mesh-2" }));
    expect(hintedProfileMesh(book, endpoint, { sub: "u1", hub: "h2" })?.id).toBe("mesh-2");
    expect(hintedProfileMesh(book, endpoint, { sub: "u1", hub: "h1" })?.id).toBe("mesh-1");
  });

  it("guesses nothing without a hint, or when two rows match it", () => {
    const book = bookOf(profile("a", "u1", "h1", MESH), profile("b", "u1", "h2", MESH));
    expect(hintedProfileMesh(book, endpoint, undefined)).toBeUndefined();
    expect(hintedProfileMesh(book, endpoint, { sub: "u1" })).toBeUndefined();
  });

  it("without a hint, takes the one profile on that deployment that has a mesh", () => {
    // "Add a login" passes no hint; re-approving must not mint a second node.
    const book = bookOf(profile("a", "u1", "h1", MESH), profile("b", "u2", "h2", undefined));
    expect(hintedProfileMesh(book, endpoint, undefined)?.id).toBe("mesh-1");
  });
});

describe("meshForIdentity", () => {
  it("is the mesh of exactly the profile the grant's identity names", () => {
    const book = bookOf(profile("a", "u1", "h1", MESH));
    expect(meshForIdentity(book, "a")?.id).toBe("mesh-1");
    expect(meshForIdentity(book, "nope")).toBeUndefined();
    expect(meshForIdentity(book, undefined)).toBeUndefined();
  });
});

describe("claimProfileMesh", () => {
  it("claims the mesh with the one-shot key, and nothing for a switched-off one", async () => {
    const claim = vi.fn(async () => ({ sidecar: { state: "idle" as const }, meshes: [] }));
    (window as any).api = { mesh: { claim } };
    await claimProfileMesh(MESH, "tskey");
    await claimProfileMesh({ ...MESH, enabled: false });
    await claimProfileMesh(undefined);
    expect(claim.mock.calls).toEqual([
      [{ mesh: { id: "mesh-1", label: "Lab", controlUrl: "https://mesh.arkitekt.live", hosts: ["data.lab"] }, authKey: "tskey" }],
      [{ mesh: null, authKey: undefined }],
      [{ mesh: null, authKey: undefined }],
    ]);
    expect(meshClaimFor(MESH)).not.toHaveProperty("enabled");
  });

  it("is a no-op without a bridge, and never throws", async () => {
    await expect(claimProfileMesh(MESH, "tskey")).resolves.toBeUndefined();
    (window as any).api = { mesh: { claim: async () => Promise.reject(new Error("boom")) } };
    vi.spyOn(console, "warn").mockImplementation(() => {});
    await expect(claimProfileMesh(MESH)).resolves.toBeUndefined();
  });
});

describe("joinAndPark", () => {
  /** A bridge whose node state the test moves along. */
  const bridgeWith = (initial: string) => {
    const listeners = new Set<(event: MeshEvent) => void>();
    const status = (state: string, proxyPort?: number): MeshStatusPayload =>
      ({
        sidecar: { state: "ready", version: "t" },
        meshes: [{ config: { ...meshClaimFor(MESH), hasNodeState: true }, status: { id: "mesh-1", state, proxyPort } }],
      }) as MeshStatusPayload;
    const claim = vi.fn(async () => status(initial));
    (window as any).api = {
      mesh: {
        claim,
        status: async () => status(initial),
        onEvent: (listener: (event: MeshEvent) => void) => {
          listeners.add(listener);
          return () => listeners.delete(listener);
        },
      },
    };
    const emit = (state: string, proxyPort?: number) =>
      listeners.forEach((listener) => listener({ type: "status", payload: status(state, proxyPort) }));
    return { claim, emit };
  };

  it("joins with the one-shot key, stays 'joining' until the node ran, then lets it go", async () => {
    const { claim, emit } = bridgeWith("starting");
    const done = joinAndPark(MESH, "tskey-once");
    await vi.waitFor(() => expect(claim).toHaveBeenCalled());

    expect(claim.mock.calls[0][0]).toMatchObject({ authKey: "tskey-once", mesh: { id: "mesh-1" } });
    expect(joiningMeshes.getSnapshot().has("mesh-1")).toBe(true);

    emit("running", 1080);
    expect(await done).toBe("running");
    expect(joiningMeshes.getSnapshot().has("mesh-1")).toBe(false);
  });

  it("lets it go when the join fails or runs out of time", async () => {
    vi.useFakeTimers();
    bridgeWith("starting");
    const done = joinAndPark(MESH, "k", { timeoutMs: 1000 });
    await vi.advanceTimersByTimeAsync(1000);
    expect(await done).toBe("timeout");
    expect(joiningMeshes.getSnapshot().has("mesh-1")).toBe(false);
    vi.useRealTimers();
  });

  it("does nothing without a bridge or for a switched-off mesh", async () => {
    expect(await joinAndPark(MESH, "k")).toBe("none");
    bridgeWith("starting");
    expect(await joinAndPark({ ...MESH, enabled: false }, "k")).toBe("none");
  });
});
