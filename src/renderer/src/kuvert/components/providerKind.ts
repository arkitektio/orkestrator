import { KeyRound, Server } from "lucide-react";
import { Provider } from "../api/graphql";

/** The icon of a provider kind: a server for IMAP, a key for a Gmail or Microsoft OAuth client. */
export const providerIcon = (kind: Provider) => (kind === Provider.Generic ? Server : KeyRound);

/** Whose sign-in page an OAuth provider sends the user to. */
export const SIGN_IN_WITH: Record<Provider, string> = {
  [Provider.Gmail]: "Google",
  [Provider.Microsoft]: "Microsoft",
  [Provider.Generic]: "the provider",
};

/** What an IMAP provider's servers are, in a few words: its fixed host, or open to any. */
export const serversOf = (server: { fixed: boolean; incoming?: { host: string } | null } | null | undefined) =>
  server ? (server.fixed && server.incoming ? server.incoming.host : "Any server") : null;
