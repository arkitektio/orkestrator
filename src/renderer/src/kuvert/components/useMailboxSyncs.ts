import { useKuvert } from "../api/funcs";
import {
  GetMailAccountDocument,
  GetMailFolderDocument,
  ListMailChangesDocument,
  ListMessagesDocument,
  ListThreadsDocument,
  MailboxTreeDocument,
  useMailboxSyncsSubscription,
} from "../api/graphql";

/**
 * Pull new mail in when a mailbox finishes syncing: whatever mail lists,
 * mailbox and folder pages are mounted refetch (only active queries do). One
 * subscription for the whole module, mounted by its shell.
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
      });
    },
  });
};

/** Mounts the sync subscription; renders nothing. */
export const MailboxSyncs = () => {
  useMailboxSyncs();
  return null;
};
