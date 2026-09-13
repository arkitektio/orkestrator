import React from "react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { RekuestTask } from "@/linkers";

import Timestamp from "@/components/ui/timestamp";
import { ListTaskFragment } from "../../api/graphql";
interface Props {
  item: ListTaskFragment;

}

const TheCard = ({ item }: Props) => {
  return (
    <RekuestTask.Smart object={item}>
      <Card>
        <CardHeader>
          <CardTitle>
            <RekuestTask.DetailLink object={item}>
              {item.action.name}
            </RekuestTask.DetailLink>
            <div className="text-muted-foreground font-light mt-2">
              <Timestamp date={item.createdAt} relative />
            </div>
          </CardTitle>
        </CardHeader>
      </Card>
    </RekuestTask.Smart>
  );
};

export default React.memo(TheCard);