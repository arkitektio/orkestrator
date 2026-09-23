import type { MeshConfig, MeshNodeStatus } from "./protocol";
import { controlDomain, isRoutableHost, normalizeHost } from "./protocol";

/**
 * The routing table for Chromium, as a PAC script.
 *
 * One session, one PAC (every window shares `session.defaultSession`), so
 * the script must tell every running mesh apart by name. Rules, in order:
 *
 *   1. an exact host the user pinned to a mesh (`config.hosts`)
 *   2. a peer's own name (full MagicDNS name and short hostname)
 *   3. anything under the mesh's MagicDNS suffix
 *   4. a peer's tailnet IP
 *   5. anything under the mesh CONTROL server's domain — `mesh.arkitekt.live`
 *      routes `*.mesh.arkitekt.live`, which is where ionscale names every
 *      tailnet's machines. This is what routes a deployment through its mesh
 *      with no pinning: it applies as soon as the node runs, before its peers
 *      or suffix are known. The control host itself is never routed (the node
 *      reaches it directly to join), and a domain two running meshes share
 *      is dropped as ambiguous — their own suffixes (3) still tell them apart.
 *   6. DIRECT
 *
 * Names are unique per tailnet by construction (ionscale forms them as
 * `<machine>.<tailnet>.<suffix>`), but 100.64/10 addresses and short labels
 * are NOT unique across tailnets — so an IP or short name claimed by more than
 * one running mesh is dropped from the table rather than sent to the wrong one.
 * Pinned hosts are the user's explicit choice and are never dropped.
 *
 * Pure: no Electron, no clock. `applyRoutes` in `MeshService` is the only
 * caller that touches a session.
 */

export type PacRoute = {
  meshId: string;
  proxyPort: number;
  /** Rule 1 — exact hosts, already normalised. */
  pinned: string[];
  /** Rule 3 — "lab.mesh.example.org", no leading dot. */
  suffix?: string;
  /** Rule 2 — full and short peer names. */
  peerNames: string[];
  /** Rule 4 — tailnet IPs of the peers and of ourselves. */
  ips: string[];
  /** Rule 5 — the control server's host; its SUBDOMAINS route here. */
  domain?: string;
};


const proxyString = (port: number): string => `SOCKS5 127.0.0.1:${port}`;

/** Which running meshes route what. Only meshes with a proxy port take part. */
export const routesFor = (configs: MeshConfig[], statuses: Map<string, MeshNodeStatus>): PacRoute[] => {
  const routes: PacRoute[] = [];
  for (const config of configs) {
    const status = statuses.get(config.id);
    if (!status || status.state !== "running" || !status.proxyPort) continue;
    const peerNames = new Set<string>();
    const ips = new Set<string>();
    for (const peer of status.peers ?? []) {
      if (peer.dnsName) peerNames.add(normalizeHost(peer.dnsName));
      if (peer.hostName) peerNames.add(normalizeHost(peer.hostName));
      for (const ip of peer.ips) ips.add(ip);
    }
    for (const ip of status.selfIps ?? []) ips.add(ip);
    routes.push({
      meshId: config.id,
      proxyPort: status.proxyPort,
      pinned: config.hosts.map(normalizeHost).filter(isRoutableHost),
      suffix: status.magicDnsSuffix ? normalizeHost(status.magicDnsSuffix) : undefined,
      peerNames: [...peerNames].filter(isRoutableHost),
      ips: [...ips].filter(isRoutableHost),
      domain: controlDomain(config.controlUrl),
    });
  }
  return routes;
};

/**
 * Keys claimed by exactly one route survive; a key two meshes both claim is
 * ambiguous and is left out (the caller may pin it explicitly).
 */
const uniqueClaims = (routes: PacRoute[], pick: (route: PacRoute) => string[]): Record<string, string> => {
  const owners = new Map<string, Set<number>>();
  for (const route of routes) {
    for (const key of pick(route)) {
      const set = owners.get(key) ?? new Set<number>();
      set.add(route.proxyPort);
      owners.set(key, set);
    }
  }
  const table: Record<string, string> = {};
  for (const [key, ports] of owners) {
    if (ports.size === 1) table[key] = proxyString([...ports][0]);
  }
  return table;
};

