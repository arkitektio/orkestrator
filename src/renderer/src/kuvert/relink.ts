import { Provider } from "./api/graphql";

export type RelinkTarget = {
  id: string;
  provider: Provider;
  emailAddress: string;
  mailProvider?: { id: string } | null;
};

/**
 * What the link dialog opens on to sign an OAuth mailbox in again: its own
 * provider, or one of its kind when the organization removed that one.
 */
export const relinkProps = (account: RelinkTarget) => ({
  relink: account.id,
  provider: account.mailProvider?.id,
  kind: account.provider,
  address: account.emailAddress,
});
