import { toast } from "@/core/notify";
import type { ApolloClient } from "@apollo/client";
import {
  DeleteMessagesDocument,
  GetMailAccountDocument,
  FolderRole,
  ListMailFoldersDocument,
  ListMailFoldersQuery,
  ListMessagesDocument,
  ListMailChangesDocument,
  ListMessagesQuery,
  ListThreadsDocument,
  MailboxTreeDocument,
  MarkMessagesReadDocument,
  MoveMessagesDocument,
  PushMailChangesDocument,
  RetryMailChangesDocument,
  RevertMessagesToServerDocument,
  SetMessageFlagsDocument,
  ThreadMessageIdsDocument,
  ThreadMessageIdsQuery,
  UndoMailChangesDocument,
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

/** After a change to the queue: mail views plus the queue and the mailbox's counts. */
const CHANGE_VIEWS = [...MAIL_VIEWS, ListMailChangesDocument, GetMailAccountDocument];

/** Take back changes that have not reached the server: every one of these messages, or these changes. */
export const undoChanges = (client: Client, input: { messages?: string[]; changes?: string[] }) =>
  run(() =>
    client.mutate({
      mutation: UndoMailChangesDocument,
      variables: { input: { messages: input.messages ?? null, changes: input.changes ?? null } },
      refetchQueries: CHANGE_VIEWS,
    }),
  );

/** Queue failed changes again. */
export const retryChanges = (client: Client, changes: string[]) =>
  run(() =>
    client.mutate({
      mutation: RetryMailChangesDocument,
      variables: { changes },
      refetchQueries: CHANGE_VIEWS,
    }),
  );

/** Drop the local-only and queued flag changes of messages: back to what the server has. */
export const revertToServer = (client: Client, messages: string[]) =>
  run(() =>
    client.mutate({
      mutation: RevertMessagesToServerDocument,
      variables: { messages },
      refetchQueries: CHANGE_VIEWS,
    }),
  );

/** Push a mailbox's due changes now; the result as a sentence. */
export const pushChanges = async (client: Client, account: string) => {
  const result = await run(() =>
    client.mutate({
      mutation: PushMailChangesDocument,
      variables: { account },
      refetchQueries: CHANGE_VIEWS,
    }),
  );
  const r = result.data?.pushMailChanges;
  if (!r) return "Pushed";
  const parts = [`${r.pushed} pushed`];
  if (r.failed) parts.push(`${r.failed} failed`);
  if (r.pending) parts.push(`${r.pending} still waiting`);
  return parts.join(", ");
};

/**
 * Confirm a change to mail with a toast that can take it back (`undoMailChanges`
 * over those messages) while it is still in its undo window.
 */
export const undoToast = (client: Client, messages: string[], text: string) => {
  toast.success(text, {
    action: {
      label: "Undo",
      onClick: () => {
        undoChanges(client, { messages })
          .then(() => toast.success("Undone"))
          .catch((e: Error) => toast.error(e.message));
      },
    },
  });
};
