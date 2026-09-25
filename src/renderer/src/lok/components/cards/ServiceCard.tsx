import React from "react";
import { Card } from "@/components/ui/card";
import { LokService } from "@/linkers";
import { ListServiceFragment } from "../../api/graphql";

interface Props {
  item: ListServiceFragment;

}

const TheCard = ({ item }: Props) => {
  return (
    <LokService.Smart object={item} >
      <Card className="p-3">
        <LokService.DetailLink object={item} className="">
          {item.name}
        </LokService.DetailLink>
      </Card>
    </LokService.Smart>
  );
};

export default React.memo(TheCard);