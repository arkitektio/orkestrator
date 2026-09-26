import { useDialog } from "@/core/dialogs/registry";
import { Button } from "@/core/ui/button";
import { Kbd } from "@/core/ui/kbd";
import { Spinner } from "@/core/ui/spinner";
import { Textarea } from "@/core/ui/textarea";
import { useState } from "react";
import { toast } from "sonner";
import { ListOutboxDocument, MessageFragment, OutgoingStatus, useSendMessageMutation } from "../../api/graphql";
import { toastText } from "../../errors";
import { addressLabel, quoteForReply, replyRecipients, replySubject } from "../../format";

/**
 * The quick answer under a conversation, as in shadcn's mail example: type,
 * ⌘/Ctrl+Enter, sent (the original quoted below). Anything more — Cc,
 * attachments — continues in the full editor with the text kept.
 */
export const InlineReply = ({ message }: { message: MessageFragment }) => {
  const [text, setText] = useState("");
  const { openSheet } = useDialog();
  const [send, { loading }] = useSendMessageMutation({ refetchQueries: [ListOutboxDocument] });
  const { to } = replyRecipients(message, message.account.emailAddress, false);

  const submit = () =>
    send({
      variables: {
        input: {
          account: message.account.id,
          to,
          subject: replySubject(message.subject),
          text: text + quoteForReply(message),
          inReplyTo: message.id,
        },
      },
    })
      .then((r) => {
        const sent = r.data?.sendMessage;
        if (sent?.status === OutgoingStatus.Failed) {
          toast.error(sent.error || "The reply could not be sent");
          return;
        }
        toast.success("Reply sent");
        setText("");
      })
      .catch((e) => toast.error(toastText(e)));

  const ready = text.trim().length > 0 && to.length > 0 && !loading;

  return (
    <form
      className="overflow-hidden rounded-xl border bg-card shadow-sm focus-within:ring-2 focus-within:ring-ring/30"
      onSubmit={(e) => {
        e.preventDefault();
        if (ready) void submit();
      }}
    >
      <div className="grid">
        <Textarea
          className="min-h-24 resize-none rounded-none border-0 bg-transparent p-4 shadow-none focus-visible:ring-0 dark:bg-transparent"
          placeholder={`Reply ${to.map(addressLabel).join(", ")}…`}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && ready) {
              e.preventDefault();
              void submit();
            }
          }}
        />
        <div className="flex items-center px-3 pb-3">
          <Button
            type="button"
            variant="link"
            size="sm"
            className="px-0 text-xs text-muted-foreground"
            onClick={() => openSheet("kuvertcompose", { replyTo: message.id, mode: "reply", body: text }, { size: "large" })}
          >
            Open in the editor
          </Button>
          <Button type="submit" size="sm" className="ml-auto gap-2" disabled={!ready}>
            {loading && <Spinner />}
            Send
            <Kbd className="bg-primary-foreground/15 text-primary-foreground">⌘↵</Kbd>
          </Button>
        </div>
      </div>
    </form>
  );
};
