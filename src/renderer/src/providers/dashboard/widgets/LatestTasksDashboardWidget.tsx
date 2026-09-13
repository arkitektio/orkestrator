import { useRegisterDashboardWidget } from "../hooks";
import { ListChecks, Loader2 } from "lucide-react";
import { useListTasksQuery, Ordering } from "@/rekuest/api/graphql";
import { statusTextColor, formatEventKind } from "@/rekuest/lib/taskStatus";
import { RekuestTask } from "@/linkers";
import Timestamp from "@/components/ui/timestamp";
import { Card } from "@/components/ui/card";
import { ResponsiveContainerGrid } from "@/components/layout/ContainerGrid";

const LatestTasksWidget = () => {
  const { data, loading } = useListTasksQuery({
    variables: {
      pagination: { limit: 10 },
      ordering: [{ createdAt: Ordering.Desc }],
    },
    fetchPolicy: "cache-and-network",
  });

  const tasks = data?.tasks ?? [];

  return (
    <div className="flexh-full gap-2 @container">
      {loading && tasks.length === 0 ? (
        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
      ) : tasks.length === 0 ? (
        <p className="text-xs text-muted-foreground">No tasks yet</p>
      ) : (
        <ResponsiveContainerGrid>
          {tasks.map((task) => (
            <RekuestTask.Smart key={task.id} object={task}>
              <RekuestTask.DetailLink
                object={task}
                className={() =>
                  "block p-2 rounded-lgtransition-colors cursor-pointer"
                }
              >
                <Card className="flex items-center justify-between gap-2  bg-muted/50 hover:bg-muted ">
                  <span className="text-xs font-medium truncate">
                    {task.action.name}
                  </span>
                  <span
                    className={`text-[10px] shrink-0 ${statusTextColor(task.latestEventKind, task.isDone)}`}
                  >
                    {formatEventKind(task.latestEventKind)}
                  </span>

                <p className="text-[10px] text-muted-foreground mt-0.5">
                  <Timestamp date={task.createdAt} relative />
                </p>
                </Card>
              </RekuestTask.DetailLink>
            </RekuestTask.Smart>
          ))}
        </ResponsiveContainerGrid>
      )}
    </div>
  );
};

export const LatestTasksDashboardWidget = () => {
  useRegisterDashboardWidget({
    key: "latest-tasks",
    label: "Latest Tasks",
    module: "rekuest",
    icon: <ListChecks className="w-3 h-3" />,
    component: () => <LatestTasksWidget />,
    defaultSize: "1x2",
    defaultWidth: 25,
    defaultHeight: 100,
  });

  return null;
};
