import React from "react";
import { Card } from "@/core/ui/card";
import { LokateVisit } from "@/core/linkers";
import { ListVisitFragment } from "@/lokate/api/graphql";
import { formatAt, formatDuration } from "../../format";

interface Props {
  item: ListVisitFragment;
}

const TheCard = ({ item }: Props) => {
  return (
    <LokateVisit.Smart object={item}>
      <Card className="flex h-full flex-col gap-1.5 p-3">
        <LokateVisit.DetailLink object={item} className="truncate text-sm font-medium hover:underline">
          {item.place?.name ?? "Unnamed stay"}
        </LokateVisit.DetailLink>
        <div className="truncate text-xs text-muted-foreground">{formatAt(item.start)} · {formatDuration(item.duration)}</div>
      </Card>
    </LokateVisit.Smart>
  );
};

export default React.memo(TheCard);
