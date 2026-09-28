import { networkInterfaces, type NetworkInterfaceInfo } from "node:os";

import type { VpnInterface } from "./protocol";

/**
 * Tunnel interfaces that are up, from `os.networkInterfaces()` — no
 * subprocess, cheap enough to ask every minute.
 *
 * By name: the unix tunnel families (`utun`, `tun`, `tap`, `wg`, `ppp`,
 * `ipsec`, GlobalProtect's `gpd`) and, on Windows, adapters named after the
 * product that installed them. Only an interface carrying a routable IPv4
 * address counts: macOS keeps utun0..3 up at all times for its own services,
 * with nothing on them but fe80:: addresses.
 */
const UNIX_TUNNEL = /^(utun|tun|tap|wg|ppp|ipsec|gpd)\d*$/i;
const NAMED_TUNNEL = /wireguard|openvpn|\btap\b|tap-windows|cisco|anyconnect|globalprotect|tailscale|zerotier|nordlynx|forticlient|pulse secure/i;

/** 100.64.0.0/10 — the carrier-grade NAT range Tailscale hands out. */
const isTailscaleIp = (address: string): boolean => {
  const [a, b] = address.split(".").map(Number);
  return a === 100 && b >= 64 && b <= 127;
};

const isRoutableV4 = (info: NetworkInterfaceInfo): boolean =>
  info.family === "IPv4" && !info.internal && !info.address.startsWith("169.254.");

export const findVpnInterfaces = (
  nets: NodeJS.Dict<NetworkInterfaceInfo[]> = networkInterfaces(),
): VpnInterface[] => {
  const found: VpnInterface[] = [];
  for (const [name, infos] of Object.entries(nets)) {
    if (!infos || !(UNIX_TUNNEL.test(name) || NAMED_TUNNEL.test(name))) continue;
    const addresses = infos.filter(isRoutableV4).map((info) => info.address);
    if (addresses.length === 0) continue;
    const kind: VpnInterface["kind"] =
      /tailscale/i.test(name) || addresses.some(isTailscaleIp)
        ? "tailscale"
        : /^wg\d*$/i.test(name) || /wireguard|nordlynx/i.test(name)
          ? "wireguard"
          : "vpn";
    found.push({ name, addresses, kind });
  }
  return found;
};
