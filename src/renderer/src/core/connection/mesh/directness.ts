import { coveringMesh, peerFor } from "@/core/connection/arkitekt/doctor/diagnose";
import type { MeshPingResult, MeshStatusPayload } from "../../../../../main/mesh/protocol";

/**
 * Is the mesh carrying this organization's services DIRECTLY, or through a
 * relay?
 *
 * A mesh tunnel runs machine to machine when both ends can find each other,
 * and falls back to a relay (DERP) when they cannot: it still works, but
 * every packet goes through somebody else's server, slower and capped. The
 * node's own status says which, but only for a tunnel that has carried
 * traffic lately. So this asks: a ping of each machine a service lives on
 * (`MeshService.ping`, the way `tailscale ping` does), whose answer says
 * `direct` or names the relay — and, as a side effect, makes the two ends try
 * for a direct path again.
 *
 * Pure: which machines to ask, and what the answers add up to. The hook
 * (`useMeshDirectness`) does the asking.
 */

export type DirectnessTarget = {
  meshId: string;
  meshLabel: string;
  /** The machine's mesh address: what main pings, and it must be one the mesh lists. */
  target: string;
  /** The machine, as the mesh names it. */
  name: string;
  /** What the node's own status says of the tunnel, before any ping. */
  status: "direct" | "relayed" | "unknown" | "offline";
  relay?: string;
};

/** The machines the given service hosts are reached on through a running mesh, once each. */
export const directnessTargets = (hosts: readonly string[], mesh: MeshStatusPayload | undefined): DirectnessTarget[] => {
  const targets = new Map<string, DirectnessTarget>();
  for (const host of hosts) {
    const covering = coveringMesh(mesh, host);
    const peer = covering && peerFor(covering, host);
    const address = peer?.ips[0];
    if (!covering || !peer || !address) continue;
    const key = `${covering.config.id}::${address}`;
    if (targets.has(key)) continue;
    targets.set(key, {
      meshId: covering.config.id,
      meshLabel: covering.config.label,
      target: address,
      name: peer.dnsName?.replace(/\.$/, "") ?? peer.hostName ?? address,
      // Direct first: the node names its home relay region even on a direct tunnel.
      status: !peer.online ? "offline" : peer.curAddr ? "direct" : peer.relay ? "relayed" : "unknown",
      relay: peer.curAddr ? undefined : peer.relay,
    });
  }
  return [...targets.values()];
};

export type MachinePath = {
  name: string;
  /** `checking`: a ping is out and nothing is known yet. */
  path: "direct" | "relayed" | "unreachable" | "checking" | "unknown";
  /** The relay region, when relayed. */
  relay?: string;
  latencyMs?: number;
  /** Measured by a ping, rather than read off the node's status. */
  measured: boolean;
};

export type Directness = {
  /**
   * `direct`: every machine is reached directly. `relayed`: at least one goes
   * through a relay. `unreachable`: at least one did not answer and none is
   * relayed. `checking` / `unknown`: nothing to say yet.
   */
  state: "direct" | "relayed" | "unreachable" | "checking" | "unknown";
  machines: MachinePath[];
  /** The relay regions in use, once each. */
  relays: string[];
};

const pathOf = (target: DirectnessTarget, ping: MeshPingResult | undefined): MachinePath => {
  // A ping that ended is the freshest word there is.
  if (ping?.final) {
    if (!ping.ok) return { name: target.name, path: "unreachable", measured: true };
    return ping.direct
      ? { name: target.name, path: "direct", latencyMs: ping.latencyMs, measured: true }
      : { name: target.name, path: "relayed", relay: ping.derpRegion ?? target.relay, latencyMs: ping.latencyMs, measured: true };
  }
  // Still pinging: an attempt that already got through directly settles it;
  // one that came back through a relay does not (the next may be direct).
  if (ping?.ok && ping.direct) return { name: target.name, path: "direct", latencyMs: ping.latencyMs, measured: true };
  if (target.status === "direct") return { name: target.name, path: "direct", measured: false };
  if (target.status === "relayed") return { name: target.name, path: "relayed", relay: target.relay, measured: false };
  if (target.status === "offline") return { name: target.name, path: "unreachable", measured: false };
  return { name: target.name, path: ping ? "checking" : "unknown", measured: false };
};

export const summarizeDirectness = (
  targets: readonly DirectnessTarget[],
  /** Latest ping per `<meshId>::<target>`, as the status store keeps them. */
  pings: Readonly<Record<string, MeshPingResult>>,
): Directness => {
  const machines = targets.map((target) => pathOf(target, pings[`${target.meshId}::${target.target}`]));
  const has = (path: MachinePath["path"]) => machines.some((machine) => machine.path === path);
  const state: Directness["state"] =
    machines.length === 0
      ? "unknown"
      : has("relayed")
        ? "relayed"
        : has("unreachable")
          ? "unreachable"
          : has("checking")
            ? "checking"
            : has("unknown")
              ? "unknown"
              : "direct";
  return {
    state,
    machines,
    relays: [...new Set(machines.flatMap((machine) => (machine.path === "relayed" && machine.relay ? [machine.relay] : [])))],
  };
};

/** One line for the note under the picture; undefined when there is nothing worth saying. */
export const directnessLine = (directness: Directness): string | undefined => {
  switch (directness.state) {
    case "relayed":
      return directness.relays.length > 0 ? `relayed via ${directness.relays.join(", ")}` : "relayed, not direct";
    case "direct":
      return "direct tunnel";
    case "unreachable":
      return "a machine does not answer";
    case "checking":
      return "checking the tunnel…";
    default:
      return undefined;
  }
};
