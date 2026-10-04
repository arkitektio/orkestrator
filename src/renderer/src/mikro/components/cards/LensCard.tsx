import React from "react";
import { Card } from "@/core/ui/card";
import { MikroLens } from "@/core/linkers";
import { ListLensFragment } from "@/mikro/api/graphql";
import { lensLabel } from "../../lenses";

interface Props {
  item: ListLensFragment;
}

const TheCard = ({ item }: Props) => {
  return (
    <MikroLens.Smart object={item} menuButton>
      <Card className="flex h-full flex-col gap-1.5 p-3">
        {/* A lens has no name of its own: it borrows its dataset's. */}
        <MikroLens.DetailLink object={item} className="truncate text-sm font-medium hover:underline">
          {item.dataset.name}
        </MikroLens.DetailLink>
        <div className="truncate text-xs text-muted-foreground">{lensLabel(item)}</div>
      </Card>
    </MikroLens.Smart>
  );
};

export default React.memo(TheCard);
