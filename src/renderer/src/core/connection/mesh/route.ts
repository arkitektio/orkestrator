import { classifyHost, looksLikeVpn } from "@/core/connection/arkitekt/doctor/classify";
import { coveringMesh, peerFor } from "@/core/connection/arkitekt/doctor/diagnose";
import { controlDomain, type MeshStatusPayload } from "../../../../../main/mesh/protocol";

/**
 * How a request to this host actually travels.
 *
 * Asked of the same table main routes by (`coveringMesh` mirrors `pac.ts`:
 * pinned hosts, peer names, the MagicDNS suffix, peer IPs and the control
 * server's domain) with the live mesh status — so "through the mesh" here
 * means the request really goes through it, not that the name looks like it
 * might.
 *
 * "The mesh" is only the organisation's: the one the coordination server
 * runs and the app's own node joins. An address on a VPN of the computer's
 * own (a system Tailscale, say) is a direct route like any other — `vpn`.
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
      /**
       * Where the address points, as far as its shape tells — except
       * `mesh-down`, which is known: the address is on the organisation's
       * mesh (lok says so, or it is named under a mesh this window knows),
       * and that mesh is not running here, so the request goes out directly
       * and will not arrive.
       */
      network: "public" | "local" | "this-computer" | "vpn" | "mesh-down";
    };

/** A host, or an alias with what lok says of it. */
export type RoutedAddress = string | { host: string; reach?: string | null; kind?: string | null };

export const serviceRoute = (address: RoutedAddress, mesh: MeshStatusPayload | undefined): ServiceRoute => {
  const host = typeof address === "string" ? address : address.host;
  const saidOnMesh = typeof address !== "string" && (address.reach === "mesh" || address.kind === "mesh");
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
              // Direct first: the node names its home DERP region in `relay`
              // even while the tunnel runs straight to the peer, so a relay
              // is only what is left when there is no direct endpoint. The
              // same order the Mesh page reads them in (`pathOf`).
              ...(peer.curAddr
                ? { path: { kind: "direct" as const, address: peer.curAddr } }
                : peer.relay
                  ? { path: { kind: "relay" as const, region: peer.relay } }
                  : {}),
            },
          }
        : {}),
    };
  }

  // On the mesh, but no running mesh routes it: under a known mesh's control
  // domain, or lok says so. It would route there if the mesh ran.
  const name = host.trim().toLowerCase().replace(/\.$/, "");
  const underKnownMesh = (mesh?.meshes ?? []).some((snapshot) => {
    const domain = controlDomain(snapshot.config.controlUrl);
    return !!domain && name.endsWith(`.${domain}`);
  });
  if (saidOnMesh || underKnownMesh) return { kind: "direct", network: "mesh-down" };

  if (looksLikeVpn(host)) return { kind: "direct", network: "vpn" };
  const shape = classifyHost(host).class;
  return {
    kind: "direct",
    network:
      shape === "loopback"
        ? "this-computer"
        : // A bare label is a name on a network this computer is on (docker, the LAN).
          shape === "lan" || shape === "bare"
          ? "local"
          : "public",
  };
};
