import React from "react";
import { Card } from "@/core/ui/card";
import { RekuestMemoryShelve } from "@/core/linkers";
import { ListMemoryShelveFragment } from "@/rekuest/api/graphql";

interface Props {
  item: ListMemoryShelveFragment;
}

const TheCard = ({ item }: Props) => {
  return (
    <RekuestMemoryShelve.Smart object={item}>
      <Card className="flex h-full flex-col gap-1.5 p-3">
        <RekuestMemoryShelve.DetailLink object={item} className="truncate text-sm font-medium hover:underline">
          {item.name}
        </RekuestMemoryShelve.DetailLink>
        <div className="truncate text-xs text-muted-foreground">{item.agent.name}</div>
      </Card>
    </RekuestMemoryShelve.Smart>
  );
};

export default React.memo(TheCard);
