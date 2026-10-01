import { asDetailQueryRoute } from "@/core/layout/routes/DetailQueryRoute";
import { Sidebars } from "@/core/layout/Sidebars";
import { Button } from "@/core/ui/button";
import { MessagesSquare } from "lucide-react";
import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { MailboxTreeDocument, useGetMessageQuery, useMarkMessagesReadMutation } from "../api/graphql";
import { InfoList } from "../components/InfoList";
import { MessageView } from "../components/MessageView";
import { formatBytes, formatMailDateTime } from "../format";
import { KUVERT_HELP } from "../help";
import { MailAccount, MailFolder, MailMessage, MailThread } from "../linkers";

/** One mail on its own (from search, a link elsewhere), with the way into its conversation. */
const MessagePage = asDetailQueryRoute(useGetMessageQuery, ({ data }) => {
  const message = data.message;

  const [markRead] = useMarkMessagesReadMutation({ refetchQueries: [MailboxTreeDocument] });
  const marked = useRef<string | null>(null);
  useEffect(() => {
    if (marked.current === message.id || message.isRead) return;
    marked.current = message.id;
    void markRead({ variables: { input: { messages: [message.id], read: true } } });
  }, [message.id]);

  return (
    <MailMessage.ModelPage
      title={message.subject || "(no subject)"}
      object={message}
      help={KUVERT_HELP.message}
      pageActions={
        message.thread && (
          <Button size="sm" variant="ghost" asChild>
            <Link to={MailThread.linkBuilder(message.thread.id)}>
              <MessagesSquare className="mr-1.5 h-4 w-4" />
              Conversation
            </Link>
          </Button>
        )
      }
      additionalSidebars={
        <Sidebars.Tab label="Info">
          <InfoList
            rows={[
              [
                "Mailbox",
                <MailAccount.DetailLink object={message.account}>{message.account.emailAddress}</MailAccount.DetailLink>,
              ],
              ["Folder", <MailFolder.DetailLink object={message.folder}>{message.folder.name}</MailFolder.DetailLink>],
              ["Received", formatMailDateTime(message.receivedAt)],
              ["Size", formatBytes(message.size)],
              ["Message-ID", message.messageId && <span className="font-mono text-xs">{message.messageId}</span>],
              ["Flags", message.flags.join(" ")],
            ]}
          />
        </Sidebars.Tab>
      }
    >
      <div className="-m-3 min-h-full bg-muted/40">
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-3 p-4">
          <MessageView message={message} showSubject />
        </div>
      </div>
    </MailMessage.ModelPage>
  );
});

export default MessagePage;
