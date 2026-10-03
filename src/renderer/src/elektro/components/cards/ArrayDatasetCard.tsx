import React from "react";
import { Badge } from "@/core/ui/badge";
import { HomeCard, HomeCardMeta, HomeCardTitle } from "@/core/ui/home-card";
import { formatShape } from "@/core/data/arrays/formatShape";
import { ElektroArrayDataset } from "@/core/linkers";
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
      <HomeCard className={className}>
        <HomeCardTitle>
          <ElektroArrayDataset.DetailLink object={item}>
            {item.name}
          </ElektroArrayDataset.DetailLink>
        </HomeCardTitle>
        <HomeCardMeta>
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
        </HomeCardMeta>
      </HomeCard>
    </ElektroArrayDataset.Smart>
  );
};

export default React.memo(TheCard);