/** The PAC source, or `undefined` when nothing routes anywhere (= DIRECT). */
export const buildPac = (routes: PacRoute[]): string | undefined => {
  if (routes.length === 0) return undefined;

  // Pinned hosts win outright, first mesh listed wins a tie: the user asked.
  const pinned: Record<string, string> = {};
  for (const route of routes) {
    for (const host of route.pinned) {
      if (!(host in pinned)) pinned[host] = proxyString(route.proxyPort);
    }
  }
  const names = uniqueClaims(routes, (route) => route.peerNames);
  const ips = uniqueClaims(routes, (route) => route.ips);
  const suffixes = routes
    .filter((route) => route.suffix)
    .map((route) => [route.suffix as string, proxyString(route.proxyPort)] as const);
  const domains = Object.entries(uniqueClaims(routes, (route) => (route.domain ? [route.domain] : [])));

  if (
    Object.keys(pinned).length === 0 &&
    Object.keys(names).length === 0 &&
    Object.keys(ips).length === 0 &&
    suffixes.length === 0 &&
    domains.length === 0
  ) {
    return undefined;
  }

  // Every value is validated by `isRoutableHost` and serialised with
  // JSON.stringify, so nothing user-supplied can alter the script's shape.
  return [
    "// Generated by Orkestrator's MeshService — do not edit.",
    `var PINNED = ${JSON.stringify(pinned)};`,
    `var NAMES = ${JSON.stringify(names)};`,
    `var IPS = ${JSON.stringify(ips)};`,
    `var SUFFIXES = ${JSON.stringify(suffixes)};`,
    `var DOMAINS = ${JSON.stringify(domains)};`,
    "function FindProxyForURL(url, host) {",
    "  host = host.toLowerCase();",
    "  if (host.charAt(host.length - 1) === '.') host = host.slice(0, -1);",
    "  if (Object.prototype.hasOwnProperty.call(PINNED, host)) return PINNED[host];",
    "  if (Object.prototype.hasOwnProperty.call(NAMES, host)) return NAMES[host];",
    "  if (Object.prototype.hasOwnProperty.call(IPS, host)) return IPS[host];",
    "  for (var i = 0; i < SUFFIXES.length; i++) {",
    "    var s = SUFFIXES[i][0];",
    "    if (host === s || dnsDomainIs(host, '.' + s)) return SUFFIXES[i][1];",
    "  }",
    // Strict subdomains only: the control server itself stays DIRECT.
    "  for (var j = 0; j < DOMAINS.length; j++) {",
    "    if (dnsDomainIs(host, '.' + DOMAINS[j][0])) return DOMAINS[j][1];",
    "  }",
    "  return 'DIRECT';",
    "}",
    "",
  ].join("\n");
};

/** Chromium accepts a PAC script inline as a data: URL. */
export const pacDataUrl = (script: string): string =>
  `data:application/x-ns-proxy-autoconfig;base64,${Buffer.from(script, "utf8").toString("base64")}`;

/**
 * The same table, for the main process's own Node clients: which proxy (if
 * any) a host should tunnel through. Mirrors the PAC rules exactly.
 */
export const proxyPortForHost = (routes: PacRoute[], rawHost: string): number | undefined => {
  const host = normalizeHost(rawHost);
  for (const route of routes) {
    if (route.pinned.includes(host)) return route.proxyPort;
  }
  const names = uniqueClaims(routes, (route) => route.peerNames);
  if (names[host]) return portOf(names[host]);
  const ips = uniqueClaims(routes, (route) => route.ips);
  if (ips[host]) return portOf(ips[host]);
  for (const route of routes) {
    if (route.suffix && (host === route.suffix || host.endsWith(`.${route.suffix}`))) return route.proxyPort;
  }
  const domains = uniqueClaims(routes, (route) => (route.domain ? [route.domain] : []));
  for (const [domain, proxy] of Object.entries(domains)) {
    if (host.endsWith(`.${domain}`)) return portOf(proxy);
  }
  return undefined;
};

const portOf = (proxy: string): number => Number(proxy.split(":").pop());
