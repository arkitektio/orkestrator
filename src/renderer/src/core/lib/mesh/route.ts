import { classifyHost } from "@/core/lib/arkitekt/doctor/classify";
import { coveringMesh, peerFor } from "@/core/lib/arkitekt/doctor/diagnose";
import { controlDomain, type MeshStatusPayload } from "../../../../../main/mesh/protocol";

/**
 * How a request to this host actually travels.
 *
 * Asked of the same table main routes by (`coveringMesh` mirrors `pac.ts`:
 * pinned hosts, peer names, the MagicDNS suffix, peer IPs and the control
 * server's domain) with the live mesh status — so "through the mesh" here
 * means the request really goes through it, not that the name looks like it
 * might.
 */
export type ServiceRoute =
  | {
      kind: "mesh";
      meshLabel: string;
      /** The machine at the other end, when the mesh knows it. */
      peer?: {
        name: string;
        online: boolean;
        /** How the tunnel runs: straight to the peer, or through a relay. */
        path?: { kind: "direct"; address: string } | { kind: "relay"; region: string };
      };
    }
  | {
      kind: "direct";
      /** Where the address points, as far as its shape tells. */
      network: "public" | "local" | "this-computer" | "mesh-looking";
    };

export const serviceRoute = (host: string, mesh: MeshStatusPayload | undefined): ServiceRoute => {
  const covering = coveringMesh(mesh, host);
  if (covering) {
    const peer = peerFor(covering, host);
    return {
      kind: "mesh",
      meshLabel: covering.config.label,
      ...(peer
        ? {
            peer: {
              name: peer.dnsName?.replace(/\.$/, "") ?? peer.hostName ?? peer.ips[0] ?? host,
              online: peer.online,
              ...(peer.relay
                ? { path: { kind: "relay" as const, region: peer.relay } }
                : peer.curAddr
                  ? { path: { kind: "direct" as const, address: peer.curAddr } }
                  : {}),
            },
          }
        : {}),
    };
  }

  const shape = classifyHost(host).class;
  // Under a known mesh's control domain, but that mesh is not up: it would
  // route there if it ran, so a direct attempt is the suspicious case.
  const name = host.trim().toLowerCase().replace(/\.$/, "");
  const underKnownMesh = (mesh?.meshes ?? []).some((snapshot) => {
    const domain = controlDomain(snapshot.config.controlUrl);
    return !!domain && name.endsWith(`.${domain}`);
  });
  if (underKnownMesh) return { kind: "direct", network: "mesh-looking" };
  return {
    kind: "direct",
    network:
      shape === "loopback"
        ? "this-computer"
        : shape === "lan"
          ? "local"
          : shape === "public-dns" || shape === "public-ip"
            ? "public"
            : "mesh-looking",
  };
};
