import { useDialog } from "@/core/dialogs/registry";
import { Button } from "@/core/ui/button";
import { Kbd } from "@/core/ui/kbd";
import { Spinner } from "@/core/ui/spinner";
import { useState } from "react";
import { toast } from "@/core/notify";
import { ListOutboxDocument, MessageFragment, OutgoingStatus, useSendMessageMutation } from "../../api/graphql";
import { toastText } from "../../errors";
import { fromText, isEmpty, MailNode, toMailHtml, toText } from "../../editor/serialize";
import { addressLabel, quoteForReply, replyRecipients, replySubject } from "../../format";
import { MailContent, MailEditor, MailToolbar, useMailEditor } from "../editor/MailEditor";

/**
 * The quick answer under a conversation, as in shadcn's mail example: write
 * (with formatting), ⌘/Ctrl+Enter, sent as HTML and text with the original
 * quoted below. Anything more — Cc, attachments — continues in the full
 * editor with the formatting kept.
 */
export const InlineReply = ({ message }: { message: MessageFragment }) => {
  const editor = useMailEditor();
  const [empty, setEmpty] = useState(true);
  const { openSheet } = useDialog();
  const [send, { loading }] = useSendMessageMutation({ refetchQueries: [ListOutboxDocument] });
  const { to } = replyRecipients(message, message.account.emailAddress, false);

  const submit = () => {
    const doc = [...(editor.children as MailNode[]), ...fromText(quoteForReply(message))];
    return send({
      variables: {
        input: {
          account: message.account.id,
          to,
          subject: replySubject(message.subject),
          text: toText(doc),
          html: toMailHtml(doc),
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
        editor.tf.reset();
        setEmpty(true);
      })
      .catch((e) => toast.error(toastText(e)));
  };

  const ready = !empty && to.length > 0 && !loading;

  return (
    <form
      className="overflow-hidden rounded-xl border bg-card shadow-sm focus-within:ring-2 focus-within:ring-ring/30"
      onSubmit={(e) => {
        e.preventDefault();
        if (ready) void submit();
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && ready) {
          e.preventDefault();
          void submit();
        }
      }}
    >
      <MailEditor editor={editor} onEmptyChange={setEmpty}>
        <MailContent className="max-h-96 min-h-24 overflow-y-auto" placeholder={`Reply ${to.map(addressLabel).join(", ")}…`} />
        <div className="flex items-center gap-2 px-3 pb-3">
          <MailToolbar />
          <Button
            type="button"
            variant="link"
            size="sm"
            className="ml-auto px-0 text-xs text-muted-foreground"
            onClick={() => {
              const content = editor.children as MailNode[];
              openSheet(
                "kuvertcompose",
                { replyTo: message.id, mode: "reply", content: isEmpty(content) ? undefined : content },
                { size: "large" },
              );
            }}
          >
            Open in the editor
          </Button>
          <Button type="submit" size="sm" className="gap-2" disabled={!ready}>
            {loading && <Spinner />}
            Send
            <Kbd className="bg-primary-foreground/15 text-primary-foreground">⌘↵</Kbd>
          </Button>
        </div>
      </MailEditor>
    </form>
  );
};
