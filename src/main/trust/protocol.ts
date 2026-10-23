/**
 * Which hosts may present a certificate Chromium (or Node) would refuse —
 * self-signed, expired, or for another name — the way private deployments
 * routinely do.
 *
 * Each payload is `{ hosts, pins }` (`hosts.ts`, `TrustPayload`): the hosts, and
 * for a strict hub's TLS aliases the certificates they are pinned to (`pins.ts`).
 *
 *   renderer ──ipc invoke──► main : TrustPayload  ("trust:faktsHosts")
 *     Every host the stored profiles' fakts name. Replaces the previous set,
 *     so a removed profile stops being trusted; main keeps it on disk so a
 *     warm boot trusts its deployment before the renderer has loaded.
 *   renderer ──ipc invoke──► main : TrustPayload  ("trust:discoveryHosts")
 *     A host the user typed into a connect field, before any fakts exist, or
 *     a session's hosts just before its aliases are checked (so a fresh grant
 *     does not race its own book write). Added for this run only; the book
 *     sync above is what persists them.
 *   preload ──ipc sendSync──► main : TrustPayload  ("trust:seedHosts")
 *     The hosts of the profile book as it sits in localStorage, sent by each
 *     window's preload before any page script runs. ADDED to the fakts set,
 *     never replacing it (a quick-palette window must not shrink it).
 *
 * Trust must be in place BEFORE the first request to a host: Chromium caches
 * each verdict per certificate and host, and swapping the verify proc does
 * not clear that cache (Electron's RemoteCertVerifier only rebinds its
 * client), so a host refused once stays refused until the entry expires.
 *
 * No runtime dependencies, so the preload and the renderer can import it.
 */

export const TRUST_FAKTS_HOSTS_CHANNEL = "trust:faktsHosts";
export const TRUST_DISCOVERY_HOSTS_CHANNEL = "trust:discoveryHosts";
export const TRUST_SEED_HOSTS_CHANNEL = "trust:seedHosts";

/** Main refuses more than this per call. */
export const TRUST_MAX_HOSTS = 512;
