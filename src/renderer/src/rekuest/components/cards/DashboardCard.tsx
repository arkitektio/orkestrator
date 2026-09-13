import React from "react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { RekuestDashboard } from "@/linkers";

import { ListDashboardFragment } from "@/rekuest/api/graphql";

interface Props {
  item: ListDashboardFragment;

}

const TheCard = ({ item }: Props) => {
  return (
    <RekuestDashboard.Smart object={item}>
      <Card>
        <CardHeader>
          <CardTitle>
            <RekuestDashboard.DetailLink object={item}>
              {" "}
              <h1>{item.name}</h1>
            </RekuestDashboard.DetailLink>
          </CardTitle>
        </CardHeader>
      </Card>
    </RekuestDashboard.Smart>
  );
};

export default React.memo(TheCard);