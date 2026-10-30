import { describe, expect, it } from "vitest";
import type { MeshStatusPayload } from "../../../../../main/mesh/protocol";
import { summarizeConnectionPath } from "./connectionPath";

const mesh = (state = "running"): MeshStatusPayload =>
  ({
    sidecar: { state: "ready", version: "t" },
    meshes: [
      {
        config: { id: "lab", label: "Lab mesh", controlUrl: "https://mesh.arkitekt.live", hosts: [] },
        status: {
          id: "lab",
          state,
          proxyPort: 1080,
          magicDnsSuffix: "lab.mesh.arkitekt.live",
          peers: [
            { dnsName: "hub.lab.mesh.arkitekt.live.", hostName: "hub", ips: ["100.64.0.9"], online: true, relay: "fra" },
            { dnsName: "old.lab.mesh.arkitekt.live.", hostName: "old", ips: ["100.64.0.8"], online: false },
          ],
        },
      },
    ],
  }) as MeshStatusPayload;

describe("summarizeConnectionPath", () => {
  it("names the built-in mesh and counts what it carries", () => {
    expect(
      summarizeConnectionPath({
        hosts: ["hub.lab.mesh.arkitekt.live", "old.lab.mesh.arkitekt.live", "go.arkitekt.live", "go.arkitekt.live"],
        mesh: mesh(),
      }),
    ).toEqual({ kind: "arkitekt-mesh", meshLabel: "Lab mesh", viaMesh: 2, total: 3, relayed: 1, offlinePeers: 1 });
  });

  it("prefers the built-in mesh over a tunnel that is also up", () => {
    expect(
      summarizeConnectionPath({
        hosts: ["hub.lab.mesh.arkitekt.live", "mikro.tail1234.ts.net"],
        mesh: mesh(),
        vpn: [{ name: "tailscale0", addresses: ["100.101.0.1"], kind: "tailscale" }],
      }).kind,
    ).toBe("arkitekt-mesh");
  });

  it("takes a system Tailscale for a tunnel like any other", () => {
    expect(
      summarizeConnectionPath({
        hosts: ["mikro.tail1234.ts.net", "go.arkitekt.live"],
        vpn: [
          { name: "tailscale0", addresses: ["100.101.0.1"], kind: "tailscale" },
          { name: "wg0", addresses: ["10.8.0.2"], kind: "wireguard" },
        ],
      }),
    ).toEqual({ kind: "vpn", interfaces: ["tailscale0", "wg0"] });
  });

  it("a *.ts.net address with no tunnel up is simply direct", () => {
    expect(summarizeConnectionPath({ hosts: ["mikro.tail1234.ts.net"] })).toEqual({ kind: "direct" });
  });

  it("is direct otherwise, including when the mesh is stopped", () => {
    expect(summarizeConnectionPath({ hosts: ["go.arkitekt.live"] })).toEqual({ kind: "direct" });
    expect(summarizeConnectionPath({ hosts: ["hub.lab.mesh.arkitekt.live"], mesh: mesh("stopped") })).toEqual({
      kind: "direct",
    });
  });
});
