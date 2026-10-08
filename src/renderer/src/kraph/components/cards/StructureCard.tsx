import React from "react";
import { Card } from "@/core/ui/card";
import { KraphStructure } from "@/core/linkers";
import { ListStructureFragment } from "@/kraph/api/graphql";

interface Props {
  item: ListStructureFragment;
}

const TheCard = ({ item }: Props) => {
  return (
    <KraphStructure.Smart object={item}>
      <Card className="flex h-full flex-col gap-1.5 p-3">
        <KraphStructure.DetailLink object={item} className="truncate text-sm font-medium hover:underline">
          {item.kind?.label || item.identifier}
        </KraphStructure.DetailLink>
        <div className="truncate text-xs text-muted-foreground">{item.identifier} · {item.object}</div>
      </Card>
    </KraphStructure.Smart>
  );
};

export default React.memo(TheCard);
