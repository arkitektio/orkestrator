import { classifyError, type QueryErrorKind } from "@/core/layout/fallbacks/classifyError";
import { reportError } from "@/core/notify";

/**
 * A request rekuest refused (assign, cancel), as one sentence a person can
 * read. `useAssign` throws it and shows nothing itself: the place the run was
 * started from shows `message` inline, or calls `notifyAssignError` when it
 * has no such place. One failure, one message.
 */
export class AssignError extends Error {
  readonly kind: QueryErrorKind;
  /** The server's `extensions.code`, when it sent one. */
  readonly code: string | null;
  /** Every message with its code and path, for a tooltip or a copy. */
  readonly technical: string;

  constructor(reason: string, details: { kind: QueryErrorKind; code: string | null; technical: string; cause?: unknown }) {
    super(reason, { cause: details.cause });
    this.name = "AssignError";
    this.kind = details.kind;
    this.code = details.code;
    this.technical = details.technical;
  }
}

/**
 * Sentences for the codes rekuest names, keyed on `extensions.code`: add a
 * code here once the backend sends it.
 */
const CODE_REASONS: Record<string, string> = {};

const STATEFUL_NEEDS_AGENT = "This action runs on a specific device. Choose which one.";

/**
 * Refusals rekuest words but does not code yet, by how its message starts.
 * One moves to `CODE_REASONS` once the backend sends a code for it.
 */
const MESSAGE_REASONS: readonly (readonly [start: string, reason: string])[] = [
  ["A stateful action is assigned to a named agent", STATEFUL_NEEDS_AGENT],
  ["A stateful action is bound to one agent", "A step of this runs on a specific device. Choose which one."],
];

const NO_REASON = "Rekuest refused the task without saying why.";

const codeOf = (error: unknown): string | null => {
  const entries = (error as { graphQLErrors?: { extensions?: { code?: unknown } }[] } | null)?.graphQLErrors ?? [];
  const code = entries.find((entry) => typeof entry.extensions?.code === "string")?.extensions?.code;
  return typeof code === "string" ? code : null;
};

/** The failure of an assign-like mutation as an `AssignError`. Idempotent. */
export const toAssignError = (error: unknown): AssignError => {
  if (error instanceof AssignError) return error;

  const classified = classifyError(error);
  const code = codeOf(error);
  const details = { kind: classified.kind, code, technical: classified.technical, cause: error };

  if (code && CODE_REASONS[code]) return new AssignError(CODE_REASONS[code], details);
  if (classified.kind === "network") return new AssignError("Rekuest could not be reached.", details);
  if (classified.kind === "unauthenticated") return new AssignError("Your session ran out. Sign in again to run this.", details);
  if (classified.kind === "denied") return new AssignError("You are not allowed to run this.", details);

  // The server's own words: the first message, without the client's wrapping.
  const first = classified.message.split("\n")[0]?.trim();
  const worded = MESSAGE_REASONS.find(([start]) => first?.startsWith(start));
  if (worded) return new AssignError(worded[1], details);
  return new AssignError(!error || !first || first === "Unknown error" ? NO_REASON : first, details);
};

/**
 * The refusal of a stateful action that names no agent, for a place that knows it before
 * asking and has nowhere to let the user choose: the sentence the server's own would get.
 */
export const statefulNeedsAgentError = () =>
  new AssignError(STATEFUL_NEEDS_AGENT, {
    kind: "unknown",
    code: null,
    technical: "Not sent: a stateful action is assigned to a named agent, and none or several could take it.",
  });

/** The sentence to show for anything an assign threw. */
export const assignErrorMessage = (error: unknown): string =>
  error instanceof AssignError
    ? error.message
    : error instanceof Error && error.message
      ? error.message
      : typeof error === "string" && error
        ? error
        : NO_REASON;

/**
 * The toast for a refused assign, for call sites with nowhere to show it
 * inline. One `id` per site: a repeat replaces the toast instead of stacking.
 */
export const notifyAssignError = (error: unknown, options: { id: string; title?: string }) => {
  reportError(toAssignError(error), { title: options.title ?? "Couldn't run the task", id: options.id });
};
