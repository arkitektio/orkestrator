// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import type { FaktsEndpoint } from "@/lib/arkitekt/fakts/endpointSchema";
import {
  emptyProfileBook,
  type ProfileMesh,
  type StoredProfile,
  type StoredProfileBook,
} from "@/lib/arkitekt/fakts/profileStorageSchema";
import { claimProfileMesh, hintedProfileMesh, meshClaimFor, meshFromGrant } from "./profileMesh";

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
