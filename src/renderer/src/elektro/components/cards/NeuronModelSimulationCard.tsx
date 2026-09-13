import React from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ElektroSimulation } from "@/linkers";
import { ListSimulationFragment } from "../../api/graphql";
import { toBase } from "@/lib/quantities";
import Timestamp from "@/components/ui/timestamp";
import { Badge } from "@/components/ui/badge";


interface Props {
  item: ListSimulationFragment;
  className?: string;
}

const TheCard = ({ item, className }: Props) => {
  // `duration` is a `Duration` quantity string ("100 ms"); normalise to ms.
  const durationMs = toBase(item.duration, "time", 0);
  const seconds = durationMs / 1000;
  const formatted = durationMs >= 1000 ? `${seconds.toFixed(2)} seconds` : `${durationMs} ms`;

  return (
    <ElektroSimulation.Smart object={item}>
      <Card
        className={cn(
          "px-3 py-2 transition-all ease-in-out duration-200 w-full hover:scale-[1.01] hover:shadow-md",
          className,
        )}
      >
        <div className="flex items-center justify-between gap-3">
          <ElektroSimulation.DetailLink
            object={item}
            className="flex-1 transition-all ease-in-out duration-200 truncate"
          >
            <div className="text-sm font-semibold truncate">{item.name}</div>
            <div className="text-xs text-muted-foreground truncate">{item.model.name}</div>
          </ElektroSimulation.DetailLink>

          <div className="flex flex-col items-end gap-1">
            <Badge variant="secondary" className="uppercase">{formatted}</Badge>
            <div className="text-xs text-muted-foreground">
              <Timestamp date={new Date(item.createdAt)} autoUpdate />
            </div>
          </div>
        </div>
      </Card>
    </ElektroSimulation.Smart>
  );
};

export default React.memo(TheCard);