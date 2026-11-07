import React from "react";
import { MikroGrid } from "@/core/linkers";
import { Card } from "@/core/ui/card";
import type { ListGridFragment } from "@/mikro/api/graphql";
import { gridAxesLabel } from "../../gridAxes";

const TheCard = ({ item }: { item: ListGridFragment }) => (
  <MikroGrid.Smart object={item} menuButton>
    <Card className="flex h-full flex-col gap-1.5 p-3">
      <MikroGrid.DetailLink object={item} className="truncate text-sm font-medium hover:underline">
        {item.name}
      </MikroGrid.DetailLink>
      {/* A grid is its members: rows, then columns. */}
      <div className="truncate text-xs text-muted-foreground">{gridAxesLabel(item)}</div>
    </Card>
  </MikroGrid.Smart>
);

export default React.memo(TheCard);
