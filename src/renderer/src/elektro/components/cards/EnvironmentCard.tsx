import React from "react";
import { Card } from "@/core/ui/card";
import { ElektroEnvironment } from "@/core/linkers";
import { ListModEnvironmentFragment } from "@/elektro/api/graphql";

interface Props {
  item: ListModEnvironmentFragment;
}

const TheCard = ({ item }: Props) => {
  return (
    <ElektroEnvironment.Smart object={item}>
      <Card className="flex h-full flex-col gap-1.5 p-3">
        <ElektroEnvironment.DetailLink object={item} className="truncate text-sm font-medium hover:underline">
          {item.name}
        </ElektroEnvironment.DetailLink>
        <div className="truncate text-xs text-muted-foreground">{item.description || `${item.mechanisms.length} mechanisms`}</div>
      </Card>
    </ElektroEnvironment.Smart>
  );
};

export default React.memo(TheCard);
