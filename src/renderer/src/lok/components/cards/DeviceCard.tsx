import React from "react";
import { Card } from "@/components/ui/card";
import { LokDevice } from "@/linkers";
import { ListDeviceFragment } from "../../api/graphql";

interface Props {
  item: ListDeviceFragment;

}

const TheCard = ({ item }: Props) => {
  return (
    <LokDevice.Smart object={item} >
      <Card className="p-3">
        <LokDevice.DetailLink object={item} className="">
          {item.name || item.nodeId}
          <br />
        </LokDevice.DetailLink>
      </Card>
    </LokDevice.Smart>
  );
};

export default React.memo(TheCard);