import React from "react";
import { Card, CardFooter, CardHeader, CardTitle } from "@/core/ui/card";
import { cn } from "@/core/util/utils";
import { RekuestSpace } from "@/core/linkers";

import { ListSpaceFragment } from "@/rekuest/api/graphql";

interface Props {
  item: ListSpaceFragment;

}

const TheCard = ({ item }: Props) => {
  return (
    <RekuestSpace.Smart object={item}>
      <Card className={cn("aspect-square flex flex-col")}>
        <CardHeader className="flex-grow">
          <CardTitle>
            <RekuestSpace.DetailLink object={item}>
              {" "}
              <h1>{item.name}</h1>
              <span className="text-muted-foreground font-light">
                {item.id}
              </span>
            </RekuestSpace.DetailLink>
          </CardTitle>
        </CardHeader>
        <CardFooter></CardFooter>
      </Card>
    </RekuestSpace.Smart>
  );
};

export default React.memo(TheCard);