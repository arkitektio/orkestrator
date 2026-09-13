import React from "react";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FlussRun } from "@/linkers";

import { ListRunFragment } from "@/reaktion/api/graphql";
import Timestamp from "@/components/ui/timestamp";

interface Props {
  item: ListRunFragment;

}

const TheCard = ({ item }: Props) => {
  return (
    <FlussRun.Smart object={item}>
      <Card className="aspect-square">
        <CardHeader>
          <CardTitle>
            <FlussRun.DetailLink object={item}>
              {item.flow.workspace.title}{" "}
            </FlussRun.DetailLink>
          </CardTitle>
          <CardDescription>
            <Timestamp date={item.createdAt} relative />
          </CardDescription>
        </CardHeader>
      </Card>
    </FlussRun.Smart>
  );
};

export default React.memo(TheCard);