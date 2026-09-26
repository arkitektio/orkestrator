import { useDialog } from "@/core/dialogs/registry";
import { PageAction } from "@/core/ui/page-action";
import { PenSquare } from "lucide-react";
import { FolderRole, useMailboxTreeQuery } from "../api/graphql";
import { MailList } from "../components/list/MailList";
import { AddMailboxButton } from "../components/lists/MailAccountList";
import { MailSplit } from "../components/split/MailSplit";
import { MailMessage } from "../linkers";
import { SmartMailbox } from "../smartMailboxes";

/** A mailbox across every account (All Inboxes, Unread, Flagged, Sent), conversations collapsed. */
const SmartMailboxPage = ({ mailbox }: { mailbox: SmartMailbox }) => {
  const { openSheet } = useDialog();
  const { data } = useMailboxTreeQuery();
  const accounts = data?.mailAccounts;
  const unread =
    mailbox.key === "inbox"
      ? accounts?.flatMap((a) => a.folders).filter((f) => f.role === FolderRole.Inbox).reduce((n, f) => n + f.unreadCount, 0)
      : undefined;

  return (
    <MailMessage.ListPage
      title={mailbox.label}
      pageActions={
        <PageAction
          size="sm"
          collapse="icon"
          icon={<PenSquare className="h-4 w-4" />}
          onClick={() => openSheet("kuvertcompose", {}, { size: "large" })}
        >
          New mail
        </PageAction>
      }
    >
      <MailSplit
        list={
          <MailList
            key={mailbox.key}
            title={mailbox.label}
            subtitle={unread ? `${unread} unread` : undefined}
            source={mailbox.source}
            empty={
              accounts?.length === 0
                ? { title: "No mailboxes", description: "Add a mailbox to read and send its mail here.", action: <AddMailboxButton /> }
                : mailbox.empty
            }
          />
        }
      />
    </MailMessage.ListPage>
  );
};

export default SmartMailboxPage;
