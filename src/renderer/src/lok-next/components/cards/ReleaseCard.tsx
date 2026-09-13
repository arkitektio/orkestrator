import React from "react";
import { Card } from "@/components/ui/card";
import { LokRelease } from "@/linkers";
import { ListReleaseFragment } from "../../api/graphql";

interface Props {
  item: ListReleaseFragment;

}

const TheCard = ({ item }: Props) => {
  return (
    <LokRelease.Smart object={item} >
      <Card className="p-3">
        <LokRelease.DetailLink object={item} className="">
          {item.version}
          <br />
        </LokRelease.DetailLink>
      </Card>
    </LokRelease.Smart>
  );
};

export default React.memo(TheCard);