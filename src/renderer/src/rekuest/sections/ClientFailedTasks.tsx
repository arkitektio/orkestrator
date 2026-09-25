import { useDialog } from "@/core/dialogs/registry";
import { Badge } from "@/core/ui/badge";
import { Button } from "@/core/ui/button";
import { RekuestTask } from "@/core/linkers";
import type { Object } from "@/core/types";
import { AlertTriangle, Bug } from "lucide-react";
import {
  PostmanTaskFragment,
  TaskEventKind,
  useListTasksDetailsQuery,
} from "../api/graphql";

/**
 * A client's critical task failures: rekuest's `main` section on `@lok/client`
 * pages. The page hands over the client's OAuth id (`clientId`), which is what
 * rekuest records tasks against.
 */
export const ClientFailedTasks = ({ object }: { identifier: string; object: Object }) => {
  const clientId = typeof object.clientId === "string" ? object.clientId : undefined;
  const { openDialog } = useDialog();

  const { data } = useListTasksDetailsQuery({
    skip: !clientId,
    variables: {
      filter: {
        clientId: clientId,
        state: [TaskEventKind.Critical],
      },
    },
  });

  if (!data?.tasks?.length) return null;

  const handleReportBug = (task: PostmanTaskFragment) => {
    openDialog("reportbug", {
      taskId: task.id,
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-red-500 font-medium">
        <AlertTriangle className="h-5 w-5" />
        <h3>Critical Failures</h3>
      </div>
      <div className="border rounded-md divide-y">
        {data.tasks.map((ex, index) => (
          <div
            key={index}
            className="flex items-center justify-between p-3 hover:bg-muted/50 transition-colors"
          >
            <RekuestTask.DetailLink object={{id: ex.id}} className="flex flex-col gap-1">
              <div className="font-medium flex items-center gap-2">
                {ex.action.name}
                <Badge variant="destructive" className="text-[10px] h-5">
                  CRITICAL
                </Badge>
              </div>
              <div className="text-xs text-muted-foreground font-mono">
                {ex.id}
              </div>
            </RekuestTask.DetailLink>
            <Button
              variant="ghost"
              size="sm"
              className="h-8"
              onClick={() => handleReportBug(ex)}
            >
              <Bug className="h-4 w-4 mr-2" />
              Report
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
};
