import React from "react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { formatShape } from "@/lib/arrays/formatShape";
import { cn } from "@/lib/utils";
import { ElektroArrayDataset } from "@/linkers";
import { ListArrayDatasetFragment } from "../../api/graphql";
import { specsOf } from "../../specs";

interface Props {
  item: ListArrayDatasetFragment;
  className?: string;
}

/**
 * An array dataset in a list: its name, its shape read aloud ("3c 40000t"), its
 * unit, and — for a simulated one — the neuron model it came from.
 */
const TheCard = ({ item, className }: Props) => {
  return (
    <ElektroArrayDataset.Smart object={item} hover>
      <Card className={cn("relative flex h-20 flex-col justify-between px-3 py-2", className)}>
        <ElektroArrayDataset.DetailLink
          object={item}
          className="truncate text-sm font-medium after:absolute after:inset-0"
        >
          {item.name}
        </ElektroArrayDataset.DetailLink>
        <div className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
          {/* What it IS, as icons — the names are one hover away. */}
          {specsOf(item.spec).map((entry) => (
            <span key={entry.spec} title={entry.label} className="shrink-0">
              <entry.icon className="h-3 w-3" />
            </span>
          ))}
          <span className="truncate font-mono">{formatShape(item.axisNames, item.shape)}</span>
          {item.valueUnit && <span className="shrink-0 font-mono">{item.valueUnit}</span>}
          {item.simulation && (
            <Badge variant="outline" className="ml-auto max-w-[50%] shrink truncate text-[10px]">
              simulated · {item.simulation.model.name}
            </Badge>
          )}
        </div>
      </Card>
    </ElektroArrayDataset.Smart>
  );
};

export default React.memo(TheCard);
