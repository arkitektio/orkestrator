import React from "react";
import { Card } from "@/core/ui/card";
import { MailTaskList } from "@/core/linkers";
import { ListTaskListFragment } from "@/kuvert/api/graphql";

interface Props {
  item: ListTaskListFragment;
}

const TheCard = ({ item }: Props) => {
  return (
    <MailTaskList.Smart object={item}>
      <Card className="flex h-full flex-col gap-1.5 p-3">
        <MailTaskList.DetailLink object={item} className="truncate text-sm font-medium hover:underline">
          {item.name}
        </MailTaskList.DetailLink>
        <div className="truncate text-xs text-muted-foreground">{item.openCount} open</div>
      </Card>
    </MailTaskList.Smart>
  );
};

export default React.memo(TheCard);
