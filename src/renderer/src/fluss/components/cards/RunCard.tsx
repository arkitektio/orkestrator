import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/core/components/ui/card";
import { FlussRun, FlussWorkspace } from "@/core/linkers";
import { ListRunFragment } from "@/fluss/api/graphql";
import Timestamp from "@/core/components/ui/timestamp";
import { Clock, Hash } from "lucide-react";
import RunStatusBadge from "./RunStatusBadge";

interface Props {
  item: ListRunFragment;
}

const TheCard = ({ item }: Props) => {
  return (
    <FlussRun.Smart object={item}>
      <Card className="hover:shadow-md transition-shadow gap-3">
        <CardHeader className="pb-0">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-base leading-tight">
              <FlussRun.DetailLink
                object={item}
                className="hover:text-primary transition-colors"
              >
                {item.flow.title || item.flow.workspace.title}
              </FlussRun.DetailLink>
            </CardTitle>
            <RunStatusBadge status={item.status} className="shrink-0" />
          </div>
          <CardDescription className="truncate">
            in{" "}
            <FlussWorkspace.DetailLink
              object={item.flow.workspace}
              className="hover:text-primary transition-colors"
            >
              {item.flow.workspace.title}
            </FlussWorkspace.DetailLink>
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0 flex flex-col gap-1 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <Clock className="h-3 w-3" />
            <Timestamp date={item.createdAt} relative />
          </div>
          <div className="flex items-center gap-2 truncate" title={item.taskId}>
            <Hash className="h-3 w-3 shrink-0" />
            <span className="truncate font-mono">{item.taskId}</span>
          </div>
        </CardContent>
      </Card>
    </FlussRun.Smart>
  );
};

export default React.memo(TheCard);
