import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/core/components/ui/card";
import { FlussFlow, FlussWorkspace } from "@/core/linkers";
import { ListWorkspaceFragment } from "@/fluss/api/graphql";
import Timestamp from "@/core/components/ui/timestamp";
import { GitBranch, Workflow } from "lucide-react";

interface Props {
  workspace: ListWorkspaceFragment;
}

const TheCard = ({ workspace }: Props) => {
  return (
    <FlussWorkspace.Smart object={workspace}>
      <Card className="hover:shadow-md transition-shadow gap-3 h-full">
        <CardHeader className="pb-0">
          <CardTitle className="text-base leading-tight flex items-center gap-2">
            <Workflow className="h-4 w-4 text-primary shrink-0" />
            <FlussWorkspace.DetailLink
              object={workspace}
              className="hover:text-primary transition-colors truncate"
            >
              {workspace.title}
            </FlussWorkspace.DetailLink>
          </CardTitle>
          <CardDescription className="line-clamp-2 min-h-[2.5rem]">
            {workspace.description || "No description"}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0 text-xs text-muted-foreground">
          {workspace.latestFlow ? (
            <div className="flex items-center gap-2 truncate">
              <GitBranch className="h-3 w-3 shrink-0" />
              <FlussFlow.DetailLink
                object={workspace.latestFlow}
                className="truncate hover:text-primary transition-colors"
              >
                {workspace.latestFlow.title || "Latest flow"}
              </FlussFlow.DetailLink>
              <span className="shrink-0">
                · <Timestamp date={workspace.latestFlow.createdAt} relative />
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <GitBranch className="h-3 w-3" />
              No flows yet
            </div>
          )}
        </CardContent>
      </Card>
    </FlussWorkspace.Smart>
  );
};

export default React.memo(TheCard);
