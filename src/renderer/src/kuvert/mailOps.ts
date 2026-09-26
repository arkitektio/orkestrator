import type { ApolloClient } from "@apollo/client";
import {
  DeleteMessagesDocument,
  FolderRole,
  ListMailFoldersDocument,
  ListMailFoldersQuery,
  ListMessagesDocument,
  ListMessagesQuery,
  ListThreadsDocument,
  MailboxTreeDocument,
  MarkMessagesReadDocument,
  MoveMessagesDocument,
  SetMessageFlagsDocument,
  ThreadMessageIdsDocument,
  ThreadMessageIdsQuery,
} from "./api/graphql";
import { toastText } from "./errors";

/**
 * What one does to mail, on a client: the local actions (menu, ObjectButton)
 * and the reading pane's toolbar both go through these, so they behave the
 * same. Failures come back reworded from the error code.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Client = ApolloClient<any>;

/** What mail lists and counts show; refetched (when mounted) after a change to mail. */
export const MAIL_VIEWS = [ListThreadsDocument, ListMessagesDocument, MailboxTreeDocument];

const run = async <T>(work: () => Promise<T>) => {
  try {
    return await work();
  } catch (e) {
    throw new Error(toastText(e));
  }
};

export const markRead = (client: Client, messages: string[], read: boolean) =>
  run(() =>
    client.mutate({
      mutation: MarkMessagesReadDocument,
      variables: { input: { messages, read } },
      refetchQueries: MAIL_VIEWS,
    }),
  );

export const setFlagged = (client: Client, messages: string[], flagged: boolean) =>
  run(() =>
    client.mutate({
      mutation: SetMessageFlagsDocument,
      variables: { input: { messages, add: flagged ? ["\\Flagged"] : [], remove: flagged ? [] : ["\\Flagged"] } },
    }),
  );

export const moveTo = (client: Client, messages: string[], folder: string) =>
  run(() =>
    client.mutate({
      mutation: MoveMessagesDocument,
      variables: { input: { messages, folder } },
      refetchQueries: MAIL_VIEWS,
    }),
  );

/** Into Trash, or (`permanent`) off the server for good. */
export const deleteMail = (client: Client, messages: string[], permanent: boolean) =>
  run(() =>
    client.mutate({
      mutation: DeleteMessagesDocument,
      variables: { input: { messages, permanent } },
      refetchQueries: MAIL_VIEWS,
    }),
  );

/** Move mail to its own mailbox's folder of `role` (Archive, Junk, …), per mailbox. */
export const moveToRole = async (client: Client, messages: string[], role: FolderRole, label: string) => {
  const { data } = await client.query<ListMessagesQuery>({
    query: ListMessagesDocument,
    variables: { filters: { ids: messages }, pagination: { limit: messages.length } },
    fetchPolicy: "network-only",
  });
  const byAccount = new Map<string, { email: string; ids: string[] }>();
  for (const m of data.messages) {
    const entry = byAccount.get(m.account.id) ?? { email: m.account.emailAddress, ids: [] };
    entry.ids.push(m.id);
    byAccount.set(m.account.id, entry);
  }
  for (const [account, { email, ids }] of byAccount) {
    const folders = await client.query<ListMailFoldersQuery>({
      query: ListMailFoldersDocument,
      variables: { filters: { account, role } },
    });
    const target = folders.data.mailFolders[0];
    if (!target) throw new Error(`${email} has no ${label} folder`);
    await moveTo(client, ids, target.id);
  }
};

/** Every message of the given conversations: conversation actions act on those. */
export const threadMessages = async (client: Client, threads: string[]) => {
  const results = await Promise.all(
    threads.map((id) =>
      client.query<ThreadMessageIdsQuery>({ query: ThreadMessageIdsDocument, variables: { id }, fetchPolicy: "network-only" }),
    ),
  );
  return results.flatMap((r) => r.data.thread.messages.map((m) => m.id));
};
