import type { GraphQLFormattedError } from "graphql";

/**
 * Deciding whether a failed operation is worth a forced token refresh and one
 * retry.
 *
 * authentikate >= 3.1 answers with a machine-readable `extensions.code` — the
 * coarse category a client is meant to branch on — plus a finer `reason`:
 *
 *     {"message": "The access token has expired.",
 *      "extensions": {"code": "UNAUTHENTICATED", "reason": "TOKEN_EXPIRED"}}
 *
 * `code` is the whole contract. `reason` exists so the backend can add failures
 * without breaking us, which only works if we never branch on it — so we don't.
 *
 * The vocabulary (authentikate/errors.py, kante/errors.py):
 *
 *   UNAUTHENTICATED   — no usable credentials: refresh and retry.
 *   PERMISSION_DENIED — authenticated and refused anyway; a new token changes
 *                       nothing, so retrying is a loop.
 *   INTERNAL_ERROR    — a server fault, not a decision about our credentials.
 *                       JwksError lands here on purpose: the signing keys are
 *                       unreachable, and no credential fixes that.
 *   NOT_FOUND / VALIDATION_ERROR / … — ordinary domain errors.
 *
 * Only UNAUTHENTICATED is refreshable; everything else is left alone.
 */

/** The one `extensions.code` that a fresh token can do something about. */
const REFRESHABLE_CODE = "UNAUTHENTICATED";

/**
 * TRANSITIONAL: the auth failures of authentikate <= 3.0, which had no codes.
 *
 * Kept only while services are being upgraded — an un-upgraded one still
 * answers with a bare message and would otherwise never auto-refresh. The
 * newer `client_message` strings are deliberately absent: authentikate
 * translates every authentication failure through `to_graphql_error`, so from
 * 3.1 on they always arrive WITH a code and never reach this list.
 *
 * Delete this once every service is on authentikate >= 3.1.
 *
 * Deliberately absent even in the legacy set: the permission failures
 * (user-not-found, missing organization, blocked membership, provenance).
 * Those authenticate fine and are refused anyway.
 */
const LEGACY_REFRESHABLE_MESSAGES = [
  "token has expired",
  "token claims are invalid",
  "error decoding token",
  "error decoding token header",
  "missing kid in header",
  "no authorization header",
  // MalformedAuthorizationHeader's pre-3.1 wording (authentikate/utils.py).
  "not a valid token",
];

const messageLooksRefreshable = (message: string): boolean => {
  const normalized = message.trim().toLowerCase();
  return LEGACY_REFRESHABLE_MESSAGES.some((candidate) => normalized.includes(candidate));
};

/** Whether a single GraphQL error says "re-authenticate and try again". */
export const isRefreshableAuthError = (
  error: Pick<GraphQLFormattedError, "message" | "extensions">,
): boolean => {
  const code = error.extensions?.code;

  if (typeof code === "string") {
    // A service that speaks codes is authoritative in BOTH directions: a
    // PERMISSION_DENIED carries a perfectly good token and must never be
    // retried, so we must not fall through to message matching and re-decide
    // it on wording.
    return code === REFRESHABLE_CODE;
  }

  return typeof error.message === "string" && messageLooksRefreshable(error.message);
};

/**
 * Whether an operation's errors warrant a forced refresh + retry.
 *
 * `graphQLErrors` is the normal HTTP path. Subscription errors come up the
 * `GraphQLWsLink` branch and can arrive as a `networkError` carrying the
 * GraphQL errors on itself instead, so both shapes are checked.
 */
export const hasRefreshableAuthError = ({
  graphQLErrors,
  networkError,
}: {
  graphQLErrors?: readonly Pick<GraphQLFormattedError, "message" | "extensions">[];
  networkError?: unknown;
}): boolean => {
  if (graphQLErrors?.some(isRefreshableAuthError)) {
    return true;
  }

  if (!networkError || typeof networkError !== "object") {
    return false;
  }

  // `GraphQLWsLink` surfaces a server-sent `error` message as an Error whose
  // `.errors` (or, for a ServerError, `.result.errors`) holds the real payload.
  const candidates = [
    (networkError as { errors?: unknown }).errors,
    (networkError as { result?: { errors?: unknown } }).result?.errors,
  ];

  return candidates.some(
    (errors) =>
      Array.isArray(errors) &&
      errors.some(
        (error) =>
          error &&
          typeof error === "object" &&
          isRefreshableAuthError(error as GraphQLFormattedError),
      ),
  );
};
