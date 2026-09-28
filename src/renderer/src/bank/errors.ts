import { BankErrorCode } from "./api/graphql";
import { formatDay } from "./format";

/** What the user can do about an error: the one button the UI offers. */
export type BankFix = "relink" | "login" | "restart" | "later" | "wait" | "none";

const CODES = new Set<string>(Object.values(BankErrorCode));

/** The bank error code of a GraphQL failure (`extensions.code`), if it has one. */
export const errorCodeOf = (error: unknown): BankErrorCode | null => {
  const e = error as { graphQLErrors?: { extensions?: { code?: unknown } }[]; extensions?: { code?: unknown } };
  const code = e?.graphQLErrors?.find((g) => g.extensions?.code)?.extensions?.code ?? e?.extensions?.code;
  return typeof code === "string" && CODES.has(code) ? (code as BankErrorCode) : null;
};

export const errorMessageOf = (error: unknown) =>
  error instanceof Error ? error.message : typeof error === "string" ? error : "Something went wrong";

const time = (iso: string) => {
  const date = new Date(iso);
  const today = new Date();
  return date.toDateString() === today.toDateString()
    ? date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })
    : `${formatDay(iso)} ${date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}`;
};

/**
 * A code as a sentence and a fix. `nextSyncAllowedAt` turns RATE_LIMITED into
 * "try again at 14:00".
 */
export const describeError = (
  code: BankErrorCode | null | undefined,
  { message, nextSyncAllowedAt }: { message?: string | null; nextSyncAllowedAt?: string | null } = {},
): { text: string; fix: BankFix } => {
  switch (code) {
    case BankErrorCode.ConsentExpired:
      return { text: "The bank consent ran out. Relink to keep syncing; the history is kept.", fix: "relink" };
    case BankErrorCode.ConnectionInactive:
      return { text: "This connection is not active. Relink it to sync again.", fix: "relink" };
    case BankErrorCode.RateLimited:
      return {
        text: nextSyncAllowedAt
          ? `The bank's sync limit is reached. Try again at ${time(nextSyncAllowedAt)}.`
          : "The bank's sync limit is reached. Try again later.",
        fix: "wait",
      };
    case BankErrorCode.MfaRejected:
      return { text: "The login was not confirmed on your phone.", fix: "login" };
    case BankErrorCode.CodeExpired:
      return { text: "The login code ran out before it was approved.", fix: "login" };
    case BankErrorCode.InvalidState:
      return { text: "This login can no longer be finished. Start over.", fix: "restart" };
    case BankErrorCode.BankUnavailable:
      return { text: "The bank is not answering right now. Try again later.", fix: "later" };
    case BankErrorCode.BankError:
      return { text: message || "The bank returned an error.", fix: "later" };
    case BankErrorCode.SyncInProgress:
      return { text: "A sync is already running for this account.", fix: "none" };
    case BankErrorCode.NotConfigured:
      return { text: "This provider is not set up on the server. Ask an admin.", fix: "none" };
    default:
      return { text: message || "Something went wrong.", fix: "none" };
  }
};

/** A failed request as a toast line. */
export const toastText = (error: unknown, context?: { nextSyncAllowedAt?: string | null }) =>
  describeError(errorCodeOf(error), { message: errorMessageOf(error), ...context }).text;
