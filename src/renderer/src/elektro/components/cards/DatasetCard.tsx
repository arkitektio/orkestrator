import React from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ElektroDataset } from "@/linkers";
import { ListDatasetFragment } from "../../api/graphql";

interface Props {
  item: ListDatasetFragment;
  className?: string;
}

const TheCard = ({ item, className }: Props) => {
  return (
    <ElektroDataset.Smart object={item} hover>
      <Card
        className={cn(
          "px-2 py-2 h-20 flex transition-all ease-in-out duration-200 truncate items-center justify-center group hover:bg-back-800 hover:shadow-xl",
          className,
        )}
      >
        <ElektroDataset.DetailLink
          className={({ isActive }) =>
            "z-10 font-bold text-md mb-2 cursor-pointer " +
            (isActive ? "text-primary-300" : "")
          }
          object={item}
        >
          {item?.name}
        </ElektroDataset.DetailLink>
      </Card>
    </ElektroDataset.Smart>
  );
};

export default React.memo(TheCard);