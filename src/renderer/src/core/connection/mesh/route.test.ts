import { describe, expect, it } from "vitest";
import type { MeshStatusPayload } from "../../../../../main/mesh/protocol";
import { serviceRoute } from "./route";

const payload = (status: Record<string, unknown> = {}, config: Record<string, unknown> = {}): MeshStatusPayload =>
  ({
    sidecar: { state: "ready", version: "t" },
    meshes: [
      {
        config: { id: "lab", label: "Lab mesh", controlUrl: "https://mesh.arkitekt.live", hosts: [], ...config },
        status: {
          id: "lab",
          state: "running",
          proxyPort: 1080,
          magicDnsSuffix: "lab.mesh.arkitekt.live",
          peers: [
            { dnsName: "hub.lab.mesh.arkitekt.live.", hostName: "hub", ips: ["100.64.0.9"], online: true, relay: "fra" },
            { dnsName: "old.lab.mesh.arkitekt.live.", hostName: "old", ips: ["100.64.0.8"], online: false },
            { dnsName: "near.lab.mesh.arkitekt.live.", hostName: "near", ips: ["100.64.0.7"], online: true, curAddr: "192.168.1.4:41641" },
          ],
          ...status,
        },
      },
    ],
  }) as MeshStatusPayload;

describe("serviceRoute, direct against relayed", () => {
  it("reads a tunnel as direct when the node has an endpoint, whatever relay region it names", () => {
    const route = serviceRoute("hub.lab.mesh.arkitekt.live", {
      sidecar: { state: "ready", version: "t" },
      meshes: [
        {
          config: { id: "lab", label: "Lab mesh", controlUrl: "https://mesh.arkitekt.live", hosts: [] },
          status: {
            id: "lab",
            state: "running",
            magicDnsSuffix: "lab.mesh.arkitekt.live",
            peers: [
              { dnsName: "hub.lab.mesh.arkitekt.live.", ips: ["100.64.0.9"], online: true, relay: "fra", curAddr: "203.0.113.7:41641" },
            ],
          },
        },
      ],
    });
    expect(route).toMatchObject({ kind: "mesh", peer: { path: { kind: "direct", address: "203.0.113.7:41641" } } });
  });
});

describe("serviceRoute", () => {
  it("names the mesh, the machine and how the tunnel runs", () => {
    expect(serviceRoute("hub.lab.mesh.arkitekt.live", payload())).toEqual({
      kind: "mesh",
      meshLabel: "Lab mesh",
      peer: { name: "hub.lab.mesh.arkitekt.live", online: true, path: { kind: "relay", region: "fra" } },
    });
    expect(serviceRoute("near.lab.mesh.arkitekt.live", payload())).toMatchObject({
      peer: { path: { kind: "direct", address: "192.168.1.4:41641" } },
    });
    expect(serviceRoute("old.lab.mesh.arkitekt.live", payload())).toMatchObject({ peer: { online: false } });
  });

  it("counts a pinned host and the control domain as the mesh too", () => {
    expect(serviceRoute("data.internal", payload({}, { hosts: ["data.internal"] })).kind).toBe("mesh");
    expect(serviceRoute("x.other.mesh.arkitekt.live", payload({ magicDnsSuffix: undefined, peers: [] }))).toMatchObject({
      kind: "mesh",
    });
  });

  it("is direct when no running mesh routes the host, and says where it points", () => {
    expect(serviceRoute("go.arkitekt.live", payload())).toEqual({ kind: "direct", network: "public" });
    expect(serviceRoute("192.168.1.20", payload())).toEqual({ kind: "direct", network: "local" });
    expect(serviceRoute("localhost", undefined)).toEqual({ kind: "direct", network: "this-computer" });
    // A bare label is a name on a network this computer is on (docker, the LAN).
    expect(serviceRoute("mikro", payload())).toEqual({ kind: "direct", network: "local" });
  });

  it("takes an address that looks like Tailscale for a VPN of the computer's own, not the mesh", () => {
    // Not one of the running mesh's machines: an address in the same range is not on it.
    expect(serviceRoute("100.99.0.1", payload())).toEqual({ kind: "direct", network: "vpn" });
    expect(serviceRoute("lab.hyena-sole.ts.net", payload())).toEqual({ kind: "direct", network: "vpn" });
  });

  it("knows an address is on the mesh while the mesh is down: named under it, or lok says so", () => {
    // A stopped mesh routes nothing: the request goes out directly and will not arrive.
    expect(serviceRoute("hub.lab.mesh.arkitekt.live", payload({ state: "stopped" }))).toEqual({ kind: "direct", network: "mesh-down" });
    expect(serviceRoute({ host: "100.64.0.9", reach: "mesh" }, undefined)).toEqual({ kind: "direct", network: "mesh-down" });
  });
});
