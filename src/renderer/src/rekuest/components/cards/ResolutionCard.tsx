import React from "react";
import { Card } from "@/core/ui/card";
import { RekuestResolution } from "@/core/linkers";
import { ResolutionFragment } from "@/rekuest/api/graphql";

interface Props {
  item: ResolutionFragment;
}

const TheCard = ({ item }: Props) => {
  return (
    <RekuestResolution.Smart object={item}>
      <Card className="flex h-full flex-col gap-1.5 p-3">
        <RekuestResolution.DetailLink object={item} className="truncate text-sm font-medium hover:underline">
          {item.name || "Unnamed resolution"}
        </RekuestResolution.DetailLink>
        <div className="truncate text-xs text-muted-foreground">{item.resolvedDependencies.length} resolved {item.resolvedDependencies.length === 1 ? "dependency" : "dependencies"}</div>
      </Card>
    </RekuestResolution.Smart>
  );
};

export default React.memo(TheCard);
