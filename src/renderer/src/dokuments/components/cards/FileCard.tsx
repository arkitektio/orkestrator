import React from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { DokumentsFile } from "@/linkers";
import { ListFileFragment } from "../../api/graphql";


interface Props {
  item: ListFileFragment;
  className?: string;
}

const TheCard = ({ item, className }: Props) => {
  return (
    <DokumentsFile.Smart object={item}>
      <Card
        className={cn(
          "px-2 py-2 h-20 transition-all ease-in-out duration-200 truncate",
          className,
        )}
      >
        <DokumentsFile.DetailLink
          object={item}
          className="px-2 py-2 h-full w-full absolute top-0 left-0 bg-opacity-20 bg-back-999 hover:bg-opacity-10 transition-all ease-in-out duration-200 truncate"
        >
          {item.name}
        </DokumentsFile.DetailLink>
      </Card>
    </DokumentsFile.Smart>
  );
};

export default React.memo(TheCard);