import React from "react";
import { Card } from "@/core/ui/card";
import { MailCategory } from "@/core/linkers";
import { CategoryFragment } from "@/kuvert/api/graphql";

interface Props {
  item: CategoryFragment;
}

const TheCard = ({ item }: Props) => {
  return (
    <MailCategory.Smart object={item}>
      <Card className="flex h-full flex-col gap-1.5 p-3">
        <MailCategory.DetailLink object={item} className="truncate text-sm font-medium hover:underline">
          {item.name}
        </MailCategory.DetailLink>
        <div className="truncate text-xs text-muted-foreground">{item.messageCount} messages · {item.account.name || item.account.emailAddress}</div>
      </Card>
    </MailCategory.Smart>
  );
};

export default React.memo(TheCard);
