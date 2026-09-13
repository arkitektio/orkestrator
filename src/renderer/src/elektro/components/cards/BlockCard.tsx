import React from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ElektroBlock } from "@/linkers";
import { ListBlockFragment } from "../../api/graphql";
interface Props {
  item: ListBlockFragment;

  className?: string;
}

const TheCard = ({ item, className }: Props) => {
  return (
    <ElektroBlock.Smart object={item} >
      <Card
        className={cn(
          "px-2 py-2 h-20 transition-all ease-in-out duration-200 truncate",
          className,
        )}
        key={item.id}
      >
        <ElektroBlock.DetailLink
          object={item}
          className="px-2 py-2 h-full w-full absolute top-0 left-0 bg-opacity-20 bg-back-999 hover:bg-opacity-10 transition-all ease-in-out duration-200 truncate"
        >
          {item.name}
        </ElektroBlock.DetailLink>
      </Card>
    </ElektroBlock.Smart>
  );
};

export default React.memo(TheCard);