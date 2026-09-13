import React from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ElektroSimulation } from "@/linkers";
import { ListSimulationFragment } from "../../api/graphql";


interface Props {
  item: ListSimulationFragment;
  className?: string;
}

const TheCard = ({ item, className }: Props) => {
  return (
    <ElektroSimulation.Smart object={item} hover>
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


        </div>
      </Card>
    </ElektroSimulation.Smart>
  );
};

export default React.memo(TheCard);