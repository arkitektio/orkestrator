import type { StoredArkitektSession } from "../session/record";
import type { StoredProfile } from "../fakts/profileStorageSchema";
import { isAbortLikeError, refreshAccessToken, RefreshTokenError } from "./auth";

/**
 * One refresh round-trip for a stored session, returning the rotated session.
 *
 * Callers must not invoke this directly with a token they merely hold in
 * memory — go through `rotateProfileSession` (runtime/sharedRefresh.ts), which
 * checks that no other window has already spent it.
 */
export const refreshSession = async (
  session: StoredArkitektSession,
  controller?: AbortController,
): Promise<StoredArkitektSession> => {
  const { token, fakts } = await refreshAccessToken(
    session.endpoint.token_endpoint,
    session.token,
    controller,
  );

  return {
    ...session,
    token,
    // A refresh may legitimately arrive without an envelope (the server renders
    // it best-effort); that means "could not re-render", not "your config went
    // away", so the profile keeps the instances it already had.
    fakts: fakts ?? session.fakts,
  };
};

/**
 * Why a switch failed — which decides whether the profile is dead or just
 * unreachable.
 *
 * `expired` is the only one worth marking a profile stale over. Marking on a
 * network blip would greet a user coming back from a tunnel with a list of
 * organizations all claiming to be signed out, each offering a browser
 * round-trip they do not need.
 */
export type RefreshFailureKind = "expired" | "unreachable" | "unknown";

export const classifyRefreshFailure = (error: unknown): RefreshFailureKind => {
  if (isAbortLikeError(error)) {
    return "unreachable";
  }

  if (error instanceof RefreshTokenError) {
    // RFC 6749 §5.2: `invalid_grant` is the refresh token being expired,
    // revoked, or already rotated away. 400 and 401 are the statuses the token
    // endpoint uses to refuse a credential; a 5xx is the server having a bad
    // day and says nothing about our token.
    if (error.code === "invalid_grant" || error.status === 400 || error.status === 401) {
      return "expired";
    }
    return "unknown";
  }

  // `fetch` rejects with a TypeError when it never got an answer at all —
  // offline, DNS failure, connection refused, TLS refusal.
  if (error instanceof TypeError) {
    return "unreachable";
  }

  return "unknown";
};

/** What to show the user when a switch fails. */
export const describeRefreshFailure = (
  error: unknown,
  profile: StoredProfile,
): { kind: RefreshFailureKind; message: string } => {
  const kind = classifyRefreshFailure(error);
  const where =
    profile.label.organizationName ||
    profile.label.deploymentName ||
    profile.identity.baseUrl;

  switch (kind) {
    case "expired":
      return { kind, message: `Your session for ${where} has expired. Sign in again to use it.` };
    case "unreachable":
      return { kind, message: `Couldn't reach ${where}. Check your connection and try again.` };
    default:
      return {
        kind,
        message: error instanceof Error ? error.message : `Couldn't switch to ${where}.`,
      };
  }
};
