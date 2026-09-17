import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FlussFlow, FlussWorkspace } from "@/linkers";
import { ListFlowFragment } from "@/reaktion/api/graphql";
import Timestamp from "@/components/ui/timestamp";
import { Clock, GitBranch } from "lucide-react";

interface Props {
  item: ListFlowFragment;
}

const TheCard = ({ item }: Props) => {
  return (
    <FlussFlow.Smart object={item}>
      <Card className="hover:shadow-md transition-shadow gap-3">
        <CardHeader className="pb-0">
          <CardTitle className="text-base leading-tight flex items-center gap-2">
            <GitBranch className="h-4 w-4 text-primary shrink-0" />
            <FlussFlow.DetailLink
              object={item}
              className="hover:text-primary transition-colors truncate"
            >
              {item.title || "Untitled flow"}
            </FlussFlow.DetailLink>
          </CardTitle>
          <CardDescription className="truncate">
            in{" "}
            <FlussWorkspace.DetailLink
              object={item.workspace}
              className="hover:text-primary transition-colors"
            >
              {item.workspace.title}
            </FlussWorkspace.DetailLink>
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <Clock className="h-3 w-3" />
            <Timestamp date={item.createdAt} relative />
          </div>
        </CardContent>
      </Card>
    </FlussFlow.Smart>
  );
};

export default React.memo(TheCard);
