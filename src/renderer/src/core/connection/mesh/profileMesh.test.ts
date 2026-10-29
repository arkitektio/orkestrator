// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import type { FaktsEndpoint } from "@/core/connection/arkitekt/fakts/endpointSchema";
import {
  emptyProfileBook,
  type ProfileMesh,
  type StoredProfile,
  type StoredProfileBook,
} from "@/core/connection/arkitekt/fakts/profileStorageSchema";
import { claimProfileMesh, hintedProfileMesh, joinMesh,
  meshAfterGrant, meshForIdentity, meshClaimFor, meshFromGrant, previousMeshForGrant } from "./profileMesh";
import { meshStatusStore, resetMeshStatusStore } from "./meshStatusStore";
import type { MeshStatusPayload } from "../../../../../main/mesh/protocol";

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
  resetMeshStatusStore();
});

const payload = (seq: number): MeshStatusPayload => ({ seq, sidecar: { state: "ready", version: "t" }, meshes: [] });

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

describe("meshAfterGrant", () => {
  it("takes the joining mesh when a key came", () => {
    expect(meshAfterGrant(endpoint, { authKey: "k" }, { ...MESH, keyMissingAt: 5 }, { asked: true, now: 9 }))
      .toEqual({ ...MESH, label: "test" });
  });

  it("marks the row's mesh when a key was asked for and none came", () => {
    expect(meshAfterGrant(endpoint, undefined, MESH, { asked: true, now: 9 })).toEqual({ ...MESH, keyMissingAt: 9 });
  });

  it("leaves the row alone when no key was asked for, or it has no mesh", () => {
    expect(meshAfterGrant(endpoint, undefined, MESH, { asked: false })).toBeUndefined();
    expect(meshAfterGrant(endpoint, undefined, undefined, { asked: true })).toBeUndefined();
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

describe("previousMeshForGrant", () => {
  it("never hands the hinted profile's mesh to a grant that named another organisation", () => {
    const book = bookOf(profile("a", "u1", "h1", MESH));
    const hinted = hintedProfileMesh(book, endpoint, { sub: "u1", hub: "h1" });
    expect(previousMeshForGrant(book, "a", hinted)?.id).toBe("mesh-1");
    expect(previousMeshForGrant(book, "other-org", hinted)).toBeUndefined();
    // A grant without an identity only has the hint to go on.
    expect(previousMeshForGrant(book, undefined, hinted)?.id).toBe("mesh-1");
  });
});

describe("claimProfileMesh", () => {
  it("claims the mesh as desired state only, and nothing for a switched-off one", async () => {
    const claim = vi.fn(async () => payload(1));
    (window as any).api = { mesh: { claim } };
    await claimProfileMesh(MESH);
    await claimProfileMesh({ ...MESH, enabled: false });
    await claimProfileMesh(undefined);
    expect(claim.mock.calls).toEqual([
      [{ mesh: { id: "mesh-1", label: "Lab", controlUrl: "https://mesh.arkitekt.live", hosts: ["data.lab"] } }],
      [{ mesh: null }],
      [{ mesh: null }],
    ]);
    expect(meshClaimFor(MESH)).not.toHaveProperty("enabled");
  });

  it("is a no-op without a bridge, and never throws", async () => {
    await expect(claimProfileMesh(MESH)).resolves.toBeUndefined();
    (window as any).api = { mesh: { claim: async () => Promise.reject(new Error("boom")) } };
    vi.spyOn(console, "warn").mockImplementation(() => {});
    await expect(claimProfileMesh(MESH)).resolves.toBeUndefined();
  });
});

describe("joinMesh", () => {
  it("hands main the key without claiming anything, and keeps main's answer", async () => {
    const claim = vi.fn();
    const join = vi.fn(async () => payload(7));
    (window as any).api = { mesh: { claim, join, status: async () => payload(1), onEvent: () => () => {} } };
    await joinMesh(MESH, "tskey-once");
    expect(join).toHaveBeenCalledWith({
      mesh: { id: "mesh-1", label: "Lab", controlUrl: "https://mesh.arkitekt.live", hosts: ["data.lab"] },
      authKey: "tskey-once",
    });
    expect(claim).not.toHaveBeenCalled();
    expect(meshStatusStore().getSnapshot().payload?.seq).toBe(7);
  });

  it("does nothing without a bridge or for a switched-off mesh, and lets main's refusal through", async () => {
    await expect(joinMesh(MESH, "k")).resolves.toBeUndefined();
    const join = vi.fn(async () => Promise.reject(new Error("Invalid mesh key")));
    (window as any).api = { mesh: { claim: vi.fn(), join } };
    await joinMesh({ ...MESH, enabled: false }, "k");
    expect(join).not.toHaveBeenCalled();
    await expect(joinMesh(MESH, "k")).rejects.toThrow(/invalid mesh key/i);
  });
});
