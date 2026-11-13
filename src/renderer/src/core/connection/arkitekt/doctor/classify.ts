/**
 * What KIND of address is this, judged from the string alone?
 *
 * Only what the string can honestly say: where the address would be looked
 * for. It does NOT say whether an address is on the organisation's mesh.
 * That is never readable off the string — it is what lok says of the alias
 * and what the app's own routing table holds (`controller/route.ts`,
 * `mesh/route.ts`). An address in the range VPNs hand out is `vpn-ip`: a
 * private network this computer may or may not be on (a Tailscale of its own,
 * for one), reached like any other, and not the mesh.
 *
 * Pure, no network, no I/O — so every case below is a cheap test.
 */

export type HostClass =
  | "loopback"
  | "lan"
  /** 100.64.0.0/10 or Tailscale's IPv6 range: an address on some VPN. */
  | "vpn-ip"
  /** A single label: a docker service, a LAN hostname, a short name. */
  | "bare"
  | "public-dns"
  | "public-ip";

export type HostClassification = {
  class: HostClass;
};

const IPV4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;

const ipv4Octets = (host: string): number[] | null => {
  const match = IPV4.exec(host);
  if (!match) return null;
  const octets = match.slice(1, 5).map((part) => Number(part));
  return octets.every((octet) => octet >= 0 && octet <= 255) ? octets : null;
};

/** Strip a bracketed IPv6 literal and any trailing dot, and lowercase. */
const normalizeHost = (host: string): string => {
  const trimmed = (host || "").trim().toLowerCase();
  const unbracketed =
    trimmed.startsWith("[") && trimmed.endsWith("]")
      ? trimmed.slice(1, -1)
      : trimmed;
  return unbracketed.endsWith(".") ? unbracketed.slice(0, -1) : unbracketed;
};

const isIpv6 = (host: string): boolean => host.includes(":");

export const classifyHost = (rawHost: string): HostClassification => {
  const host = normalizeHost(rawHost);

  if (!host) return { class: "public-dns" };

  // ── literal IPv6 ──────────────────────────────────────────────────────────
  if (isIpv6(host)) {
    if (host === "::1") return { class: "loopback" };
    // Tailscale's ULA range (fd7a:115c:a1e0::/48): an address on a tailnet —
    // this computer's own or the mesh's, the string cannot say which.
    if (host.startsWith("fd7a:115c:a1e0")) return { class: "vpn-ip" };
    if (host.startsWith("fe80:")) return { class: "lan" };
    // fc00::/7 — unique local, i.e. somebody's private network.
    if (host.startsWith("fc") || host.startsWith("fd")) return { class: "lan" };
    return { class: "public-ip" };
  }

  // ── literal IPv4 ──────────────────────────────────────────────────────────
  const octets = ipv4Octets(host);
  if (octets) {
    const [a, b] = octets;
    if (a === 127) return { class: "loopback" };
    // 100.64.0.0/10 is carrier-grade NAT space, which VPNs (Tailscale among
    // them) hand out.
    if (a === 100 && b >= 64 && b <= 127) return { class: "vpn-ip" };
    if (a === 10) return { class: "lan" };
    if (a === 192 && b === 168) return { class: "lan" };
    if (a === 172 && b >= 16 && b <= 31) return { class: "lan" };
    if (a === 169 && b === 254) return { class: "lan" };
    return { class: "public-ip" };
  }

  // ── names ─────────────────────────────────────────────────────────────────
  if (host === "localhost" || host.endsWith(".localhost")) {
    return { class: "loopback" };
  }
  if (host.endsWith(".local") || host.endsWith(".lan") || host.endsWith(".home.arpa")) {
    return { class: "lan" };
  }
  // A single label with no dot is a bare machine name: a docker service, a
  // LAN hostname, some network's short name.
  if (!host.includes(".")) return { class: "bare" };

  return { class: "public-dns" };
};

/**
 * An address on a VPN of the computer's own, as far as the string tells: a
 * `vpn-ip`, or a name under Tailscale Inc's MagicDNS domain. Used only to
 * word a failure ("is that VPN connected?"), never to route anything.
 */
export const looksLikeVpn = (rawHost: string): boolean => {
  const host = normalizeHost(rawHost);
  return classifyHost(host).class === "vpn-ip" || host.endsWith(".ts.net");
};
