import React from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ElektroExperiment } from "@/linkers";
import { ListExperimentFragment } from "../../api/graphql";


interface Props {
  item: ListExperimentFragment;
  className?: string;
}

const TheCard = ({ item, className }: Props) => {
  return (
    <ElektroExperiment.Smart object={item} hover>
      <Card
        className={cn(
          "px-2 py-2 h-20 transition-all ease-in-out duration-200 truncate",
          className,
        )}
      >
        <ElektroExperiment.DetailLink
          object={item}
          className="px-2 py-2 h-full w-full absolute top-0 left-0 bg-opacity-20 bg-back-999 hover:bg-opacity-10 transition-all ease-in-out duration-200 truncate"
        >
          {item.name}
        </ElektroExperiment.DetailLink>
      </Card>
    </ElektroExperiment.Smart>
  );
};

export default React.memo(TheCard);