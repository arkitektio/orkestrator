import React from "react";
import { Card } from "@/core/ui/card";
import { DokumentsDocument } from "@/core/linkers";
import { ListDocumentFragment } from "@/dokuments/api/graphql";

interface Props {
  item: ListDocumentFragment;
}

const TheCard = ({ item }: Props) => {
  return (
    <DokumentsDocument.Smart object={item}>
      <Card className="flex h-full flex-col gap-1.5 p-3">
        <DokumentsDocument.DetailLink object={item} className="truncate text-sm font-medium hover:underline">
          {item.title || "Untitled document"}
        </DokumentsDocument.DetailLink>
      </Card>
    </DokumentsDocument.Smart>
  );
};

export default React.memo(TheCard);
