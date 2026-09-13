import React from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { DokumentsPage } from "@/linkers";
import { ListPageFragment } from "../../api/graphql";


interface Props {
  item: ListPageFragment;
  className?: string;
}

const TheCard = ({ item, className }: Props) => {
  return (
    <DokumentsPage.Smart object={item}>
      <Card
        className={cn(
          "px-2 py-2 h-20 transition-all ease-in-out duration-200 truncate",
          className,
        )}
      >
        <DokumentsPage.DetailLink
          object={item}
          className=""
        >
          {item.document.title} - Page {item.index + 1}
        </DokumentsPage.DetailLink>
        <div className="text-xs text-muted-foreground">
          {item.content ? item.content.slice(0, 50) + '...' : 'No content available'}
        </div>
      </Card>
    </DokumentsPage.Smart>
  );
};

export default React.memo(TheCard);