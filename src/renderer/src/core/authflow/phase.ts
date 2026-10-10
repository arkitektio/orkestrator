import type { AuthFinish, AuthSession } from "./types";

/**
 * Where a login is, as the user sees it. Derived from the session the server
 * last answered with plus the clock: the server takes one step per request
 * and stores the rest, so this is all the client tracks.
 */
export type AuthPhase =
  | { kind: "approve" } // POLL: the code awaits approval · REDIRECT: sign-in in the browser
  | { kind: "step"; step: string } // approved; waiting on something else (a second factor)
  | { kind: "done" }
  | { kind: "expired" } // ran out before it was finished
  | { kind: "cancelled" }
  | { kind: "failed"; message: string };

export const authPhase = (
  session: Pick<AuthSession, "status" | "step" | "expiresAt" | "errorMessage">,
  now: number = Date.now(),
): AuthPhase => {
  if (session.status === "DONE") return { kind: "done" };
  if (session.status === "FAILED") {
    return { kind: "failed", message: session.errorMessage || "The provider refused the login." };
  }
  if (session.status === "EXPIRED") return { kind: "expired" };
  if (session.status === "CANCELLED") return { kind: "cancelled" };
  // The deadline is the approval's; once past it the login lives on.
  if (session.step) return { kind: "step", step: session.step };
  if (new Date(session.expiresAt).getTime() <= now) return { kind: "expired" };
  return { kind: "approve" };
};

/** Whether the login is still open. */
export const keepWaiting = (phase: AuthPhase) => phase.kind === "approve" || phase.kind === "step";

/** Seconds between steps: the provider's interval for POLL, a light re-read for REDIRECT. */
export const stepInterval = (finish: AuthFinish, interval?: number | null) =>
  finish === "POLL" ? Math.max(1, interval ?? 5) : 3;
