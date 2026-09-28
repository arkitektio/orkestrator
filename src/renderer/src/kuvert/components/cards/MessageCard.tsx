import { Card } from "@/core/ui/card";
import { cn } from "@/core/util/utils";
import { Flag, Paperclip } from "lucide-react";
import { ListMessageFragment } from "../../api/graphql";
import { formatMailDate } from "../../format";
import { MailMessage } from "../../linkers";

/** One mail in a list: sender, subject, first line; bold while unread. */
const MessageCard = ({ item }: { item: ListMessageFragment }) => (
  <MailMessage.Smart object={item}>
    <Card className="group flex flex-col gap-0.5 px-3 py-2">
      <div className="flex items-baseline justify-between gap-3">
        <span className={cn("flex min-w-0 items-center gap-2 text-sm", !item.isRead ? "font-semibold" : "font-medium")}>
          {!item.isRead && <span className="h-2 w-2 shrink-0 rounded-full bg-primary" aria-label="Unread" />}
          <span className="truncate">{item.senderName || item.senderAddress}</span>
        </span>
        <span className="flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
          {item.isFlagged && <Flag className="h-3 w-3 fill-current text-destructive" aria-label="Flagged" />}
          {item.hasAttachments && <Paperclip className="h-3 w-3" aria-label="Attachments" />}
          {formatMailDate(item.date)}
        </span>
      </div>
      <MailMessage.DetailLink object={item} className={cn("truncate text-sm", !item.isRead && "font-medium")}>
        {item.subject || "(no subject)"}
      </MailMessage.DetailLink>
      <span className="truncate text-xs text-muted-foreground">{item.snippet}</span>
    </Card>
  </MailMessage.Smart>
);

export default MessageCard;
