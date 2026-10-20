import { Badge } from "@/core/ui/badge";
import { Card } from "@/core/ui/card";
import { cn } from "@/core/util/utils";
import React from "react";
import { ListMailProviderFragment } from "../../api/graphql";
import { MailProvider } from "../../linkers";
import { providerIcon, serversOf } from "../providerKind";

/** One of the organization's providers: its kind, its servers (IMAP), how many mailboxes go through it. */
const ProviderCard = ({ item }: { item: ListMailProviderFragment }) => {
  const Icon = providerIcon(item.kind);
  const servers = serversOf(item.server);
  return (
    <MailProvider.Smart object={item}>
      <Card className={cn("group flex flex-col gap-0.5 px-3 py-2", !item.enabled && "opacity-60")}>
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
            <MailProvider.DetailLink object={item} className="truncate text-sm font-medium">
              {item.name}
            </MailProvider.DetailLink>
          </div>
          {!item.enabled && (
            <Badge variant="secondary" className="rounded-full px-2 py-0.5 text-[10px]">
              disabled
            </Badge>
          )}
        </div>
        <span className="truncate text-xs text-muted-foreground">
          {item.kindInfo.label}
          {servers && <> · {servers}</>}
          {" · "}
          {item.mailboxCount === 1 ? "1 mailbox" : `${item.mailboxCount} mailboxes`}
        </span>
      </Card>
    </MailProvider.Smart>
  );
};

export default React.memo(ProviderCard);
