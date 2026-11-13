import { describe, expect, it } from "vitest";
import { ActiveFaktsSchema, AliasSchema, type ActiveFakts } from "../fakts/faktsSchema";
import type { ProfileMesh } from "../fakts/profileStorageSchema";
import { DIRECT, meshHosts, onMesh, routeOf, viaMesh } from "./route";

const MESH: ProfileMesh = { id: "lab", label: "Lab", controlUrl: "https://mesh.arkitekt.live", hosts: ["data.lab"], enabled: true };

const at = (host: string, extra: Record<string, unknown> = {}) => ({ id: host, host, ssl: true, challenge: "ht", ...extra });

describe("viaMesh", () => {
  it("takes the server's word that an address is on the mesh", () => {
    expect(viaMesh(at("hub.example.org", { reach: "mesh" }), MESH)).toBe(true);
    expect(viaMesh(at("hub.example.org", { kind: "mesh" }), MESH)).toBe(true);
    expect(viaMesh(at("hub.example.org", { reach: "public" }), MESH)).toBe(false);
  });

  it("routes a pinned host, whatever the server called it", () => {
    expect(viaMesh(at("data.lab", { reach: "lan" }), MESH)).toBe(true);
  });

  it("routes what main will route once the node runs: control domain and cached suffix", () => {
    expect(viaMesh(at("mikro.lab.mesh.arkitekt.live"), MESH)).toBe(true);
    expect(viaMesh(at("mikro.lab.example"), { ...MESH, magicDnsSuffix: "lab.example" })).toBe(true);
    // Registered as a plain absolute alias, but living on the mesh all the same.
    expect(viaMesh(at("mikro.lab.mesh.arkitekt.live", { reach: "internal" }), MESH)).toBe(true);
  });

  it("does not route the control server, public names or LAN addresses", () => {
    expect(viaMesh(at("mesh.arkitekt.live"), MESH)).toBe(false);
    expect(viaMesh(at("go.arkitekt.live"), MESH)).toBe(false);
    expect(viaMesh(at("192.168.1.4"), MESH)).toBe(false);
  });

  it("does not take a Tailscale-looking address for the mesh: that is the system's own Tailscale", () => {
    expect(viaMesh(at("100.64.0.7"), MESH)).toBe(false);
    expect(viaMesh(at("fd7a:115c:a1e0::7"), MESH)).toBe(false);
    expect(viaMesh(at("mikro.tailnet-cafe.ts.net"), MESH)).toBe(false);
    expect(viaMesh(at("100.64.0.7", { reach: "lan" }), MESH)).toBe(false);
    // The mesh's own node by IP (MagicDNS off) is one because lok says so.
    expect(viaMesh(at("100.64.0.7", { reach: "mesh" }), MESH)).toBe(true);
  });

  it("does not take a bare label for a mesh address: that is a docker or LAN name", () => {
    expect(viaMesh(at("mikro"), MESH)).toBe(false);
    expect(viaMesh(at("mikro", { reach: "internal", kind: "docker" }), MESH)).toBe(false);
  });

  it("routes nothing without a mesh or through one that is switched off", () => {
    expect(viaMesh(at("100.64.0.7", { reach: "mesh" }), undefined)).toBe(false);
    expect(viaMesh(at("100.64.0.7", { reach: "mesh" }), { ...MESH, enabled: false })).toBe(false);
    // …but the address still LIVES on it, which is what the Mesh page lists.
    expect(onMesh(at("100.64.0.7", { reach: "mesh" }), { ...MESH, enabled: false })).toBe(true);
  });
});

describe("routeOf", () => {
  it("names the mesh an address goes through", () => {
    expect(routeOf(at("100.64.0.7", { reach: "mesh" }), MESH)).toEqual({ kind: "mesh", meshId: "lab" });
    expect(routeOf(at("go.arkitekt.live"), MESH)).toBe(DIRECT);
  });
});

describe("meshHosts", () => {
  it("lists the services' mesh addresses once, and never lok's own", () => {
    const fakts = {
      instances: {
        mikro: { identifier: "1", service: "mikro", aliases: [at("mikro.example.org"), at("hub.example.org", { reach: "mesh" })] },
        rekuest: { identifier: "2", service: "rekuest", aliases: [at("HUB.example.org.", { reach: "mesh" })] },
      },
      self: { deployment_name: "lab", alias: at("lok.lab.mesh.arkitekt.live") },
      statuses: {},
    } as unknown as ActiveFakts;
    // The coordination server is never on the mesh it coordinates.
    expect(meshHosts(fakts, MESH)).toEqual(["hub.example.org"]);
    // lok's word stands even where the profile was given no mesh.
    expect(meshHosts(fakts, undefined)).toEqual(["hub.example.org"]);
  });
});

describe("AliasSchema", () => {
  it("keeps what lok says of an address", () => {
    expect(AliasSchema.parse(at("h", { kind: "mesh", reach: "mesh" }))).toMatchObject({ kind: "mesh", reach: "mesh" });
  });

  it("reads a reach this build does not know as absent, without failing the envelope", () => {
    const parsed = ActiveFaktsSchema.parse({
      instances: { mikro: { identifier: "1", service: "mikro", aliases: [at("h", { reach: "orbit", kind: "satellite" })] } },
      self: { deployment_name: "lab", alias: at("lok") },
    });
    expect(parsed.instances.mikro.aliases[0].reach).toBeUndefined();
    expect(parsed.instances.mikro.aliases[0].kind).toBeUndefined();
  });
});
