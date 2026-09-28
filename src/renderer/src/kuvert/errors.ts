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
      return { text: "This is not set up on the server. Ask an admin.", fix: "none" };
    default:
      return { text: message || "Something went wrong.", fix: "none" };
  }
};

/** A failed request as a toast line. */
export const toastText = (error: unknown) => describeError(errorCodeOf(error), { message: errorMessageOf(error) }).text;
