/**
 * Every host a stored profile book's fakts name — read from the book as it sits
 * in `localStorage["arkitektProfiles"]`, unvalidated, so the preload can seed
 * main before the renderer has parsed anything. No runtime dependencies (the
 * preload, main and the renderer all import it); anything malformed is skipped,
 * never thrown.
 */

export const PROFILE_BOOK_STORAGE_KEY = "arkitektProfiles";

type Loose = Record<string, unknown>;

const asObject = (value: unknown): Loose | undefined =>
  value != null && typeof value === "object" && !Array.isArray(value) ? (value as Loose) : undefined;

const hostOfUrl = (url: unknown): string | undefined => {
  if (typeof url !== "string" || !url) return undefined;
  try {
    return new URL(url).hostname.toLowerCase() || undefined;
  } catch {
    return undefined;
  }
};

const hostOfAlias = (alias: unknown): string | undefined => {
  const host = asObject(alias)?.host;
  return typeof host === "string" && host ? host.toLowerCase() : undefined;
};

/** The URLs a `.well-known/fakts` document sends the client to. */
export const endpointUrlsOf = (endpoint: unknown): string[] => {
  const e = asObject(endpoint);
  if (!e) return [];
  return [e.base_url, e.device_authorization_endpoint, e.token_endpoint].filter(
    (url): url is string => typeof url === "string",
  );
};

/** Every host one session talks to: its endpoints and every alias its fakts name. */
export const hostsOfSession = (session: unknown): string[] => {
  const s = asObject(session);
  if (!s) return [];
  const hosts: (string | undefined)[] = endpointUrlsOf(s.endpoint).map(hostOfUrl);
  const fakts = asObject(s.fakts);
  hosts.push(hostOfAlias(asObject(fakts?.self)?.alias));
  for (const instance of Object.values(asObject(fakts?.instances) ?? {})) {
    const aliases = asObject(instance)?.aliases;
    if (Array.isArray(aliases)) hosts.push(...aliases.map(hostOfAlias));
  }
  return hosts.filter((host): host is string => host != null);
};

/** Every host the book's profiles talk to, sorted and deduplicated. */
export const hostsOfProfileBook = (book: unknown): string[] => {
  const b = asObject(book);
  if (!b) return [];
  const hosts = new Set<string>();
  for (const url of endpointUrlsOf(b.lastEndpoint)) {
    const host = hostOfUrl(url);
    if (host) hosts.add(host);
  }
  for (const profile of Object.values(asObject(b.profiles) ?? {})) {
    for (const host of hostsOfSession(asObject(profile)?.session)) hosts.add(host);
  }
  return [...hosts].sort();
};

/** host → the PEM certificates a strict hub registered for it (see {@link pinsOfSession}). */
export type HostPins = Record<string, string[]>;

/**
 * The certificates one session's strict instances pin: for every TLS alias of an
 * instance whose hub registered its certificate (`instance.tls.certificates`),
 * its host → those certificates. Plain aliases pin nothing: they are not TLS.
 */
export const pinsOfSession = (session: unknown, into: HostPins = {}): HostPins => {
  const fakts = asObject(asObject(session)?.fakts);
  for (const instance of Object.values(asObject(fakts?.instances) ?? {})) {
    const i = asObject(instance);
    const certificates = asObject(i?.tls)?.certificates;
    if (!Array.isArray(certificates)) continue;
    const pems = certificates.filter((pem): pem is string => typeof pem === "string" && pem.includes("BEGIN CERTIFICATE"));
    if (!pems.length || !Array.isArray(i?.aliases)) continue;
    for (const alias of i.aliases) {
      if (asObject(alias)?.ssl !== true) continue;
      const host = hostOfAlias(alias);
      if (!host) continue;
      into[host] = [...new Set([...(into[host] ?? []), ...pems])];
    }
  }
  return into;
};

/** What main is told: every fakts host, and the certificates the strict ones are pinned to. */
export type TrustPayload = { hosts: string[]; pins: HostPins };

/** The book's {@link TrustPayload}. */
export const trustOfProfileBook = (book: unknown): TrustPayload => {
  const pins: HostPins = {};
  for (const profile of Object.values(asObject(asObject(book)?.profiles) ?? {})) {
    pinsOfSession(asObject(profile)?.session, pins);
  }
  return { hosts: hostsOfProfileBook(book), pins };
};

/** One session's {@link TrustPayload}. */
export const trustOfSession = (session: unknown): TrustPayload => ({
  hosts: [...new Set(hostsOfSession(session))],
  pins: pinsOfSession(session),
});

/** `urls` as hostnames, junk dropped. */
export const hostsOfUrls = (urls: unknown[]): string[] =>
  urls.map(hostOfUrl).filter((host): host is string => host != null);
