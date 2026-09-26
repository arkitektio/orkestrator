import { AuthFinish, BankErrorCode, ConnectionStatus, LinkStep } from "../api/graphql";

/**
 * Where a login is, as the dialog shows it, for either way a session
 * finishes. Derived from the last answer the server gave about the connection
 * plus the clock: the server takes one step per request and stores the rest,
 * so this is all the client tracks.
 */
export type AuthPhase =
  | { kind: "approve" } // POLL: the code awaits approval · REDIRECT: consent in the browser
  | { kind: "mfa" } // POLL: approved; the second factor awaits the phone
  | { kind: "active" }
  | { kind: "expired" } // the session ran out before it was finished
  | { kind: "failed"; message: string };

export type LinkAnswer = {
  status: ConnectionStatus;
  linkStep?: LinkStep | null;
  lastError?: string | null;
  lastErrorCode?: BankErrorCode | null;
  isAbandoned?: boolean | null;
};

export const authPhase = (answer: LinkAnswer | null, expiresAt: string, now: number = Date.now()): AuthPhase => {
  if (answer?.status === ConnectionStatus.Active) return { kind: "active" };
  if (answer?.status === ConnectionStatus.Failed || answer?.status === ConnectionStatus.Revoked) {
    return { kind: "failed", message: answer.lastError || "The provider refused the login." };
  }
  if (answer?.status === ConnectionStatus.Expired || answer?.isAbandoned) return { kind: "expired" };
  // A code only matters until it is approved; once at MFA the login lives on.
  if (answer?.linkStep === LinkStep.Mfa) return { kind: "mfa" };
  if (new Date(expiresAt).getTime() <= now) return { kind: "expired" };
  return { kind: "approve" };
};

/** Whether another step is due. */
export const keepPolling = (phase: AuthPhase) => phase.kind === "approve" || phase.kind === "mfa";

/** Seconds between steps: the provider's interval for POLL, a light re-read for REDIRECT. */
export const stepInterval = (finish: AuthFinish, interval?: number | null) =>
  finish === AuthFinish.Poll ? Math.max(1, interval ?? 5) : 3;
