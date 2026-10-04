import React from "react";
import { Card } from "@/core/ui/card";
import { ElektroMechanism } from "@/core/linkers";
import { ListMechanismFragment } from "@/elektro/api/graphql";

interface Props {
  item: ListMechanismFragment;
}

const TheCard = ({ item }: Props) => {
  return (
    <ElektroMechanism.Smart object={item}>
      <Card className="flex h-full flex-col gap-1.5 p-3">
        <ElektroMechanism.DetailLink object={item} className="truncate text-sm font-medium hover:underline">
          {item.name}
        </ElektroMechanism.DetailLink>
        <div className="truncate text-xs text-muted-foreground">{item.parameters.length} {item.parameters.length === 1 ? "parameter" : "parameters"}</div>
      </Card>
    </ElektroMechanism.Smart>
  );
};

export default React.memo(TheCard);
