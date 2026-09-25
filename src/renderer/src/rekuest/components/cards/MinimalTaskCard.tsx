import React from "react";
import { Card, CardHeader, CardTitle } from "@/core/ui/card";
import { RekuestTask } from "@/core/linkers";
import Timestamp from "@/core/ui/timestamp";
import { MinimalTaskFragment } from "../../api/graphql";
interface Props {
  item: MinimalTaskFragment;
}

const TheCard = ({ item }: Props) => {
  return (
    <RekuestTask.Smart object={item}>
      <Card>
        <CardHeader>
          <CardTitle>
            <RekuestTask.DetailLink object={item}>
              {item.implementation?.interface ?? item.action.name}
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