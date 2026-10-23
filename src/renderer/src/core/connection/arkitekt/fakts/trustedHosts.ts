import type { StoredArkitektSession } from "../session/record";
import type { FaktsEndpoint } from "./endpointSchema";
import type { StoredProfileBook } from "./profileStorageSchema";

/**
 * Which hosts main lets present a self-signed certificate (`src/main/trust`):
 * every host a stored profile's fakts name, and the host the user typed while
 * discovering. Main applies its own exceptions (arkitekt.live is always
 * strict), so this only says what the fakts name.
 *
 * Outside Electron there is no main to tell; both calls are no-ops.
 */

const hostOf = (url: string | null | undefined): string | undefined => {
  if (!url) return undefined;
  try {
    return new URL(url).hostname.toLowerCase() || undefined;
  } catch {
    return undefined;
  }
};

/** The URLs a `.well-known/fakts` document sends the client to. */
export const endpointUrls = (endpoint: FaktsEndpoint | null | undefined): string[] =>
  endpoint ? [endpoint.base_url, endpoint.device_authorization_endpoint, endpoint.token_endpoint] : [];

const hostsOf = (urls: (string | null | undefined)[]): string[] =>
  urls.map(hostOf).filter((host): host is string => host != null);

/** Every host one session talks to: its endpoints and every alias its fakts name. */
export const sessionHosts = (session: Pick<StoredArkitektSession, "endpoint" | "fakts">): string[] => [
  ...hostsOf(endpointUrls(session.endpoint)),
  session.fakts.self.alias.host.toLowerCase(),
  ...Object.values(session.fakts.instances).flatMap((instance) =>
    instance.aliases.map((alias) => alias.host.toLowerCase()),
  ),
];

/** Every host the book's profiles talk to, sorted and deduplicated. */
export const faktsHostsOf = (book: StoredProfileBook): string[] => {
  const hosts = new Set<string>(hostsOf(endpointUrls(book.lastEndpoint)));
  for (const { session } of Object.values(book.profiles)) {
    for (const host of sessionHosts(session)) hosts.add(host);
  }
  return [...hosts].sort();
};

let lastSent: string | undefined;

/** Tell main the book's hosts; a book naming the same hosts sends nothing. */
export const syncTrustedHosts = (book: StoredProfileBook): void => {
  const trust = typeof window !== "undefined" ? window.api?.trust : undefined;
  if (!trust) return;
  const hosts = faktsHostsOf(book);
  const key = hosts.join("\n");
  if (key === lastSent) return;
  lastSent = key;
  trust.setFaktsHosts(hosts).catch((error) => {
    lastSent = undefined;
    console.warn("[arkitekt] Could not send the trusted hosts to main:", error);
  });
};

/** Hosts main has already been told about this run, so a re-check sends nothing. */
const allowed = new Set<string>();

const allowHosts = async (hosts: string[]): Promise<void> => {
  const trust = typeof window !== "undefined" ? window.api?.trust : undefined;
  const fresh = [...new Set(hosts)].filter((host) => !allowed.has(host));
  if (!trust || !fresh.length) return;
  try {
    await trust.allowDiscoveryHosts(fresh);
    for (const host of fresh) allowed.add(host);
  } catch (error) {
    // The request still runs; a self-signed host then fails it, as before.
    console.warn("[arkitekt] Could not trust hosts:", error);
  }
};

/** Let the hosts of `urls` present a self-signed certificate while discovering. */
export const allowDiscoveryHosts = (urls: (string | null | undefined)[]): Promise<void> =>
  allowHosts(hostsOf(urls));

/**
 * Trust a session's hosts before its aliases are checked. The book write that
 * persists them is not awaited by main, so a fresh grant (or the first launch
 * with this build) would otherwise race its own first requests.
 */
export const allowSessionHosts = (session: Pick<StoredArkitektSession, "endpoint" | "fakts">): Promise<void> =>
  allowHosts(sessionHosts(session));
