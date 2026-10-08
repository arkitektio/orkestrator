import React from "react";
import { Card } from "@/core/ui/card";
import { LokateTrip } from "@/core/linkers";
import { ListTripFragment } from "@/lokate/api/graphql";
import { formatAt, formatDistance, formatDuration, MODE_LABELS } from "../../format";

interface Props {
  item: ListTripFragment;
}

const TheCard = ({ item }: Props) => {
  return (
    <LokateTrip.Smart object={item}>
      <Card className="flex h-full flex-col gap-1.5 p-3">
        <LokateTrip.DetailLink object={item} className="truncate text-sm font-medium hover:underline">
          {MODE_LABELS[item.mode]} · {formatDistance(item.distance)}
        </LokateTrip.DetailLink>
        <div className="truncate text-xs text-muted-foreground">{formatAt(item.start)} · {formatDuration(item.duration)}</div>
      </Card>
    </LokateTrip.Smart>
  );
};

export default React.memo(TheCard);
