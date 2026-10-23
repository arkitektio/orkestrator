/**
 * The certificate policy, pure so it can be tested without Electron.
 *
 * A bad certificate is accepted only when BOTH hold:
 *  - the host is one the user's fakts name (or one they typed to discover), and
 *    not under a domain that always serves a publicly valid certificate;
 *  - the error is not one that marks the certificate as known-bad. A
 *    self-signed or private-CA deployment fails in many ways (unknown issuer,
 *    wrong name, expired, malformed, SHA-1, weak key…) and the old blanket
 *    bypass accepted all of them, so only REVOKED — which is how Chromium's
 *    SPKI blocklist reports the compromised eMudhra intermediates — and a
 *    known interception certificate are never overridden.
 * Everything else gets Chromium's own verdict.
 */

/**
 * Domains that serve publicly valid certificates. A bad certificate from one of
 * these is an attack, not a self-signed deployment, so they are never lenient
 * even when a profile's fakts name them.
 */
export const STRICT_DOMAINS: readonly string[] = ["arkitekt.live"];

/** net::ERR_CERT_REVOKED, net::ERR_CERT_KNOWN_INTERCEPTION_BLOCKED. */
export const NEVER_OVERRIDDEN_CERT_ERRORS: ReadonlySet<number> = new Set([-206, -217]);

/** `Example.org.` → `example.org`, `[::1]` → `::1`; undefined for junk. */
export const normalizeHost = (host: unknown): string | undefined => {
  if (typeof host !== "string") return undefined;
  const normalized = host.trim().toLowerCase().replace(/^\[|\]$/g, "").replace(/\.$/, "");
  if (!normalized || normalized.length > 253 || /[\s/@]/.test(normalized)) return undefined;
  return normalized;
};

export const isStrictHost = (host: string): boolean =>
  STRICT_DOMAINS.some((domain) => host === domain || host.endsWith(`.${domain}`));

/** Whether `host` may present a certificate that fails verification. */
export const allowsBadCertificate = (hostname: string, trusted: ReadonlySet<string>): boolean => {
  const host = normalizeHost(hostname);
  return host != null && trusted.has(host) && !isStrictHost(host);
};

/** 0 = accept, -3 = use Chromium's verdict (the `setCertificateVerifyProc` contract). */
export const verifyResult = (
  request: { hostname: string; errorCode: number },
  trusted: ReadonlySet<string>,
): 0 | -3 =>
  request.errorCode !== 0 &&
  !NEVER_OVERRIDDEN_CERT_ERRORS.has(request.errorCode) &&
  allowsBadCertificate(request.hostname, trusted)
    ? 0
    : -3;

/** The host list a renderer sent, cleaned; anything not a list is empty. */
export const parseHosts = (hosts: unknown, max: number): string[] => {
  if (!Array.isArray(hosts)) return [];
  const parsed = new Set<string>();
  for (const host of hosts.slice(0, max)) {
    const normalized = normalizeHost(host);
    if (normalized) parsed.add(normalized);
  }
  return [...parsed];
};
