import { toast } from "@/core/notify";
import type { ApolloCache, ApolloClient, ObservableQuery } from "@apollo/client";
import {
  DeleteMessagesDocument,
  GetCategoryDocument,
  GetMailAccountDocument,
  ListCategoriesDocument,
  FolderRole,
  ListMessagesDocument,
  ListMailChangesDocument,
  ListMailAccountsDocument,
  ListThreadsDocument,
  MailboxTreeDocument,
  MarkMessagesReadDocument,
  MarkMessagesReadMutation,
  MessageStateFragment,
  MoveMessagesDocument,
  PushAllMailChangesDocument,
  RetryMailChangesDocument,
  RevertMessagesToServerDocument,
  SetMessageFlagsDocument,
  ThreadsMessageIdsDocument,
  ThreadsMessageIdsQuery,
  UndoMailChangesDocument,
} from "./api/graphql";
import { asKuvertError, reportKuvertError } from "./errors";

/**
 * What one does to mail, on a client: the local actions (menu, ObjectButton)
 * and the reading pane's toolbar both go through these, so they behave the
 * same. Failures come back reworded from the error code.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Client = ApolloClient<any>;

/**
 * After categorizing: the categories' counts, and only the conversation lists
 * that filter by a category. Every other row shows the mail's categories
 * through the `Message` the mutation answers with.
 */
export const CATEGORIZE_VIEWS = {
  refetchQueries: [ListCategoriesDocument, GetCategoryDocument, ListThreadsDocument],
  onQueryUpdated: (query: ObservableQuery) =>
    query.queryName !== "ListThreads" || !!(query.variables as { filters?: { category?: string | null } } | undefined)?.filters?.category,
};

/** What mail lists and counts show; refetched (when mounted) after a change to mail. */
export const MAIL_VIEWS = [ListThreadsDocument, ListMessagesDocument, MailboxTreeDocument];

const run = async <T>(work: () => Promise<T>) => {
  try {
    return await work();
  } catch (e) {
    throw asKuvertError(e);
  }
};

/**
 * Conversations whose mail is all read now: a list row shows a conversation's
 * unread dot from `Thread.unreadCount(folder:, folderRole:)`, one cache entry
 * per folder it is listed in, which a mutation answering with messages does
 * not touch. Every one of them is 0 once `thread.unread` is false.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const markThreadsReadInCache = (cache: ApolloCache<any>, messages: readonly Pick<MessageStateFragment, "thread">[]) => {
  const read = new Set(messages.flatMap((m) => (m.thread && !m.thread.unread ? [m.thread.id] : [])));
  for (const id of read) {
    cache.modify({ id: cache.identify({ __typename: "Thread", id }), fields: { unreadCount: () => 0 } });
  }
};

/** `update` of a `markMessagesRead`: see `markThreadsReadInCache`. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const updateReadThreads = (cache: ApolloCache<any>, result: { data?: MarkMessagesReadMutation | null }) =>
  markThreadsReadInCache(cache, result.data?.markMessagesRead ?? []);

export const markRead = (client: Client, messages: string[], read: boolean) =>
  run(() =>
    client.mutate({
      mutation: MarkMessagesReadDocument,
      variables: { input: { messages, read } },
      update: updateReadThreads,
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

/**
 * Move mail to its own mailbox's folder of `role` (Archive, Junk, …): the
 * server finds each mailbox's folder, and refuses a mailbox without one.
 */
export const moveToRole = (client: Client, messages: string[], role: FolderRole) =>
  run(() =>
    client.mutate({
      mutation: MoveMessagesDocument,
      variables: { input: { messages, role } },
      refetchQueries: MAIL_VIEWS,
    }),
  );

/** Every message of the given conversations, in one request: conversation actions act on those. */
export const threadMessages = async (client: Client, threads: string[]) => {
  const { data } = await client.query<ThreadsMessageIdsQuery>({
    query: ThreadsMessageIdsDocument,
    variables: { threads },
    // A lookup for one action: always the server's answer, nothing kept.
    fetchPolicy: "no-cache",
  });
  return data.messages.map((m) => m.id);
};

/** After a change to the queue: mail views plus the queue and the mailbox's counts. */
// The mailbox list carries each mailbox's pending and failed counts.
const CHANGE_VIEWS = [...MAIL_VIEWS, ListMailChangesDocument, GetMailAccountDocument, ListMailAccountsDocument];

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
/** Queue failed changes again: these `changes`, and every failed change of `account`. */
export const retryChanges = (client: Client, target: { changes?: string[]; account?: string }) =>
  run(() =>
    client.mutate({
      mutation: RetryMailChangesDocument,
      variables: { changes: target.changes ?? null, account: target.account ?? null },
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

/** Push the due changes of one or more mailboxes now; the result, summed, as one sentence. */
/**
 * Push the due changes of these mailboxes now, in one call; `null` pushes every
 * visible mailbox with pending changes. Answers with one summary of them all.
 */
export const pushChanges = async (client: Client, accounts: string | string[] | null) => {
  const result = await run(() =>
    client.mutate({
      mutation: PushAllMailChangesDocument,
      variables: { accounts: typeof accounts === "string" ? [accounts] : accounts },
      refetchQueries: CHANGE_VIEWS,
    }),
  );
  const total = { pushed: 0, failed: 0, pending: 0 };
  for (const r of result.data?.pushAllMailChanges ?? []) {
    total.pushed += r.pushed;
    total.failed += r.failed;
    total.pending += r.pending;
  }
  const parts = [`${total.pushed} pushed`];
  if (total.failed) parts.push(`${total.failed} failed`);
  if (total.pending) parts.push(`${total.pending} still waiting`);
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
        // The mail lists refetch: the mail back where it was says it worked.
        undoChanges(client, { messages }).catch((e) => reportKuvertError(e, "Couldn't undo the change"));
      },
    },
  });
};
