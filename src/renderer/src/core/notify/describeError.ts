import { classifyError, type QueryErrorKind } from "@/core/layout/fallbacks/classifyError";

/**
 * Any failure (an Apollo error, a thrown `Error`, a string, a rejection with
 * nothing in it) as one sentence a person can read, plus the raw text behind
 * it for "Copy details". The one place that decides how an error reads: the
 * toast island (`reportError`) and a dialog's inline error (`DialogError`)
 * both print `message`, never `error.message`.
 */
export type DescribedError = {
  kind: QueryErrorKind;
  /** One sentence, no codes or paths. */
  message: string;
  /** Every message with its code and path; for a copy, never for display. */
  technical: string;
};

export const NO_REASON = "The server did not say why.";

const SENTENCES: Record<Exclude<QueryErrorKind, "unknown">, string> = {
  network: "Couldn't reach the server.",
  unauthenticated: "Your session ran out. Sign in again.",
  denied: "You're not allowed to do this.",
};

/** `fetch` failing outright (offline, DNS, refused) is a `TypeError`, not an Apollo network error. */
const isFetchFailure = (error: unknown) =>
  error instanceof TypeError && /failed to fetch|network ?error|load failed/i.test(error.message);

export const describeError = (error: unknown): DescribedError => {
  if (typeof error === "string") {
    const message = error.trim();
    return { kind: "unknown", message: message || NO_REASON, technical: error };
  }

  // An error that already reads as a sentence and carries its own raw text
  // (rekuest's `AssignError`, a module's coded error): taken as it is.
  if (error instanceof Error && typeof (error as { technical?: unknown }).technical === "string") {
    const own = error as Error & { technical: string; kind?: QueryErrorKind };
    return { kind: own.kind ?? "unknown", message: own.message || NO_REASON, technical: own.technical };
  }

  const classified = classifyError(error);
  const kind = isFetchFailure(error) ? "network" : classified.kind;
  if (kind !== "unknown") return { kind, message: SENTENCES[kind], technical: classified.technical };

  // The server's own words: the first message, without the client's wrapping.
  const first = classified.message.split("\n")[0]?.trim();
  const message = !error || !first || first === "Unknown error" ? NO_REASON : first;
  return { kind, message, technical: classified.technical };
};

/** A cancellation the user asked for is not a failure. */
export const isAbort = (error: unknown) =>
  !!error && typeof error === "object" && (error as { name?: unknown }).name === "AbortError";
