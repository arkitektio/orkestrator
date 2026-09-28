/**
 * What KIND of address is this alias, judged from the string alone?
 *
 * This is the guess the whole doctor hangs off: an alias that is a tailnet
 * address fails for completely different reasons than a public hostname, and
 * the remedy ("you are signed out of Tailscale") only makes sense for the
 * former. Pure, no network, no I/O — so every case below is a cheap test.
 */

export type HostClass =
  | "loopback"
  | "lan"
  | "mesh-ip"
  | "mesh-magicdns"
  | "mesh-bare"
  | "public-dns"
  | "public-ip";

export type MeshVendor = "tailscale";

export type HostClassification = {
  class: HostClass;
  /**
   * Which mesh this looks like, when it looks like one. The extension point:
   * a second vendor adds a value here and a branch in `diagnose`, and every
   * call site keeps working.
   */
  meshVendor?: MeshVendor;
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
    // Tailscale's ULA range. Everything in fd7a:115c:a1e0::/48 is a tailnet.
    if (host.startsWith("fd7a:115c:a1e0")) {
      return { class: "mesh-ip", meshVendor: "tailscale" };
    }
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
    // 100.64.0.0/10 is CGNAT, which in practice means Tailscale.
    if (a === 100 && b >= 64 && b <= 127) {
      return { class: "mesh-ip", meshVendor: "tailscale" };
    }
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
  if (host.endsWith(".ts.net")) {
    return { class: "mesh-magicdns", meshVendor: "tailscale" };
  }
  if (host.endsWith(".local") || host.endsWith(".lan") || host.endsWith(".home.arpa")) {
    return { class: "lan" };
  }
  // A single label with no dot is a bare machine name: MagicDNS short form, a
  // LAN hostname, or a docker service. Treated as mesh-capable because that is
  // the case the user can actually be helped with.
  if (!host.includes(".")) {
    return { class: "mesh-bare", meshVendor: "tailscale" };
  }

  return { class: "public-dns" };
};

const MESH_CLASSES: readonly HostClass[] = ["mesh-ip", "mesh-magicdns", "mesh-bare"];

export const isMeshClass = (classification: HostClassification): boolean =>
  MESH_CLASSES.includes(classification.class);

/** Is it worth asking the OS about a mesh at all? */
export const anyMeshHost = (hosts: string[]): boolean =>
  hosts.some((host) => isMeshClass(classifyHost(host)));
