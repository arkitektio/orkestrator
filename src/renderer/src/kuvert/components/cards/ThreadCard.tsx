import { Card } from "@/core/ui/card";
import { cn } from "@/core/util/utils";
import { Paperclip } from "lucide-react";
import { ListThreadFragment } from "../../api/graphql";
import { formatMailDate } from "../../format";
import { MailThread } from "../../linkers";
import { participantsLabel } from "../list/rows";

/** A conversation as a card (where another module shows one): who, what, when; bold while unread. */
const ThreadCard = ({ item }: { item: ListThreadFragment }) => (
  <MailThread.Smart object={item}>
    <Card className="group flex flex-col gap-0.5 px-3 py-2">
      <div className="flex items-baseline justify-between gap-3">
        <span className={cn("flex min-w-0 items-center gap-2 text-sm", item.unread ? "font-semibold" : "font-medium")}>
          {item.unread && <span className="size-2 shrink-0 rounded-full bg-primary" aria-label="Unread" />}
          <span className="truncate">{participantsLabel(item.participants, item.account.emailAddress)}</span>
          {item.messageCount > 1 && <span className="shrink-0 text-xs font-normal text-muted-foreground">{item.messageCount}</span>}
        </span>
        <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
          {item.hasAttachments && <Paperclip className="size-3" aria-label="Attachments" />}
          {formatMailDate(item.lastMessageAt)}
        </span>
      </div>
      <MailThread.DetailLink object={item} className="truncate text-sm">
        {item.subject || "(no subject)"}
      </MailThread.DetailLink>
      {item.latestMessage?.snippet && (
        <span className="truncate text-xs text-muted-foreground">{item.latestMessage.snippet}</span>
      )}
    </Card>
  </MailThread.Smart>
);

export default ThreadCard;
