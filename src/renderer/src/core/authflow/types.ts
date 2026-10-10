import type { ApolloClient } from "@apollo/client";

/**
 * A login at an external provider that a backend service started and
 * Orkestrator carries the user through (see `AUTH_FLOWS.md`, the contract).
 * These are the contract's shapes as the host sees them, whichever service
 * they came from.
 */

/** How it finishes: the provider redirects back with a code, or the app polls. */
export type AuthFinish = "REDIRECT" | "POLL";

export type AuthStatus = "PENDING" | "DONE" | "FAILED" | "EXPIRED" | "CANCELLED";

/** What a finished login linked, as a Structure (the host opens its page). */
export type AuthResult = { identifier: string; id: string; label?: string | null };

export type AuthSession = {
  /** The handle of the login: opaque, single-use, stored by the server. */
  state: string;
  status: AuthStatus;
  finish: AuthFinish;
  /** What opens in the user's browser. */
  openUrl: string;
  expiresAt: string;
  /** REDIRECT: where the provider sends the browser back to (the relay). */
  redirectUrl?: string | null;
  /** POLL: seconds between two steps. */
  interval?: number | null;
  /** POLL: the code the user confirms on the provider's page. */
  userCode?: string | null;
  /** Past the first approval and waiting on something else ("MFA"); null before. */
  step?: string | null;
  errorCode?: string | null;
  errorMessage?: string | null;
  /** Set once DONE; earlier when the linked object already exists (a relink). */
  result?: AuthResult | null;
};

/** What a step or a read answers: the part of the session that moves. */
export type AuthUpdate = Pick<AuthSession, "status"> &
  Partial<Pick<AuthSession, "step" | "errorCode" | "errorMessage" | "result">>;

/** What the provider's redirect carried (or the user pasted). */
export type AuthCompletion = {
  state: string;
  code?: string;
  /** The provider's own refusal (`error` / `error_description`), in place of a code. */
  error?: string;
  errorDescription?: string;
};

/**
 * A module's side of the contract (its `authFlow` builtin): the requests on
 * its own service that every login needs once it is started. Starting one
 * stays the module's own mutation, since what a login needs differs.
 */
export type AuthFlowHandler = {
  /** The service key whose client runs these. */
  service: string;
  /** What the login is called on the callback page ("Bank login"). */
  title: string;
  /** REDIRECT: finish with the redirect's code, or record its refusal. POLL: advance one step (no code). */
  complete: (client: ApolloClient<any>, input: AuthCompletion) => Promise<AuthUpdate>;
  /** Where the login is, without moving it; a REDIRECT dialog re-reads with it. */
  read?: (client: ApolloClient<any>, session: AuthSession) => Promise<AuthUpdate | null>;
  /** Drop a login that will not be finished. */
  cancel?: (client: ApolloClient<any>, session: AuthSession) => Promise<void>;
  /** A failed request as a sentence; defaults to the error's message. */
  describeError?: (error: unknown) => string;
  /** The dialog that starts a new login, offered when one could not be finished. */
  restartDialog?: string;
};
