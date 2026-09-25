import React from "react";
import { Card } from "@/components/ui/card";
import { LokServiceInstance } from "@/linkers";
import { ListServiceInstanceFragment } from "../../api/graphql";

interface Props {
  item: ListServiceInstanceFragment;

}

const TheCard = ({ item }: Props) => {
  return (
    <LokServiceInstance.Smart object={item} >
      <Card className="p-3 flex flex-col">
        <LokServiceInstance.DetailLink object={item} className="">
          {item.release.service.identifier}
        </LokServiceInstance.DetailLink>
        <div className="text-xs">configured for {item.release.service.id}</div>
      </Card>
    </LokServiceInstance.Smart>
  );
};

export default React.memo(TheCard);