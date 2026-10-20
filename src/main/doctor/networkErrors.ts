import type { TlsStage } from "./protocol";

/**
 * The judgement calls that `networkProbe.ts` would otherwise have to make.
 *
 * Kept here, pure, because the probe itself is the one file in this feature
 * that cannot be unit-tested — it opens real sockets. Everything it would
 * decide is decided in this module instead, against fixtures.
 */

export type ConnectOutcome =
  | "nxdomain"
  | "refused"
  | "timeout"
  | "unreachable"
  | "dns-temp"
  | "reset"
  | "unknown";

/** Our own deadline, distinguished from the OS's ETIMEDOUT only by name. */
export const DOCTOR_TIMEOUT_CODE = "DOCTOR_TIMEOUT";

export const errnoToOutcome = (code: string | undefined): ConnectOutcome => {
  switch (code) {
    case "ENOTFOUND":
      return "nxdomain";
    case "EAI_AGAIN":
      return "dns-temp";
    case "ECONNREFUSED":
      return "refused";
    case "ETIMEDOUT":
    case DOCTOR_TIMEOUT_CODE:
      return "timeout";
    case "EHOSTUNREACH":
    case "ENETUNREACH":
    case "ENETDOWN":
      return "unreachable";
    case "ECONNRESET":
    case "EPIPE":
      return "reset";
    default:
      return "unknown";
  }
};

/** Pull the errno off whatever Node threw, without assuming it is an Error. */
export const errorCode = (error: unknown): string | undefined => {
  if (error && typeof error === "object" && "code" in error) {
    const code = (error as { code?: unknown }).code;
    if (typeof code === "string") return code;
  }
  return undefined;
};

export const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

/** The mesh's own local proxy did not take the connection: the sidecar is gone, not the peer. */
export const MESH_PROXY_DOWN_CODE = "MESH_PROXY_DOWN";
/** The mesh proxy answered and refused the dial (no such peer, port closed, not allowed). */
export const MESH_DIAL_FAILED_CODE = "MESH_DIAL_FAILED";

/**
 * Read a SOCKS dial through the mesh proxy. The `socks` client carries no
 * errno: a socket error on the way to 127.0.0.1 arrives as Node's message
 * ("connect ECONNREFUSED 127.0.0.1:…"), and a refusal from the proxy as
 * "Socks5 proxy rejected connection - <reply>". meshd answers every dial
 * error with the generic SOCKS "Failure", so the cause stays in meshd's log.
 */
export const meshDialCode = (message: string): string => {
  if (/timed? ?out/i.test(message)) return DOCTOR_TIMEOUT_CODE;
  if (/\b(ECONNREFUSED|ECONNRESET|EPIPE)\b/.test(message)) return MESH_PROXY_DOWN_CODE;
  return MESH_DIAL_FAILED_CODE;
};

/**
 * OpenSSL's verify codes for "nobody vouches for this certificate". Both spellings
 * occur: a bare self-signed leaf, and a leaf signed by a private CA.
 */
const SELF_SIGNED_ERRORS = new Set([
  "DEPTH_ZERO_SELF_SIGNED_CERT",
  "SELF_SIGNED_CERT_IN_CHAIN",
  "UNABLE_TO_VERIFY_LEAF_SIGNATURE",
  "UNABLE_TO_GET_ISSUER_CERT",
  "UNABLE_TO_GET_ISSUER_CERT_LOCALLY",
]);

const EXPIRED_ERRORS = new Set(["CERT_HAS_EXPIRED", "CERT_NOT_YET_VALID"]);

export type PeerCertificateLike = {
  subject?: { CN?: string } | null;
  issuer?: { CN?: string; O?: string } | null;
  valid_to?: string;
  subjectaltname?: string;
};

/**
 * Turn what the TLS socket knows into the stage the diagnosis reads.
 *
 * `hostnameError` is the result of `tls.checkServerIdentity`, passed in rather
 * than computed, because the probe has the socket and this module must stay
 * free of `node:tls`.
 */
export const describeCertificate = ({
  authorizationError,
  authorized,
  peerCertificate,
  hostnameError,
  now = new Date(),
}: {
  authorizationError?: string;
  authorized: boolean;
  peerCertificate?: PeerCertificateLike | null;
  hostnameError?: string;
  now?: Date;
}): TlsStage => {
  const subject = peerCertificate?.subject?.CN ?? undefined;
  const issuer = peerCertificate?.issuer?.CN ?? peerCertificate?.issuer?.O ?? undefined;
  const validTo = peerCertificate?.valid_to ?? undefined;

  const expiredByDate = (() => {
    if (!validTo) return false;
    const parsed = Date.parse(validTo);
    return Number.isNaN(parsed) ? false : parsed < now.getTime();
  })();

  const base: TlsStage = {
    attempted: true,
    ok: authorized && !hostnameError,
    authorizationError,
    subject,
    issuer,
    validTo,
  };

  if (base.ok) return base;

  return {
    ...base,
    expired: EXPIRED_ERRORS.has(authorizationError ?? "") || expiredByDate,
    hostnameMismatch:
      !!hostnameError ||
      authorizationError === "ERR_TLS_CERT_ALTNAME_INVALID" ||
      authorizationError === "HOSTNAME_MISMATCH",
    selfSigned: SELF_SIGNED_ERRORS.has(authorizationError ?? ""),
    message: hostnameError || authorizationError,
  };
};

/**
 * Did this port simply not speak TLS? A plain-HTTP port answers a ClientHello
 * with an HTTP error or a protocol violation rather than a certificate, and
 * that is a configuration mistake worth naming precisely.
 */
export const looksLikeNotTls = (error: unknown): boolean => {
  const code = errorCode(error);
  if (code === "EPROTO" || code === "ERR_SSL_WRONG_VERSION_NUMBER") return true;
  const message = errorMessage(error);
  return /wrong version number|packet length too long|unknown protocol|record layer/i.test(
    message,
  );
};
