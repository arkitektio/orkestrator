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

/**
 * What a "denied" names as missing, when it names anything. authentikate's
 * field directive says it in `extensions` (`reason` + `requiredScopes` /
 * `requiredRoles` / …); the object-level refusal says nothing, on purpose,
 * and has no `denial`.
 *
 * - `scope`: the token was issued without a scope. Scopes are fixed at sign-in.
 * - `role`: the token (or the membership) lacks a role. Roles a user was just
 *   given only arrive with a new token.
 * - `guest`: the sign-in is a guest's (collaborations only); a new sign-in
 *   does not change that.
 */
export type DenialKind = "scope" | "role" | "guest";

export type Denial = {
  kind: DenialKind;
  /** The server's `reason` ("INSUFFICIENT_SCOPE"), or "" when read off the words. */
  reason: string;
  /** The scopes or roles the server says are missing; may be empty. */
  needed: string[];
  /** Any one of `needed` would do (`requiredAnyRoleOf`), rather than all of them. */
  any: boolean;
  /** Whether signing in again can fix it: true for scopes and roles, never for a guest. */
  signInHelps: boolean;
};

export type ClassifiedError = {
  kind: QueryErrorKind;
  /** The human message(s), joined. */
  message: string;
  /** HTTP status of the failed transport, when known. */
  statusCode: number | null;
  /** Every message with its code and path: the "Technical details" block. */
  technical: string;
  /** For `denied`: the scope or role that was missing, when the server named it. */
  denial?: Denial;
};

const SCOPE_REASONS = new Set(["INSUFFICIENT_SCOPE"]);
const ROLE_REASONS = new Set(["INSUFFICIENT_ROLE", "INSUFFICIENT_ORGANIZATION_ROLE"]);
const GUEST_REASONS = new Set(["FULL_MEMBERSHIP_REQUIRED", "SCOPED_READ_ONLY"]);

/** The directive's own words, for a server whose errors carry no `reason`. */
const REQUIRED_RE = /does not have (any of )?the required (organization )?(scopes|roles): (.+)$/i;

const names = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((v): v is string => typeof v === "string" && v.length > 0) : [];

/** "['read', 'write']" or "admin, approver" → ["read", "write"]. */
const splitNames = (text: string): string[] =>
  text
    .replace(/[[\]'"]/g, "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

const denial = (kind: DenialKind, reason: string, needed: string[], any: boolean): Denial => ({
  kind,
  reason,
  needed,
  any,
  signInHelps: kind !== "guest",
});

type DeniedLike = { message?: string; extensions?: Record<string, unknown> | null };

/** The first scope / role / guest denial among the errors; undefined for the object-level refusal. */
export const readDenial = (graphQLErrors: readonly DeniedLike[]): Denial | undefined => {
  for (const error of graphQLErrors) {
    const ext = error.extensions ?? {};
    const reason = typeof ext.reason === "string" ? ext.reason : "";
    if (SCOPE_REASONS.has(reason)) {
      const all = names(ext.requiredScopes);
      return denial("scope", reason, all.length ? all : names(ext.requiredAnyScopeOf), all.length === 0);
    }
    if (ROLE_REASONS.has(reason)) {
      const all = [...names(ext.requiredRoles), ...names(ext.requiredOrganizationRoles)];
      const any = [...names(ext.requiredAnyRoleOf), ...names(ext.requiredAnyOrganizationRoleOf)];
      return denial("role", reason, all.length ? all : any, all.length === 0 && any.length > 0);
    }
    if (GUEST_REASONS.has(reason)) return denial("guest", reason, [], false);

    const words = error.message?.match(REQUIRED_RE);
    if (words) {
      const kind = words[3].toLowerCase() === "scopes" ? "scope" : "role";
      return denial(kind, "", splitNames(words[4]), !!words[1]);
    }
  }
  return undefined;
};

/** "the admin role", "the admin or approver role", "the read and write scopes". */
export const describeNeeded = (denial: Denial): string => {
  const noun = denial.kind === "scope" ? "scope" : "role";
  if (denial.needed.length === 0) return `a ${noun} this requires`;
  const last = denial.needed[denial.needed.length - 1];
  const joined =
    denial.needed.length === 1 ? last : `${denial.needed.slice(0, -1).join(", ")} ${denial.any ? "or" : "and"} ${last}`;
  const plural = denial.needed.length > 1 && !denial.any;
  return `the ${joined} ${noun}${plural ? "s" : ""}`;
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
  const named = readDenial(graphQLErrors as readonly DeniedLike[]);
  if (statusCode === 403 || named) return { ...result("denied"), denial: named };
  if (network) return result("network");
  if (codes.some((code) => DENIED_CODES.has(code)) || messages.some((m) => DENIED_RE.test(m))) return result("denied");
  if (codes.some((code) => AUTH_REQUIRED_CODES.has(code)) || messages.some((m) => AUTH_REQUIRED_RE.test(m))) {
    return result("unauthenticated");
  }
  return result("unknown");
};
