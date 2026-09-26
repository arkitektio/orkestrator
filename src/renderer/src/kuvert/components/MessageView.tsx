import { useDialog } from "@/core/dialogs/registry";
import { Button } from "@/core/ui/button";
import { TooltipButton } from "@/core/ui/tooltip-button";
import { cn } from "@/core/util/utils";
import { Flag, Forward, ImageOff, Paperclip, Reply, ReplyAll } from "lucide-react";
import { useState } from "react";
import { AddressFragment, MessageFragment, useGetMessageQuery } from "../api/graphql";
import { addressLabel, formatMailDate, formatMailDateTime } from "../format";
import { MailMessage } from "../linkers";
import { MessageAttachments } from "./Attachments";
import { HtmlBody, TextBody } from "./MessageBody";
import { Monogram } from "./Monogram";

export type ComposeMode = "reply" | "replyAll" | "forward";

export { initials } from "./Monogram";

/** Reply, Reply all and Forward as icon buttons with tooltips, opening the compose sheet. */
export const ReplyButtons = ({ message, className }: { message: { id: string }; className?: string }) => {
  const { openSheet } = useDialog();
  const open = (mode: ComposeMode) => openSheet("kuvertcompose", { replyTo: message.id, mode }, { size: "large" });
  return (
    <div className={cn("flex items-center", className)}>
      <TooltipButton type="button" variant="ghost" size="icon-lg" tooltip="Reply" onClick={() => open("reply")}>
        <Reply />
      </TooltipButton>
      <TooltipButton type="button" variant="ghost" size="icon-lg" tooltip="Reply all" onClick={() => open("replyAll")}>
        <ReplyAll />
      </TooltipButton>
      <TooltipButton type="button" variant="ghost" size="icon-lg" tooltip="Forward" onClick={() => open("forward")}>
        <Forward />
      </TooltipButton>
    </div>
  );
};

const Recipients = ({ label, list }: { label: string; list: AddressFragment[] }) =>
  list.length === 0 ? null : (
    <div className="line-clamp-1 text-xs text-muted-foreground">
      {label}:{" "}
      {list.map((a, i) => (
        <span key={a.address + i} title={a.address} className="text-foreground/80">
          {i > 0 && ", "}
          {addressLabel(a)}
        </span>
      ))}
    </div>
  );

/**
 * The body of one mail. Remote images stay blocked until asked for: loading
 * one tells the sender the mail was read. Asking refetches the HTML with them.
 */
const Body = ({ message }: { message: MessageFragment }) => {
  const [allowRemote, setAllowRemote] = useState(false);
  const remote = useGetMessageQuery({ variables: { id: message.id, allowRemote: true }, skip: !allowRemote });
  const html = (allowRemote ? remote.data?.message.html : null) ?? message.html;

  return (
    <div className="flex flex-col gap-3 px-5 pb-5">
      {message.hasRemoteImages && !allowRemote && (
        <div className="flex items-center gap-2 rounded-lg bg-muted px-3 py-1.5 text-xs text-muted-foreground">
          <ImageOff className="size-3.5" />
          <span className="flex-1">This mail's remote images are blocked.</span>
          <Button type="button" variant="outline" size="xs" onClick={() => setAllowRemote(true)}>
            Load images
          </Button>
        </div>
      )}
      {html ? (
        <HtmlBody message={message.id} html={html} allowRemote={allowRemote} account={message.account.id} />
      ) : (
        <TextBody text={message.textBody} />
      )}
      {message.truncated && (
        <span className="text-xs text-muted-foreground">This mail was larger than the sync limit; only its headers are stored.</span>
      )}
    </div>
  );
};

/**
 * One mail as a card, as Apple Mail shows a conversation: monogram, sender
 * and date, recipients, then the body and its attachments. Folded (older
 * mail in a long conversation) it is one line with the start of the text;
 * clicking the header folds or opens it. Right-click and drag work on it as
 * on any `@kuvert/message`.
 */
export const MessageView = ({
  message,
  open = true,
  onToggle,
  showSubject = false,
}: {
  message: MessageFragment;
  open?: boolean;
  onToggle?: () => void;
  showSubject?: boolean;
}) => {
  const name = message.senderName || message.senderAddress;
  return (
    <MailMessage.Smart object={message}>
      <article className="overflow-hidden rounded-xl border bg-card text-card-foreground shadow-sm">
        <button
          type="button"
          onClick={onToggle}
          disabled={!onToggle}
          className={cn(
            "flex w-full items-start gap-3 px-5 text-left disabled:cursor-default",
            open ? "pb-3 pt-4" : "py-3 hover:bg-muted/40",
          )}
        >
          <Monogram name={message.senderName} address={message.senderAddress} className={open ? "size-10" : "size-8"} />
          <div className="grid min-w-0 flex-1 gap-0.5">
            <div className="flex items-baseline gap-2">
              <span className={cn("truncate", open ? "text-[15px]" : "text-sm", !message.isRead ? "font-bold" : "font-semibold")}>
                {name}
              </span>
              {open && message.senderName && (
                <span className="hidden truncate text-xs text-muted-foreground @md:inline">{message.senderAddress}</span>
              )}
              <span className="ml-auto flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
                {message.isFlagged && <Flag className="size-3 fill-current text-primary" aria-label="Flagged" />}
                {!open && message.hasAttachments && <Paperclip className="size-3" aria-label="Attachments" />}
                <span title={formatMailDateTime(message.date)}>
                  {open ? formatMailDateTime(message.date) : formatMailDate(message.date)}
                </span>
              </span>
            </div>
            {open ? (
              <>
                {showSubject && <div className="truncate text-[13px] font-medium">{message.subject || "(no subject)"}</div>}
                <Recipients label="To" list={message.to} />
                <Recipients label="Cc" list={message.cc} />
                <Recipients label="Bcc" list={message.bcc} />
                <Recipients label="Reply-To" list={message.replyTo} />
              </>
            ) : (
              <span className="line-clamp-1 text-xs text-muted-foreground">{message.snippet}</span>
            )}
          </div>
        </button>
        {open && (
          <>
            <Body message={message} />
            {message.attachments.some((a) => !a.inline) && (
              <div className="border-t bg-muted/30 px-5 py-3">
                <MessageAttachments message={message.id} attachments={message.attachments} />
              </div>
            )}
          </>
        )}
      </article>
    </MailMessage.Smart>
  );
};
