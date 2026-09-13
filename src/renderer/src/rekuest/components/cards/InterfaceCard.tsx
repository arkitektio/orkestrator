import React from "react";
import { Card, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { RekuestInterface } from "@/linkers";

import { ListInterfaceFragment } from "@/rekuest/api/graphql";

interface Props {
  item: ListInterfaceFragment;

}

const TheCard = ({ item }: Props) => {
  return (
    <RekuestInterface.Smart object={item}>
      <Card className={cn("aspect-square flex flex-col")}>
        <CardHeader className="flex-grow">
          <CardTitle>
            <RekuestInterface.DetailLink object={item}>
              {" "}
              <h1>{item.key}</h1>
              <span className="text-muted-foreground font-light">
                {item.identifier}
              </span>
            </RekuestInterface.DetailLink>
          </CardTitle>
        </CardHeader>
        <CardFooter></CardFooter>
      </Card>
    </RekuestInterface.Smart>
  );
};

export default React.memo(TheCard);