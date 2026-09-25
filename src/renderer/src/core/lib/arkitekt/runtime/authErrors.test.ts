import { describe, expect, it } from "vitest";
import { hasRefreshableAuthError, isRefreshableAuthError } from "./authErrors";

/**
 * What counts as "the token was rejected, try again with a new one".
 *
 * The services answer auth failures with HTTP 200 and a GraphQL error whose
 * only content is an English message, so this classifier — not a status code —
 * is what decides whether a forced refresh happens at all. The two directions
 * matter equally: missing a real auth error means the app just fails, and
 * misreading a permission error as an auth error means retrying something that
 * can never succeed.
 */

describe("isRefreshableAuthError", () => {
  it.each([
    "Token has expired",
    "Token claims are invalid",
    "Error decoding token",
    "Error decoding token header",
    "Missing kid in header",
    "No Authorization header",
    "Not a valid token",
  ])("treats the authentikate message %o as refreshable", (message) => {
    expect(isRefreshableAuthError({ message })).toBe(true);
  });

  it("matches messages case-insensitively and inside longer text", () => {
    expect(isRefreshableAuthError({ message: "  TOKEN HAS EXPIRED  " })).toBe(true);
  });

  it("leaves ordinary business errors alone", () => {
    expect(isRefreshableAuthError({ message: "Image matching query does not exist." })).toBe(
      false,
    );
    // Contains "token" but is not an auth failure.
    expect(isRefreshableAuthError({ message: "Invalid provenance token args" })).toBe(false);
  });

  // The real wire shapes from authentikate >= 3.1, message and code together.
  it.each([
    ["The access token has expired.", "TOKEN_EXPIRED"],
    ["The access token is malformed.", "TOKEN_MALFORMED"],
    ["The access token could not be verified.", "TOKEN_INVALID"],
    ["No Authorization header was provided.", "NO_AUTHORIZATION_HEADER"],
    ["The Authorization header is not a valid Bearer token.", "MALFORMED_AUTHORIZATION_HEADER"],
    ["The token was signed with an unknown key.", "SIGNING_KEY_NOT_FOUND"],
    ["No user matches these credentials.", "USER_NOT_FOUND"],
  ])("retries UNAUTHENTICATED/%s", (message, reason) => {
    expect(
      isRefreshableAuthError({ message, extensions: { code: "UNAUTHENTICATED", reason } }),
    ).toBe(true);
  });

  it.each([
    // Authenticated and refused anyway — a new token changes nothing.
    ["You are not allowed to perform this action.", "PERMISSION_DENIED", "PERMISSION_DENIED"],
    ["Your membership in this organization is blocked.", "PERMISSION_DENIED", "MEMBERSHIP_BLOCKED"],
    ["The token does not name an active organization.", "PERMISSION_DENIED", "MISSING_ACTIVE_ORGANIZATION"],
    ["requires scope read:users", "PERMISSION_DENIED", "INSUFFICIENT_SCOPE"],
    // A server fault, not a verdict on our credentials: authentikate routes
    // JwksError here precisely so clients do not re-authenticate at it.
    ["The signing keys could not be retrieved. Try again later.", "INTERNAL_ERROR", "KEY_RETRIEVAL_FAILED"],
  ])("does NOT retry %s (%s)", (message, code, reason) => {
    expect(isRefreshableAuthError({ message, extensions: { code, reason } })).toBe(false);
  });

  it("leaves ordinary coded domain errors alone", () => {
    expect(
      isRefreshableAuthError({ message: "No dataset with that id", extensions: { code: "NOT_FOUND" } }),
    ).toBe(false);
  });

  it("a code wins even when the legacy message would have matched", () => {
    // Otherwise a service that correctly says PERMISSION_DENIED could still be
    // retried on the strength of its human-readable wording.
    expect(
      isRefreshableAuthError({
        message: "Token has expired",
        extensions: { code: "PERMISSION_DENIED" },
      }),
    ).toBe(false);
  });

  it("never branches on reason alone", () => {
    // `reason` is free to grow; only `code` is the contract.
    expect(
      isRefreshableAuthError({
        message: "something new",
        extensions: { code: "UNAUTHENTICATED", reason: "A_REASON_ADDED_LATER" },
      }),
    ).toBe(true);
  });
});

describe("hasRefreshableAuthError", () => {
  it("finds the error among several graphQLErrors", () => {
    expect(
      hasRefreshableAuthError({
        graphQLErrors: [{ message: "Something else" }, { message: "Token has expired" }],
      }),
    ).toBe(true);
  });

  it("is false with nothing to go on", () => {
    expect(hasRefreshableAuthError({})).toBe(false);
    expect(hasRefreshableAuthError({ graphQLErrors: [], networkError: undefined })).toBe(false);
  });

  it("unwraps subscription errors carried on a networkError", () => {
    // GraphQLWsLink surfaces a server-sent `error` message as an Error holding
    // the payload, rather than as graphQLErrors — so a subscription rejected
    // for a stale token arrives in this shape, not the HTTP one.
    const networkError = Object.assign(new Error("ws error"), {
      errors: [{ message: "Token has expired" }],
    });
    expect(hasRefreshableAuthError({ networkError })).toBe(true);
  });

  it("unwraps a ServerError-style result.errors too", () => {
    const networkError = Object.assign(new Error("server error"), {
      result: { errors: [{ message: "Token has expired" }] },
    });
    expect(hasRefreshableAuthError({ networkError })).toBe(true);
  });

  it("ignores a network error that is just a network error", () => {
    expect(hasRefreshableAuthError({ networkError: new Error("Failed to fetch") })).toBe(false);
  });
});
