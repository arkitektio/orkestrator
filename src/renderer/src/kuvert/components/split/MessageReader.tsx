import { Button } from "@/core/ui/button";
import { MessagesSquare } from "lucide-react";
import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { MailboxTreeDocument, useGetMessageQuery, useMarkMessagesReadMutation } from "../../api/graphql";
import { MailMessage, MailThread } from "../../linkers";
import { MessageView } from "../MessageView";
import { InlineReply } from "./InlineReply";
import { MailToolbar } from "./MailToolbar";
import { useMailSelection } from "./selection";
import { ReaderCanvas, ReaderState } from "./ThreadReader";

/** The reading pane for one mail (a search hit), with the way into its conversation. */
export const MessageReader = ({ id }: { id: string }) => {
  const { data, loading } = useGetMessageQuery({ variables: { id } });
  const { select } = useMailSelection();
  const message = data?.message;

  const [markRead] = useMarkMessagesReadMutation({ refetchQueries: [MailboxTreeDocument] });
  const marked = useRef(false);
  useEffect(() => {
    if (!message || message.isRead || marked.current) return;
    marked.current = true;
    void markRead({ variables: { input: { messages: [message.id], read: true } } });
  }, [message?.id]);

  if (!message) return <ReaderState loading={loading} what="mail" />;

  return (
    <ReaderCanvas
      title={message.subject}
      meta={
        <>
          {message.folder.name} · {message.account.emailAddress}
          {message.thread && message.thread.messageCount > 1 && (
            <Button variant="link" size="xs" className="ml-1 h-auto p-0 text-xs" asChild>
              <Link to={MailThread.linkBuilder(message.thread.id)}>
                <MessagesSquare />
                Whole conversation ({message.thread.messageCount})
              </Link>
            </Button>
          )}
        </>
      }
      toolbar={
        <MailToolbar
          mail={[message]}
          newest={message}
          account={message.account.id}
          canSend={message.account.canSend}
          page={MailMessage.linkBuilder(message.id)}
          menu={<MailMessage.ObjectButton object={message} />}
          onGone={() => select(null)}
        />
      }
    >
      <MessageView message={message} />
      {message.account.canSend && <InlineReply key={message.id} message={message} />}
    </ReaderCanvas>
  );
};
