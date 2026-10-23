/**
 * The certificate policy, pure so it can be tested without Electron.
 *
 * A bad certificate is accepted only when BOTH hold:
 *  - the host is one the user's fakts name (or one they typed to discover), and
 *    not under a domain that always serves a publicly valid certificate;
 *  - the error is one a private deployment produces — an unknown issuer, a
 *    wrong name, an expired date. A revoked or blocklisted certificate (such
 *    as the compromised eMudhra intermediates) is never overridden.
 * Everything else gets Chromium's own verdict.
 */

/**
 * Domains that serve publicly valid certificates. A bad certificate from one of
 * these is an attack, not a self-signed deployment, so they are never lenient
 * even when a profile's fakts name them.
 */
export const STRICT_DOMAINS: readonly string[] = ["arkitekt.live"];

/** net::ERR_CERT_COMMON_NAME_INVALID, _DATE_INVALID, _AUTHORITY_INVALID. */
export const OVERRIDABLE_CERT_ERRORS: ReadonlySet<number> = new Set([-200, -201, -202]);

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
  OVERRIDABLE_CERT_ERRORS.has(request.errorCode) &&
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
