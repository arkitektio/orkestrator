import type { VpnInterface } from "../../../../../main/doctor/protocol";
import type { MeshStatusPayload } from "../../../../../main/mesh/protocol";
import { serviceRoute } from "./route";

/**
 * How this window reaches the active organization's services, in one word —
 * for the org switcher, which shows it as a border and a folded-out note.
 *
 * - `arkitekt-mesh`: the built-in mesh routes at least one service. Known for
 *   certain: main's proxy table is what `serviceRoute` asks.
 * - `vpn`: a tunnel of the OS's is up (a VPN, WireGuard, a system Tailscale). Whether a given service goes through it is
 *   the OS's routing decision, so this only says it is there.
 * - `direct`: none of the above.
 */
export type ConnectionPath =
  | {
      kind: "arkitekt-mesh";
      meshLabel: string;
      /** Services the mesh carries, of `total`. */
      viaMesh: number;
      total: number;
      /** Of those, how many run through a relay rather than a direct tunnel. */
      relayed: number;
      /** Of those, how many sit on a peer the mesh reports offline. */
      offlinePeers: number;
    }
  | { kind: "vpn"; interfaces: string[] }
  | { kind: "direct" };

/** A path that goes through a tunnel of some kind. */
export type TunnelPath = Exclude<ConnectionPath, { kind: "direct" }>;

/** One line naming the tunnel: a caption, and the screen-reader text. */
export const pathTitle = (path: TunnelPath): string => {
  switch (path.kind) {
    case "arkitekt-mesh":
      return `Arkitekt mesh · ${path.meshLabel}`;
    case "vpn":
      return `VPN · ${path.interfaces.join(", ")}`;
  }
};

export type ConnectionPathInput = {
  /** The active organization's service hosts. */
  hosts: readonly string[];
  mesh?: MeshStatusPayload;
  /** Tunnel interfaces that are up. */
  vpn?: readonly VpnInterface[];
};

export const summarizeConnectionPath = ({
  hosts: rawHosts,
  mesh,
  vpn = [],
}: ConnectionPathInput): ConnectionPath => {
  const hosts = [...new Set(rawHosts.map((host) => host.trim()).filter(Boolean))];
  const total = hosts.length;

  const routes = hosts.map((host) => ({ host, route: serviceRoute(host, mesh) }));
  const meshed = routes.flatMap(({ route }) => (route.kind === "mesh" ? [route] : []));
  if (meshed.length > 0) {
    return {
      kind: "arkitekt-mesh",
      meshLabel: [...new Set(meshed.map((route) => route.meshLabel))].join(", "),
      viaMesh: meshed.length,
      total,
      relayed: meshed.filter((route) => route.peer?.path?.kind === "relay").length,
      offlinePeers: meshed.filter((route) => route.peer && !route.peer.online).length,
    };
  }

  // Everything left is direct as far as the app is concerned; the OS may
  // still hand it to a tunnel.
  if (vpn.length > 0) return { kind: "vpn", interfaces: vpn.map((iface) => iface.name) };

  return { kind: "direct" };
};
