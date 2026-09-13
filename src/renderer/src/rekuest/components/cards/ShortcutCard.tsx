import React from "react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { RekuestShortcut } from "@/linkers";

import { ListShortcutFragment } from "@/rekuest/api/graphql";

interface Props {
  item: ListShortcutFragment;

}

const TheCard = ({ item }: Props) => {
  return (
    <RekuestShortcut.Smart object={item}>
      <Card className={cn("aspect-square flex flex-col")}>
        <CardHeader className="flex-grow">
          <CardTitle>
            <RekuestShortcut.DetailLink object={item}>
              {" "}
              <h1>{item.name}</h1>
              <span className="text-muted-foreground font-light">
                {item.description}
              </span>
            </RekuestShortcut.DetailLink>
          </CardTitle>
        </CardHeader>
      </Card>
    </RekuestShortcut.Smart>
  );
};

export default React.memo(TheCard);