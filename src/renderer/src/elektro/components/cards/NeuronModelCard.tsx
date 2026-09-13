import React from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ElektroNeuronModel } from "@/linkers";
import { ListNeuronModelFragment } from "../../api/graphql";


interface Props {
  item: ListNeuronModelFragment;
  className?: string;
}

const TheCard = ({ item, className }: Props) => {
  return (
    <ElektroNeuronModel.Smart object={item} hover>
      <Card
        className={cn(
          "px-2 py-2 h-20 transition-all ease-in-out duration-200 truncate",
          className,
        )}
      >
        <ElektroNeuronModel.DetailLink
          object={item}
          className="px-2 py-2 h-full w-full absolute top-0 left-0 bg-opacity-20 bg-back-999 hover:bg-opacity-10 transition-all ease-in-out duration-200 truncate"
        >
          {item.name}
        </ElektroNeuronModel.DetailLink>
      </Card>
    </ElektroNeuronModel.Smart>
  );
};

export default React.memo(TheCard);