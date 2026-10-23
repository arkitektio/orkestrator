import {
  endpointUrlsOf,
  hostsOfProfileBook,
  hostsOfSession,
  hostsOfUrls,
  trustOfProfileBook,
  trustOfSession,
  type HostPins,
} from "../../../../../../main/trust/hosts";
import type { StoredArkitektSession } from "../session/record";
import type { FaktsEndpoint } from "./endpointSchema";
import type { StoredProfileBook } from "./profileStorageSchema";

/**
 * Which hosts main lets present a self-signed certificate (`src/main/trust`):
 * every host a stored profile's fakts name, and the host the user typed while
 * discovering. Main applies its own exceptions (arkitekt.live is always
 * strict), so this only says what the fakts name. The extraction itself is
 * `main/trust/hosts.ts`, shared with the preload's startup seed.
 *
 * Outside Electron there is no main to tell; every call is a no-op.
 */

/** The URLs a `.well-known/fakts` document sends the client to. */
export const endpointUrls = (endpoint: FaktsEndpoint | null | undefined): string[] => endpointUrlsOf(endpoint);

/** Every host one session talks to: its endpoints and every alias its fakts name. */
export const sessionHosts = (session: Pick<StoredArkitektSession, "endpoint" | "fakts">): string[] =>
  hostsOfSession(session);

/** Every host the book's profiles talk to, sorted and deduplicated. */
export const faktsHostsOf = (book: StoredProfileBook): string[] => hostsOfProfileBook(book);

let lastSent: string | undefined;

/**
 * Tell main the book's hosts, and the certificates its strict hubs pinned; a book
 * naming the same ones sends nothing.
 */
export const syncTrustedHosts = (book: StoredProfileBook): void => {
  const trust = typeof window !== "undefined" ? window.api?.trust : undefined;
  if (!trust) return;
  const payload = trustOfProfileBook(book);
  const key = JSON.stringify(payload);
  if (key === lastSent) return;
  lastSent = key;
  trust.setFaktsHosts(payload).catch((error) => {
    lastSent = undefined;
    console.warn("[arkitekt] Could not send the trusted hosts to main:", error);
  });
};

/** Hosts (and host+certificate pins) main has been told about this run, so a re-check sends nothing. */
const allowed = new Set<string>();

const allowHosts = async (hosts: string[], pins: HostPins = {}): Promise<void> => {
  const trust = typeof window !== "undefined" ? window.api?.trust : undefined;
  const freshHosts = [...new Set(hosts)].filter((host) => !allowed.has(host));
  const freshPins: HostPins = {};
  for (const [host, pems] of Object.entries(pins)) {
    const fresh = pems.filter((pem) => !allowed.has(`${host}\n${pem}`));
    if (fresh.length) freshPins[host] = fresh;
  }
  if (!trust || (!freshHosts.length && !Object.keys(freshPins).length)) return;
  try {
    await trust.allowDiscoveryHosts({ hosts: freshHosts, pins: freshPins });
    for (const host of freshHosts) allowed.add(host);
    for (const [host, pems] of Object.entries(freshPins)) for (const pem of pems) allowed.add(`${host}\n${pem}`);
  } catch (error) {
    // The request still runs; a self-signed host then fails it, as before.
    console.warn("[arkitekt] Could not trust hosts:", error);
  }
};

/** Let the hosts of `urls` present a self-signed certificate while discovering. */
export const allowDiscoveryHosts = (urls: (string | null | undefined)[]): Promise<void> =>
  allowHosts(hostsOfUrls(urls));

/**
 * Trust a session's hosts — and pin its strict hubs' certificates — before its
 * aliases are checked. The book write that persists them is not awaited by main,
 * so a fresh grant (or the first launch with this build) would otherwise race its
 * own first requests: a strict host checked before its pin arrived would fall to
 * the lenient rule.
 */
export const allowSessionHosts = (session: Pick<StoredArkitektSession, "endpoint" | "fakts">): Promise<void> => {
  const { hosts, pins } = trustOfSession(session);
  return allowHosts(hosts, pins);
};
