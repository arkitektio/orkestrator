import { Card } from "@/core/ui/card";
import { RefreshCw, TriangleAlert } from "lucide-react";
import { ListMailAccountFragment, MailAccountStatus } from "../../api/graphql";
import { MailAccount } from "../../linkers";

/** A linked mailbox: its name and address, and whether it needs attention. */
const MailAccountCard = ({ item }: { item: ListMailAccountFragment }) => {
  const trouble = item.status === MailAccountStatus.NeedsReauth || !!item.lastErrorCode;
  return (
    <MailAccount.Smart object={item}>
      <Card className="group flex flex-col gap-0.5 px-3 py-2">
        <div className="flex items-baseline justify-between gap-3">
          <MailAccount.DetailLink object={item} className="truncate text-sm font-medium">
            {item.name || item.emailAddress}
          </MailAccount.DetailLink>
          <span className="flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
            {item.syncing && <RefreshCw className="h-3 w-3 animate-spin" aria-label="Syncing" />}
            {trouble && <TriangleAlert className="h-3 w-3 text-destructive" aria-label="Needs attention" />}
            {item.unreadCount > 0 && <span>{item.unreadCount} unread</span>}
          </span>
        </div>
        <span className="truncate text-xs text-muted-foreground">
          {item.emailAddress}
          {item.status === MailAccountStatus.Disabled && " · paused"}
        </span>
      </Card>
    </MailAccount.Smart>
  );
};

export default MailAccountCard;
