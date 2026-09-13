import React from "react";
import { Card, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { RekuestAction } from "@/linkers";

import { ListOutputStructureUsageFragment } from "@/rekuest/api/graphql";

interface Props {
  item: ListOutputStructureUsageFragment;

}

// A PortUsage is no longer an identifiable entity (it has no id), so we link to
// the action that uses the structure instead.
const TheCard = ({ item }: Props) => {
  return (
    <RekuestAction.Smart object={item.action}>
      <Card className={cn("aspect-square flex flex-col")}>
        <CardHeader className="flex-grow">
          <CardTitle>
            <RekuestAction.DetailLink object={item.action}>
              {" "}
              <h1>{item.portKey}</h1>
              <span className="text-muted-foreground font-light">
                {item.action.name}
              </span>
            </RekuestAction.DetailLink>
          </CardTitle>
        </CardHeader>
        <CardFooter></CardFooter>
      </Card>
    </RekuestAction.Smart>
  );
};

export default React.memo(TheCard);