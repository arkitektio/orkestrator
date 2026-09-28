import { describe, expect, it } from "vitest";
import type { MeshProbeResult } from "../../../../../main/doctor/protocol";
import type { MeshStatusPayload } from "../../../../../main/mesh/protocol";
import { summarizeConnectionPath } from "./connectionPath";

const mesh = (state = "running"): MeshStatusPayload =>
  ({
    sidecar: { state: "ready", version: "t" },
    meshes: [
      {
        config: { id: "lab", label: "Lab mesh", controlUrl: "https://mesh.arkitekt.live", hosts: [], hasNodeState: true },
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

const tailscale = (backendState = "Running"): MeshProbeResult => ({
  vendor: "tailscale",
  available: true,
  backendState,
  tailnetName: "lab.example",
  magicDnsSuffix: "tail1234.ts.net",
  peers: [{ dnsName: "mikro.tail1234.ts.net.", hostName: "mikro", ips: ["100.100.1.2"], online: true }],
});

describe("summarizeConnectionPath", () => {
  it("names the built-in mesh and counts what it carries", () => {
    expect(
      summarizeConnectionPath({
        hosts: ["hub.lab.mesh.arkitekt.live", "old.lab.mesh.arkitekt.live", "go.arkitekt.live", "go.arkitekt.live"],
        mesh: mesh(),
      }),
    ).toEqual({ kind: "arkitekt-mesh", meshLabel: "Lab mesh", viaMesh: 2, total: 3, relayed: 1, offlinePeers: 1 });
  });

  it("prefers the built-in mesh over a system Tailscale that is also up", () => {
    expect(
      summarizeConnectionPath({
        hosts: ["hub.lab.mesh.arkitekt.live", "mikro.tail1234.ts.net"],
        mesh: mesh(),
        tailscale: tailscale(),
      }).kind,
    ).toBe("arkitekt-mesh");
  });

  it("attributes tailnet hosts to a running system Tailscale", () => {
    expect(
      summarizeConnectionPath({ hosts: ["mikro.tail1234.ts.net", "go.arkitekt.live"], tailscale: tailscale() }),
    ).toEqual({ kind: "system-tailscale", tailnet: "lab.example", viaMesh: 1, total: 2 });
  });

  it("takes a Tailscale interface as enough when the CLI was not asked", () => {
    expect(
      summarizeConnectionPath({
        hosts: ["100.100.1.2"],
        vpn: [{ name: "utun4", addresses: ["100.101.0.1"], kind: "tailscale" }],
      }),
    ).toEqual({ kind: "system-tailscale", tailnet: undefined, viaMesh: 1, total: 1 });
  });

  it("does not credit a stopped Tailscale", () => {
    expect(summarizeConnectionPath({ hosts: ["mikro.tail1234.ts.net"], tailscale: tailscale("Stopped") }).kind).toBe(
      "direct",
    );
  });

  it("reports another VPN by its interfaces", () => {
    expect(
      summarizeConnectionPath({
        hosts: ["go.arkitekt.live"],
        vpn: [
          { name: "utun4", addresses: ["100.101.0.1"], kind: "tailscale" },
          { name: "wg0", addresses: ["10.8.0.2"], kind: "wireguard" },
        ],
      }),
    ).toEqual({ kind: "vpn", interfaces: ["wg0"] });
  });

  it("is direct otherwise, including when the mesh is stopped", () => {
    expect(summarizeConnectionPath({ hosts: ["go.arkitekt.live"] })).toEqual({ kind: "direct" });
    expect(summarizeConnectionPath({ hosts: ["hub.lab.mesh.arkitekt.live"], mesh: mesh("stopped") })).toEqual({
      kind: "direct",
    });
  });
});
