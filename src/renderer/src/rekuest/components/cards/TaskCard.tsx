import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RekuestTask } from "@/linkers";
import { Clock } from "lucide-react";
import Timestamp from "@/components/ui/timestamp";
import { ListTaskFragment } from "../../api/graphql";

interface Props {
  item: ListTaskFragment;
}

const TheCard = ({ item }: Props) => {
  return (
    <RekuestTask.Smart object={item}>
      <Card className="hover:shadow-md transition-shadow">
        <CardHeader className="pb-0">
          <CardTitle className="text-base">
            <RekuestTask.DetailLink object={item} className="hover:text-primary transition-colors">
              {item.action.name}
            </RekuestTask.DetailLink>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span className="text-xs">
              <Timestamp date={item.createdAt} relative />
            </span>
          </div>
        </CardContent>
      </Card>
    </RekuestTask.Smart>
  );
};

export default React.memo(TheCard);