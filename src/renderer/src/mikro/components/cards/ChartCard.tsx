import React from "react";
import { Card } from "@/core/ui/card";
import { MikroChart } from "@/core/linkers";
import { ListChartFragment } from "@/mikro/api/graphql";
import { chartAxisLabel } from "../../chartAxis";

interface Props {
  item: ListChartFragment;
}

const TheCard = ({ item }: Props) => {
  return (
    <MikroChart.Smart object={item} menuButton>
      <Card className="flex h-full flex-col gap-1.5 p-3">
        <MikroChart.DetailLink object={item} className="truncate text-sm font-medium hover:underline">
          {item.name}
        </MikroChart.DetailLink>
        {/* A chart is an axis: that is what it is laid out along. */}
        <div className="truncate text-xs text-muted-foreground">{chartAxisLabel(item.axis)}</div>
      </Card>
    </MikroChart.Smart>
  );
};

export default React.memo(TheCard);
