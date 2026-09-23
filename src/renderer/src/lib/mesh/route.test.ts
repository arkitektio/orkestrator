import { describe, expect, it } from "vitest";
import type { MeshStatusPayload } from "../../../../main/mesh/protocol";
import { serviceRoute } from "./route";

const payload = (status: Record<string, unknown> = {}, config: Record<string, unknown> = {}): MeshStatusPayload =>
  ({
    sidecar: { state: "ready", version: "t" },
    meshes: [
      {
        config: { id: "lab", label: "Lab mesh", controlUrl: "https://mesh.arkitekt.live", hosts: [], hasNodeState: true, ...config },
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
    // A stopped mesh routes nothing: this is the suspicious case.
    expect(serviceRoute("hub.lab.mesh.arkitekt.live", payload({ state: "stopped" }))).toEqual({ kind: "direct", network: "mesh-looking" });
  });
});
