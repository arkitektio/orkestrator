import React from "react";
import { Card, CardTitle } from "@/components/ui/card";
import { MikroTableDataset } from "@/linkers";
import { ListTableDatasetFragment } from "../../api/graphql";

interface Props {
  item: ListTableDatasetFragment;
}

const TheCard = ({ item }: Props) => {
  return (
    <MikroTableDataset.Smart object={item}>
      <Card className="px-2 py-2 aspect-[5/3] flex flex-col justify-between">
        <CardTitle className="line-clamp-2 break-words">
          <MikroTableDataset.DetailLink object={item}>
            {item.name}
          </MikroTableDataset.DetailLink>
        </CardTitle>
        <div className="flex flex-row flex-wrap gap-1 items-center">
          <span className="text-xs text-muted-foreground font-mono">
            {item.axisNames.length
              ? item.axisNames.join(" × ")
              : "measurement table"}
          </span>
        </div>
      </Card>
    </MikroTableDataset.Smart>
  );
};

export default React.memo(TheCard);