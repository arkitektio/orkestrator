import { describeError as describeAny, isAbort, reportError, type DescribedError } from "@/core/notify";
import { MailErrorCode } from "./api/graphql";

/** What the user can do about an error: the one button the UI offers. */
export type MailFix = "relink" | "password" | "servers" | "later" | "enable" | "restart" | "none";

const CODES = new Set<string>(Object.values(MailErrorCode));

/** The mail error code of a GraphQL failure (`extensions.code`), if it has one. */
export const errorCodeOf = (error: unknown): MailErrorCode | null => {
  const e = error as { graphQLErrors?: { extensions?: { code?: unknown } }[]; extensions?: { code?: unknown } };
  const code = e?.graphQLErrors?.find((g) => g.extensions?.code)?.extensions?.code ?? e?.extensions?.code;
  return typeof code === "string" && CODES.has(code) ? (code as MailErrorCode) : null;
};

export const errorMessageOf = (error: unknown) =>
  error instanceof Error ? error.message : typeof error === "string" ? error : "Something went wrong";

/** A code as a sentence and a fix. */
export const describeError = (
  code: MailErrorCode | null | undefined,
  { message }: { message?: string | null } = {},
): { text: string; fix: MailFix } => {
  switch (code) {
    case MailErrorCode.AuthFailed:
      return { text: "The server refused the username or password.", fix: "password" };
    case MailErrorCode.ConsentExpired:
      return { text: "The sign-in ran out or was revoked. Link the mailbox again; its mail is kept.", fix: "relink" };
    case MailErrorCode.ConnectionFailed:
      return { text: "The mail server could not be reached.", fix: "later" };
    case MailErrorCode.TlsFailed:
      return { text: "The secure connection to the server failed. Check the server and port.", fix: "servers" };
    case MailErrorCode.TlsRequired:
      return { text: "This server asks for an unencrypted connection, which is not allowed.", fix: "servers" };
    case MailErrorCode.HostNotAllowed:
      return { text: "That server address points into a private network, which is not allowed.", fix: "servers" };
    case MailErrorCode.SyncInProgress:
      return { text: "A sync is already running for this mailbox.", fix: "none" };
    case MailErrorCode.RateLimited:
      return { text: "Synced too recently. Try again in a moment.", fix: "later" };
    case MailErrorCode.ServerError:
      return { text: message || "The mail server answered with an error.", fix: "later" };
    case MailErrorCode.SendRejected:
      return { text: message || "The outgoing server refused the message.", fix: "none" };
    case MailErrorCode.UnsupportedByProtocol:
      return { text: "A POP3 mailbox cannot do this: folders and flags only exist on IMAP.", fix: "none" };
    case MailErrorCode.MailboxInactive:
      return { text: "The mailbox is paused or needs new credentials.", fix: "enable" };
    case MailErrorCode.InvalidState:
      return { text: "This sign-in can no longer be finished. Start over.", fix: "restart" };
    case MailErrorCode.CodeExpired:
      return { text: "The sign-in was not finished in time. Start over.", fix: "restart" };
    case MailErrorCode.ProviderError:
      return { text: message || "The sign-in provider answered with an error.", fix: "restart" };
    case MailErrorCode.UnsupportedByPolicy:
      return { text: "This mailbox is set not to change that on the server. See its sync settings.", fix: "none" };
    case MailErrorCode.KeywordsNotPermitted:
      return { text: "The folder does not keep categories on the server; the category stays here.", fix: "none" };
    case MailErrorCode.MessageGone:
      return { text: "The mail is no longer where the change expected it on the server.", fix: "none" };
    case MailErrorCode.UnsafeExpunge:
      return {
        text: "The server cannot delete just this mail for good without also removing other deleted mail in its folder.",
        fix: "none",
      };
    case MailErrorCode.NotConfigured:
      return { text: "Your organization has not set this up (no usable mail provider). Ask an admin.", fix: "none" };
    default:
      return { text: message || "Something went wrong.", fix: "none" };
  }
};

/** A failed request as a toast line. */
export const toastText = (error: unknown) => describeError(errorCodeOf(error), { message: errorMessageOf(error) }).text;

/**
 * A failure in the table's words where it has a mail code, else the host's
 * reading; the raw text stays behind "Copy details" either way.
 */
export const describeKuvertError = (error: unknown): DescribedError => {
  const described = describeAny(error);
  const code = errorCodeOf(error);
  if (!code) return described;
  return { ...described, message: describeError(code, { message: described.message }).text };
};

/** One island error toast for a failure outside a dialog: `reportKuvertError(e, "Couldn't sync the mailbox")`. */
export const reportKuvertError = (error: unknown, title: string) =>
  reportError(error, { title, describe: describeKuvertError });

/** `reportKuvertError` for a `.catch`. */
export const reportKuvertErrorAs = (title: string) => (error: unknown) => {
  reportKuvertError(error, title);
};

/**
 * The failure rethrown in the table's words, carrying its raw text: for a
 * dialog submit (shown inline) or a local action (shown by its island), both
 * of which read an Error with a `technical` string as it is.
 */
export const asKuvertError = (error: unknown): unknown => {
  if (isAbort(error)) return error;
  const { kind, message, technical } = describeKuvertError(error);
  return Object.assign(new Error(message), { kind, technical });
};

/**
 * A failure the server answered with as data (an outgoing mail whose status
 * is failed), not as a GraphQL error: an Error in the table's words, for the
 * same places `asKuvertError` serves.
 */
export const codedError = (
  code: MailErrorCode | null | undefined,
  message: string | null | undefined,
  fallback = "Something went wrong.",
) => {
  const text = code || message ? describeError(code, { message }).text : fallback;
  return Object.assign(new Error(text), { technical: [code, message].filter(Boolean).join(": ") });
};

/** `work`, its failure rethrown with `asKuvertError`: `useDialogSubmit(() => inKuvertWords(create(…)))`. */
export const inKuvertWords = <T>(work: Promise<T>): Promise<T> =>
  work.catch((e: unknown) => {
    throw asKuvertError(e);
  });
