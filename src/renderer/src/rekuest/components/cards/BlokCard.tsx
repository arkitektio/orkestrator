import React from "react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { RekuestBlok } from "@/linkers";

import { ListBlokFragment } from "@/rekuest/api/graphql";

interface Props {
  item: ListBlokFragment;

}

const TheCard = ({ item }: Props) => {
  return (
    <RekuestBlok.Smart object={item}>
      <Card>
        <CardHeader>
          <CardTitle>
            <RekuestBlok.DetailLink object={item}>
              {" "}
              <h1>{item.name}</h1>
            </RekuestBlok.DetailLink>
          </CardTitle>
        </CardHeader>
      </Card>
    </RekuestBlok.Smart>
  );
};

export default React.memo(TheCard);