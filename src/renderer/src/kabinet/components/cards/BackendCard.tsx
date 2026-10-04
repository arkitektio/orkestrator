import React from "react";
import { Card } from "@/core/ui/card";
import { KabinetBackend } from "@/core/linkers";
import { ListBackendFragment } from "@/kabinet/api/graphql";

interface Props {
  item: ListBackendFragment;
}

const TheCard = ({ item }: Props) => {
  return (
    <KabinetBackend.Smart object={item}>
      <Card className="flex h-full flex-col gap-1.5 p-3">
        <KabinetBackend.DetailLink object={item} className="truncate text-sm font-medium hover:underline">
          {item.name}
        </KabinetBackend.DetailLink>
        <div className="truncate text-xs text-muted-foreground">{item.kind}</div>
      </Card>
    </KabinetBackend.Smart>
  );
};

export default React.memo(TheCard);
