import { ApolloLink, Observable, execute } from "@apollo/client";
import { gql } from "@apollo/client/core";
import { describe, expect, it, vi } from "vitest";
import { RETRIED_CONTEXT_KEY, createAuthRetryLink } from "./authRetryLink";
import type { TokenResponse } from "../fakts/tokenSchema";

/**
 * The retry itself: one attempt, forced, and bounded.
 *
 * Worth stating plainly, because it is easy to over-claim: Apollo's ErrorLink
 * does not re-enter its handler for the operation it retried, so a persistently
 * rejecting server cannot loop here even without the context guard. What these
 * tests pin is the behaviour that IS ours — that the refresh is forced (an
 * unforced one replays the rejected token), that the guard is honoured when
 * present, and that a subscription drops its socket rather than merely
 * refreshing a token the open socket will never re-read.
 */

const QUERY = gql`
  query Ping {
    __typename
  }
`;

const SUBSCRIPTION = gql`
  subscription Watch {
    __typename
  }
`;

const token = (label: string): TokenResponse =>
  ({ access_token: label, token_type: "Bearer", client_id: "cid" }) as TokenResponse;

const AUTH_ERROR = { message: "Token has expired" };

/** A terminating link that replays a scripted result per attempt. */
const scriptedLink = (results: unknown[]) => {
  const attempts: Record<string, unknown>[] = [];
  const link = new ApolloLink((operation) => {
    attempts.push(operation.getContext());
    const result = results[Math.min(attempts.length - 1, results.length - 1)];
    return new Observable<any>((observer) => {
      observer.next(result);
      observer.complete();
    });
  });
  return { link, attempts };
};

const run = (link: ApolloLink, query = QUERY) =>
  new Promise<any>((resolve, reject) => {
    const results: any[] = [];
    execute(link, { query }).subscribe({
      next: (r) => results.push(r),
      error: reject,
      complete: () => resolve(results),
    });
  });

describe("createAuthRetryLink", () => {
  it("forces a refresh and retries once when the token is rejected", async () => {
    const getToken = vi.fn().mockResolvedValue(token("minted"));
    const { link: terminating, attempts } = scriptedLink([
      { errors: [AUTH_ERROR] },
      { data: { __typename: "Query" } },
    ]);

    const results = await run(createAuthRetryLink({ getToken }).concat(terminating));

    expect(attempts).toHaveLength(2);
    // Unforced, the refresh would hand back the very token that was rejected.
    expect(getToken).toHaveBeenCalledTimes(1);
    expect(getToken).toHaveBeenCalledWith({ forceRefresh: true });
    expect(results.at(-1)).toEqual({ data: { __typename: "Query" } });
  });

  it("makes exactly one attempt against a server that keeps rejecting", async () => {
    const getToken = vi.fn().mockResolvedValue(token("minted"));
    const { link: terminating, attempts } = scriptedLink([{ errors: [AUTH_ERROR] }]);

    const results = await run(createAuthRetryLink({ getToken }).concat(terminating));

    // Original + one retry, then the auth error is allowed to surface instead
    // of being retried forever.
    expect(attempts).toHaveLength(2);
    expect(getToken).toHaveBeenCalledTimes(1);
    expect(results.at(-1).errors[0].message).toBe("Token has expired");
  });

  it("honours an operation already marked as retried", async () => {
    // The guard itself. It is defence in depth rather than load-bearing today,
    // so test it directly — seeding the context is the only way to reach the
    // branch, since ErrorLink never re-enters its own handler.
    const getToken = vi.fn();
    const { link: terminating, attempts } = scriptedLink([{ errors: [AUTH_ERROR] }]);

    await new Promise<void>((resolve, reject) => {
      execute(createAuthRetryLink({ getToken }).concat(terminating), {
        query: QUERY,
        context: { [RETRIED_CONTEXT_KEY]: true },
      }).subscribe({ error: reject, complete: resolve });
    });

    expect(attempts).toHaveLength(1);
    expect(getToken).not.toHaveBeenCalled();
  });

  it("leaves non-auth errors alone", async () => {
    const getToken = vi.fn();
    const { link: terminating, attempts } = scriptedLink([
      { errors: [{ message: "Image matching query does not exist." }] },
    ]);

    await run(createAuthRetryLink({ getToken }).concat(terminating));

    expect(attempts).toHaveLength(1);
    expect(getToken).not.toHaveBeenCalled();
  });

  it("does not retry a PERMISSION_DENIED, which a new token cannot fix", async () => {
    const getToken = vi.fn();
    const { link: terminating, attempts } = scriptedLink([
      {
        errors: [
          {
            message: "Your membership in this organization is blocked.",
            extensions: { code: "PERMISSION_DENIED", reason: "MEMBERSHIP_BLOCKED" },
          },
        ],
      },
    ]);

    await run(createAuthRetryLink({ getToken }).concat(terminating));

    expect(attempts).toHaveLength(1);
    expect(getToken).not.toHaveBeenCalled();
  });

  it("still retries once when the refresh itself fails, surfacing the real error", async () => {
    const getToken = vi.fn().mockRejectedValue(new Error("refresh chain is gone"));
    const { link: terminating, attempts } = scriptedLink([{ errors: [AUTH_ERROR] }]);

    const results = await run(createAuthRetryLink({ getToken }).concat(terminating));

    expect(attempts).toHaveLength(2);
    // The auth error surfaces, not the refresh failure that masked it.
    expect(results.at(-1).errors[0].message).toBe("Token has expired");
  });

  it("drops the socket before retrying a subscription", async () => {
    const getToken = vi.fn().mockResolvedValue(token("minted"));
    const onReauthenticateSocket = vi.fn();
    const { link: terminating } = scriptedLink([
      { errors: [AUTH_ERROR] },
      { data: { __typename: "Subscription" } },
    ]);

    await run(
      createAuthRetryLink({ getToken, onReauthenticateSocket }).concat(terminating),
      SUBSCRIPTION,
    );

    // Refreshing alone would change nothing: connectionParams is only
    // re-evaluated on a new socket.
    expect(onReauthenticateSocket).toHaveBeenCalledTimes(1);
  });

  it("does NOT drop the socket for an ordinary query", async () => {
    const getToken = vi.fn().mockResolvedValue(token("minted"));
    const onReauthenticateSocket = vi.fn();
    const { link: terminating } = scriptedLink([
      { errors: [AUTH_ERROR] },
      { data: { __typename: "Query" } },
    ]);

    await run(createAuthRetryLink({ getToken, onReauthenticateSocket }).concat(terminating));

    expect(onReauthenticateSocket).not.toHaveBeenCalled();
  });
});
