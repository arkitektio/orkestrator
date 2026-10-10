import type { DocumentNode } from "@apollo/client";
import type { AuthFinish, AuthFlowHandler, AuthSession, AuthStatus, AuthUpdate } from "./types";

/**
 * The contract's `AuthSession` as a service's GraphQL answers it
 * (`AUTH_FLOWS.md` §2): the same fields in every service, with that service's
 * own generated enums.
 */
export type WireAuthSession = {
  state: string;
  status: string;
  finish: string;
  openUrl: string;
  expiresAt: string;
  redirectUrl?: string | null;
  interval?: number | null;
  userCode?: string | null;
  step?: string | null;
  errorCode?: string | null;
  errorMessage?: string | null;
  result?: { identifier: string; id: string; label?: string | null } | null;
};

/** A started (or resumed) login as the host's session. */
export const sessionOf = (wire: WireAuthSession): AuthSession => ({
  state: wire.state,
  status: wire.status as AuthStatus,
  finish: wire.finish as AuthFinish,
  openUrl: wire.openUrl,
  expiresAt: wire.expiresAt,
  redirectUrl: wire.redirectUrl,
  interval: wire.interval,
  userCode: wire.userCode,
  step: wire.step,
  errorCode: wire.errorCode,
  errorMessage: wire.errorMessage,
  result: wire.result ? { identifier: wire.result.identifier, id: wire.result.id, label: wire.result.label } : null,
});

/** The part of an answered session that moves. */
export const updateOf = (wire: WireAuthSession): AuthUpdate => {
  const { status, step, errorCode, errorMessage, result } = sessionOf(wire);
  return { status, step, errorCode, errorMessage, result };
};

/**
 * The `authFlow` builtin of a service that implements the contract as
 * written: `completeAuth`, `authSession` and `cancelAuth`, each answering an
 * `AuthSession`. The module passes its own generated documents; the host
 * never imports them.
 */
export const contractAuthFlow = ({
  documents,
  refetchOnDone,
  ...rest
}: Pick<AuthFlowHandler, "service" | "title" | "describeError" | "restartDialog"> & {
  documents: { complete: DocumentNode; read: DocumentNode; cancel: DocumentNode };
  /** The lists a finished login adds to. */
  refetchOnDone?: DocumentNode[];
}): AuthFlowHandler => ({
  ...rest,
  complete: async (client, { state, code, error, errorDescription }) => {
    const { data } = await client.mutate<{ completeAuth: WireAuthSession }>({
      mutation: documents.complete,
      variables: { input: { state, code, error, errorDescription } },
      // A POLL step that only advances changes no list.
      refetchQueries: (result) => (result.data?.completeAuth.status === "DONE" ? (refetchOnDone ?? []) : []),
    });
    if (!data) throw new Error("The server returned no login");
    return updateOf(data.completeAuth);
  },
  read: async (client, session) => {
    const { data } = await client.query<{ authSession: WireAuthSession }>({
      query: documents.read,
      variables: { state: session.state },
      fetchPolicy: "network-only",
    });
    return updateOf(data.authSession);
  },
  cancel: async (client, session) => {
    await client.mutate({ mutation: documents.cancel, variables: { state: session.state } });
  },
});
