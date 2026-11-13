import { describe, expect, it } from "vitest";
import type { MeshPeer, MeshPingResult, MeshStatusPayload } from "../../../../../main/mesh/protocol";
import { directnessLine, directnessTargets, summarizeDirectness, type DirectnessTarget } from "./directness";

const peer = (name: string, ip: string, extra: Partial<MeshPeer> = {}): MeshPeer => ({
  dnsName: `${name}.lab.mesh.arkitekt.live.`,
  hostName: name,
  ips: [ip],
  online: true,
  ...extra,
});

const mesh = (peers: MeshPeer[], state = "running"): MeshStatusPayload =>
  ({
    seq: 1,
    sidecar: { state: "ready", version: "t" },
    meshes: [
      {
        config: { id: "lab", label: "Lab", controlUrl: "https://mesh.arkitekt.live", hosts: [] },
        status: { id: "lab", state, proxyPort: 5000, magicDnsSuffix: "lab.mesh.arkitekt.live", peers },
      },
    ],
  }) as MeshStatusPayload;

const ping = (target: string, extra: Partial<MeshPingResult>): MeshPingResult => ({
  target,
  attempt: 1,
  final: true,
  ok: true,
  direct: true,
  ...extra,
});

describe("directnessTargets", () => {
  it("is the machines the services live on through the mesh, once each, by the address main pings", () => {
    const payload = mesh([peer("hub", "100.64.0.2", { curAddr: "192.168.1.9:41641" }), peer("gpu", "100.64.0.3", { relay: "fra" })]);
    const targets = directnessTargets(
      ["hub.lab.mesh.arkitekt.live", "HUB.lab.mesh.arkitekt.live.", "gpu.lab.mesh.arkitekt.live", "go.arkitekt.live"],
      payload,
    );
    expect(targets).toEqual([
      { meshId: "lab", meshLabel: "Lab", target: "100.64.0.2", name: "hub.lab.mesh.arkitekt.live", status: "direct", relay: undefined },
      { meshId: "lab", meshLabel: "Lab", target: "100.64.0.3", name: "gpu.lab.mesh.arkitekt.live", status: "relayed", relay: "fra" },
    ]);
  });

  it("has nothing to ask while the mesh is down, or for a name no machine carries", () => {
    expect(directnessTargets(["hub.lab.mesh.arkitekt.live"], mesh([peer("hub", "100.64.0.2")], "stopped"))).toEqual([]);
    expect(directnessTargets(["nobody.lab.mesh.arkitekt.live"], mesh([peer("hub", "100.64.0.2")]))).toEqual([]);
    expect(directnessTargets(["hub.lab.mesh.arkitekt.live"], undefined)).toEqual([]);
  });

  it("reads a direct endpoint before the relay the node names anyway", () => {
    const [target] = directnessTargets(["hub.lab.mesh.arkitekt.live"], mesh([peer("hub", "100.64.0.2", { curAddr: "1.2.3.4:5", relay: "fra" })]));
    expect(target).toMatchObject({ status: "direct", relay: undefined });
  });
});

describe("summarizeDirectness", () => {
  const hub: DirectnessTarget = { meshId: "lab", meshLabel: "Lab", target: "100.64.0.2", name: "hub", status: "unknown" };
  const gpu: DirectnessTarget = { meshId: "lab", meshLabel: "Lab", target: "100.64.0.3", name: "gpu", status: "unknown" };

  it("is direct only when every machine answered directly", () => {
    const result = summarizeDirectness([hub, gpu], {
      "lab::100.64.0.2": ping("100.64.0.2", { latencyMs: 4 }),
      "lab::100.64.0.3": ping("100.64.0.3", { latencyMs: 9 }),
    });
    expect(result.state).toBe("direct");
    expect(directnessLine(result)).toBe("direct tunnel");
  });

  it("is relayed as soon as one machine answers through a relay, and names the relay", () => {
    const result = summarizeDirectness([hub, gpu], {
      "lab::100.64.0.2": ping("100.64.0.2", {}),
      "lab::100.64.0.3": ping("100.64.0.3", { direct: false, derpRegion: "fra" }),
    });
    expect(result.state).toBe("relayed");
    expect(result.relays).toEqual(["fra"]);
    expect(result.machines[1]).toMatchObject({ name: "gpu", path: "relayed", relay: "fra", measured: true });
    expect(directnessLine(result)).toBe("relayed via fra");
  });

  it("goes by the node's own status until a ping has ended", () => {
    const relayed = { ...hub, status: "relayed" as const, relay: "ams" };
    const before = summarizeDirectness([relayed], {});
    expect(before.state).toBe("relayed");
    expect(before.machines[0].measured).toBe(false);

    // A relayed first attempt does not settle it: the next may be direct.
    const during = summarizeDirectness([hub], { "lab::100.64.0.2": ping("100.64.0.2", { final: false, direct: false, derpRegion: "fra" }) });
    expect(during.state).toBe("checking");
    // A direct attempt does.
    const early = summarizeDirectness([hub], { "lab::100.64.0.2": ping("100.64.0.2", { final: false }) });
    expect(early.state).toBe("direct");
  });

  it("a ping that got no answer is a machine that does not answer; a relay still leads", () => {
    const silent = summarizeDirectness([hub], { "lab::100.64.0.2": ping("100.64.0.2", { ok: false, direct: false }) });
    expect(silent.state).toBe("unreachable");
    const both = summarizeDirectness([hub, gpu], {
      "lab::100.64.0.2": ping("100.64.0.2", { ok: false, direct: false }),
      "lab::100.64.0.3": ping("100.64.0.3", { direct: false, derpRegion: "fra" }),
    });
    expect(both.state).toBe("relayed");
  });

  it("says nothing with no machine to ask, or none asked yet", () => {
    expect(summarizeDirectness([], {}).state).toBe("unknown");
    expect(directnessLine(summarizeDirectness([hub], {}))).toBeUndefined();
  });
});
