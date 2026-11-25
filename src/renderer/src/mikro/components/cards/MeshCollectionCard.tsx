import React from "react";
import { MikroMeshCollection } from "@/core/linkers";
import { Card } from "@/core/ui/card";
import type { ListMeshCollectionFragment } from "@/mikro/api/graphql";

const TheCard = ({ item }: { item: ListMeshCollectionFragment }) => (
  <MikroMeshCollection.Smart object={item} menuButton>
    <Card className="flex h-full flex-col gap-1.5 p-3">
      <MikroMeshCollection.DetailLink object={item} className="truncate text-sm font-medium hover:underline">
        {item.label}
      </MikroMeshCollection.DetailLink>
      {/* The store's format, once it has been read. */}
      {item.specVersion && (
        <div className="truncate text-xs text-muted-foreground">{item.specVersion}</div>
      )}
    </Card>
  </MikroMeshCollection.Smart>
);

export default React.memo(TheCard);
