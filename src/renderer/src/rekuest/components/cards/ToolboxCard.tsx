import React from "react";
import { Card, CardFooter, CardHeader, CardTitle } from "@/core/ui/card";
import { cn } from "@/core/util/utils";
import { RekuestToolbox } from "@/core/linkers";

import { ListToolboxFragment } from "@/rekuest/api/graphql";

interface Props {
  item: ListToolboxFragment;

}

const TheCard = ({ item }: Props) => {
  return (
    <RekuestToolbox.Smart object={item}>
      <Card className={cn("aspect-square flex flex-col")}>
        <CardHeader className="flex-grow">
          <CardTitle>
            <RekuestToolbox.DetailLink object={item}>
              {" "}
              <h1>{item.name}</h1>
              <span className="text-muted-foreground font-light">
                {item.description}
              </span>
            </RekuestToolbox.DetailLink>
          </CardTitle>
        </CardHeader>
        <CardFooter></CardFooter>
      </Card>
    </RekuestToolbox.Smart>
  );
};

export default React.memo(TheCard);