import { fromPromise, type ApolloLink } from "@apollo/client";
import { onError } from "@apollo/client/link/error";
import { getMainDefinition } from "@apollo/client/utilities";
import type { GetToken } from "../types";
import { hasRefreshableAuthError } from "./authErrors";

/** Marks an operation as already retried, so a dead session cannot loop. */
export const RETRIED_CONTEXT_KEY = "arkitektAuthRetried";

export const isSubscriptionQuery = (query: Parameters<typeof getMainDefinition>[0]): boolean => {
  const definition = getMainDefinition(query);
  return (
    definition.kind === "OperationDefinition" && definition.operation === "subscription"
  );
};

/**
 * Recover from a rejected token: refresh past it and retry the operation once.
 *
 * `getToken()` already refreshes when the token is near expiry, which handles
 * the ordinary case before a request is ever sent. This link is for the cases
 * the clock cannot predict — a revoked session, clock skew wider than the
 * refresh skew, or a token that aged out while the request was in flight.
 *
 * `forceRefresh` is load-bearing, not decorative: the plain path returns the
 * cached token whenever it still *looks* fresh, and that is precisely the token
 * the server just rejected, so an unforced retry reproduces the failure.
 */
export const createAuthRetryLink = ({
  getToken,
  onReauthenticateSocket,
}: {
  getToken: GetToken;
  /**
   * Called before retrying a subscription. A socket carries the token it was
   * opened with, so re-auth means dropping it — see the builder.
   */
  onReauthenticateSocket?: () => void;
}): ApolloLink =>
  onError(({ graphQLErrors, networkError, operation, forward }) => {
    if (!hasRefreshableAuthError({ graphQLErrors, networkError })) {
      return;
    }

    // Bound the retry to one attempt. Apollo's ErrorLink does not re-enter
    // this handler for the operation it retried, so today the retry is already
    // bounded and this flag is defence in depth — it keeps the bound true if
    // the chain is ever re-composed (a second error link, a RetryLink above
    // this one), where an unbounded retry would let one dead session spin
    // every in-flight query on every service at once.
    //
    // It must live on the OPERATION rather than in this closure: the link is
    // shared by every operation on the client, and a shared flag would let the
    // first failure disable retrying for all the rest.
    if (operation.getContext()[RETRIED_CONTEXT_KEY]) {
      return;
    }
    operation.setContext({ [RETRIED_CONTEXT_KEY]: true });

    return fromPromise(
      getToken({ forceRefresh: true }).catch((e) => {
        // The refresh chain is genuinely gone. Let the original auth error
        // surface rather than masking it with this one.
        console.warn("[arkitekt] forced token refresh failed:", e);
        return null;
      }),
    ).flatMap((token) => {
      if (token && isSubscriptionQuery(operation.query)) {
        onReauthenticateSocket?.();
      }
      return forward(operation);
    });
  });
