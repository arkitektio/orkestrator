import { useKuvert } from "../api/funcs";
import {
  GetMailAccountDocument,
  GetMailFolderDocument,
  ListMailChangesDocument,
  ListMessagesDocument,
  ListThreadsDocument,
  MailboxSyncsSubscription,
  MailboxTreeDocument,
  useMailboxSyncsSubscription,
} from "../api/graphql";

type SyncEvent = Pick<MailboxSyncsSubscription["mailboxSyncs"], "accountId" | "folders">;

type ListVariables =
  | {
      id?: string | null;
      filters?: { account?: string | null; folder?: string | null } | null;
      inFolder?: string | null;
    }
  | undefined;

/**
 * Whether a mounted query shows what a sync of one mailbox changed: the
 * event names the mailbox and the folders whose messages changed. A list
 * scoped to another folder or mailbox stays as it is; one across mailboxes
 * (All Inboxes, Unread, a search) cannot tell and is read again.
 */
export const syncTouches = (event: SyncEvent, queryName: string | undefined, variables: ListVariables): boolean => {
  const folders = new Set(event.folders);
  switch (queryName) {
    case "GetMailAccount":
      return variables?.id === event.accountId;
    case "GetMailFolder":
      return !!variables?.id && folders.has(variables.id);
    case "ListThreads":
    case "ListMessages": {
      const folder = variables?.filters?.folder ?? variables?.inFolder;
      if (folder) return folders.has(folder);
      const account = variables?.filters?.account;
      return !account || account === event.accountId;
    }
    case "ListMailChanges": {
      const account = variables?.filters?.account;
      return !account || account === event.accountId;
    }
    default:
      // The mailbox tree: every mailbox's counts.
      return true;
  }
};

/**
 * Pull new mail in when a mailbox finishes syncing: the mounted mail lists,
 * mailbox and folder pages that show what changed refetch (only active
 * queries do). One subscription for the whole module, mounted by its shell.
 */
export const useMailboxSyncs = () => {
  const client = useKuvert();
  useMailboxSyncsSubscription({
    onData: ({ data: event }) => {
      const sync = event.data?.mailboxSyncs;
      if (!sync || sync.created + sync.updated + sync.deleted === 0) return;
      void client.refetchQueries({
        include: [
          ListThreadsDocument,
          ListMessagesDocument,
          MailboxTreeDocument,
          GetMailAccountDocument,
          GetMailFolderDocument,
          // A sync also pushes what was queued here.
          ListMailChangesDocument,
        ],
        onQueryUpdated: (query) => syncTouches(sync, query.queryName, query.variables as ListVariables),
      });
    },
  });
};

/** Mounts the sync subscription; renders nothing. */
export const MailboxSyncs = () => {
  useMailboxSyncs();
  return null;
};
