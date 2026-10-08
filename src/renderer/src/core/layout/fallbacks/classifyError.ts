import type { ApolloError } from "@apollo/client/errors";

/**
 * The services answer an object-level authorization failure with this text
 * for "missing" and "not yours" alike, so ids cannot be probed across
 * organizations. Matching it is what tells "denied" from a plain error.
 */
const DENIED_RE = /not found,? or you are not authori[sz]ed|permission denied|not permitted|forbidden/i;
const AUTH_REQUIRED_RE =
  /authentication required|not authenticated|login required|must be logged in|token (has )?expired/i;

const DENIED_CODES = new Set(["FORBIDDEN", "PERMISSION_DENIED"]);
const AUTH_REQUIRED_CODES = new Set(["UNAUTHENTICATED"]);

export type QueryErrorKind = "denied" | "unauthenticated" | "network" | "unknown";

export type ClassifiedError = {
  kind: QueryErrorKind;
  /** The human message(s), joined. */
  message: string;
  /** HTTP status of the failed transport, when known. */
  statusCode: number | null;
  /** Every message with its code and path: the "Technical details" block. */
  technical: string;
};

type MaybeApolloError = Partial<ApolloError> & { message?: string; stack?: string };

/** Which fallback a failed page query deserves, and what to print on it. */
export const classifyError = (error: unknown): ClassifiedError => {
  const err = (error ?? {}) as MaybeApolloError;
  const graphQLErrors = err.graphQLErrors ?? [];
  const messages = graphQLErrors.map((e) => e.message).filter(Boolean);
  const codes = graphQLErrors
    .map((e) => e.extensions?.code)
    .filter((code): code is string => typeof code === "string");

  const network = err.networkError as (Error & { statusCode?: number }) | null | undefined;
  const statusCode = network && typeof network.statusCode === "number" ? network.statusCode : null;

  const message =
    messages.length > 0 ? messages.join("\n") : network?.message || err.message || "Unknown error";

  const lines = graphQLErrors.map((e) => {
    const code = typeof e.extensions?.code === "string" ? e.extensions.code : undefined;
    const path = e.path?.length ? `path: ${e.path.join(".")}` : undefined;
    return [e.message, code, path].filter(Boolean).join(" | ");
  });
  if (network) lines.push([network.message, statusCode ? `status: ${statusCode}` : undefined].filter(Boolean).join(" | "));
  const technical = lines.length > 0 ? lines.join("\n") : (err.stack ?? message);

  const result = (kind: QueryErrorKind): ClassifiedError => ({ kind, message, statusCode, technical });

  if (statusCode === 401) return result("unauthenticated");
  if (statusCode === 403) return result("denied");
  if (network) return result("network");
  if (codes.some((code) => DENIED_CODES.has(code)) || messages.some((m) => DENIED_RE.test(m))) return result("denied");
  if (codes.some((code) => AUTH_REQUIRED_CODES.has(code)) || messages.some((m) => AUTH_REQUIRED_RE.test(m))) {
    return result("unauthenticated");
  }
  return result("unknown");
};
