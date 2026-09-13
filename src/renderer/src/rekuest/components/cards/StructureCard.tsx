import React from "react";
import { Card, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { RekuestStructure } from "@/linkers";

import { ListStructureFragment } from "@/rekuest/api/graphql";

interface Props {
  item: ListStructureFragment;

}

const TheCard = ({ item }: Props) => {
  return (
    <RekuestStructure.Smart object={item}>
      <Card className={cn("aspect-square flex flex-col")}>
        <CardHeader className="flex-grow">
          <CardTitle>
            <RekuestStructure.DetailLink object={item}>
              {" "}
              <h1>{item.key}</h1>
              <span className="text-muted-foreground font-light">
                {item.identifier}
              </span>
            </RekuestStructure.DetailLink>
          </CardTitle>
        </CardHeader>
        <CardFooter></CardFooter>
      </Card>
    </RekuestStructure.Smart>
  );
};

export default React.memo(TheCard);