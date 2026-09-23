import { describe, expect, it } from "vitest";
import type { ActiveFakts } from "@/lib/arkitekt/fakts/faktsSchema";
import type { ProfileMesh } from "@/lib/arkitekt/fakts/profileStorageSchema";
import { meshAliases, meshNeeded } from "./meshNeed";

const MESH: ProfileMesh = { id: "lab", label: "Lab", controlUrl: "https://mesh.arkitekt.live", hosts: [], enabled: true };

const alias = (host: string) => ({ id: host, host, ssl: true, challenge: "ht" });

const fakts = (hosts: string[], self = "go.arkitekt.live"): ActiveFakts =>
  ({
    instances: { mikro: { identifier: "3", service: "live.arkitekt.mikro", aliases: hosts.map(alias) } },
    self: { deployment_name: "lab", alias: alias(self) },
    statuses: {},
  }) as ActiveFakts;

describe("meshAliases", () => {
  it("finds addresses under the control domain, the suffix, pinned, and mesh literals", () => {
    expect(meshAliases(fakts(["hub.lab.mesh.arkitekt.live"]), MESH)).toEqual(["hub.lab.mesh.arkitekt.live"]);
    expect(meshAliases(fakts(["hub.lab.example"]), { ...MESH, magicDnsSuffix: "lab.example" })).toEqual(["hub.lab.example"]);
    expect(meshAliases(fakts(["data.internal"]), { ...MESH, hosts: ["data.internal"] })).toEqual(["data.internal"]);
    expect(meshAliases(fakts(["100.64.0.9", "mikro.cafe.ts.net"]), MESH)).toEqual(["100.64.0.9", "mikro.cafe.ts.net"]);
  });

  it("counts the hub's own alias too", () => {
    expect(meshAliases(fakts([], "lok.lab.mesh.arkitekt.live"), MESH)).toEqual(["lok.lab.mesh.arkitekt.live"]);
  });

  it("does not count public names, LAN addresses, or bare docker hostnames", () => {
    expect(meshAliases(fakts(["mikro.example.org", "192.168.1.4", "mikro", "localhost"]), MESH)).toEqual([]);
    // The control server itself is reached directly.
    expect(meshAliases(fakts(["mesh.arkitekt.live"]), MESH)).toEqual([]);
  });
});

describe("meshNeeded", () => {
  it("is false without fakts or a mesh, true once one address lives on it", () => {
    expect(meshNeeded(undefined, MESH)).toBe(false);
    expect(meshNeeded(fakts(["hub.lab.mesh.arkitekt.live"]), undefined)).toBe(false);
    expect(meshNeeded(fakts(["mikro.example.org"]), MESH)).toBe(false);
    expect(meshNeeded(fakts(["mikro.example.org", "hub.lab.mesh.arkitekt.live"]), MESH)).toBe(true);
  });
});
