/**
 * Which hosts may present a certificate Chromium (or Node) would refuse —
 * self-signed, expired, or for another name — the way private deployments
 * routinely do.
 *
 *   renderer ──ipc invoke──► main : string[]  ("trust:faktsHosts")
 *     Every host the stored profiles' fakts name. Replaces the previous set,
 *     so a removed profile stops being trusted; main keeps it on disk so a
 *     warm boot trusts its deployment before the renderer has loaded.
 *   renderer ──ipc invoke──► main : string[]  ("trust:discoveryHosts")
 *     A host the user typed into a connect field, before any fakts exist, or
 *     a session's hosts just before its aliases are checked (so a fresh grant
 *     does not race its own book write). Added for this run only; the book
 *     sync above is what persists them.
 *
 * No runtime dependencies, so the preload and the renderer can import it.
 */

export const TRUST_FAKTS_HOSTS_CHANNEL = "trust:faktsHosts";
export const TRUST_DISCOVERY_HOSTS_CHANNEL = "trust:discoveryHosts";

/** Main refuses more than this per call. */
export const TRUST_MAX_HOSTS = 512;
