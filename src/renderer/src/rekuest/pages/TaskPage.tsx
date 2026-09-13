import { asDetailQueryRoute } from "@/app/routes/DetailQueryRoute";
import { Sidebars } from "@/components/layout/Sidebars";
import { Button } from "@/components/ui/button";
import { DialogButton } from "@/components/ui/dialogbutton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RekuestTask } from "@/linkers";
import {
  DetailTaskFragment,
  useDetailTaskQuery,
  useInterruptMutation,
} from "@/rekuest/api/graphql";
import { ChevronDown, Clock, ListChecks } from "lucide-react";
import Timestamp from "@/components/ui/timestamp";
import { ChildTaskUpdater } from "../components/updaters/ChildTaskUpdater";
import {
  DefaultRenderer,
  TaskTimeLine,
} from "../components/task/TaskEventLog";
import { TaskFlow } from "../components/task/TaskFlow";
import { useCancelTask } from "../hooks/useAssign";
import { useReassign } from "../hooks/useReassign";
import { isCancelable, isInterruptable } from "../lib/taskStatus";

// Only stats the main column doesn't already show — status, progress and
// delegations live in the hero / Delegations section.
export const TaskStatsSidebar = (props: { task: DetailTaskFragment }) => {
  const endTime = props.task.finishedAt;
  const startTime = props.task.createdAt;

  const statsCards = [
    {
      title: "Total Walltime",
      value: !endTime
        ? "running…"
        : `${((new Date(endTime).getTime() - new Date(startTime).getTime()) / 1000).toFixed(2)}s`,
      description: "Total walltime taken for this task",
      icon: Clock,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      title: "Events",
      value: String(props.task.events.length),
      description: "Events recorded for this task",
      icon: ListChecks,
      color: "text-purple-500",
      bgColor: "bg-purple-500/10",
    },
  ];

  return (
    <div className="p-4 space-y-4">
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-2">Task Overview</h2>
        <p className="text-sm text-muted-foreground">
          Some basic statistics about this task.
        </p>
      </div>
      {statsCards.map((card) => (
        <div
          key={card.title}
          className="p-4 rounded-lg border dark:border-gray-700 flex items-center gap-4"
        >
          <div
            className={`p-3 rounded-lg ${card.bgColor} ${card.color}`}
          >
            <card.icon className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <p className="text-sm text-muted-foreground">{card.title}</p>
            <p className="text-2xl font-semibold">{card.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{card.description}</p>
          </div>
        </div>
      ))}
    </div>
  );
};

export const TPage = asDetailQueryRoute(
  useDetailTaskQuery,
  ({ data }) => {
    const reassign = useReassign({ task: data.task });

    const { cancel } = useCancelTask();
    const [interrupt] = useInterruptMutation();

    // The Timeline and Space views visualize delegations to other apps —
    // they're only offered when this task actually fanned out.
    const hasDelegations =
      (data.task.children?.length ?? 0) > 0 ||
      (data.task.resolvedDependencies?.length ?? 0) > 0;

    return (
      <RekuestTask.ModelPage
        title={
          <div className="flex flex-row gap-2">
            {data?.task?.action.name}
            <p className="text-md font-light text-muted-foreground">
              <Timestamp date={data.task.createdAt} relative />
            </p>
          </div>
        }
        additionalSidebars={<Sidebars.Tab label="Stats"><TaskStatsSidebar task={data.task} /></Sidebars.Tab>}
        object={data.task}
        pageActions={
          <div className="flex gap-2">
            <RekuestTask.DetailLink
              object={data?.task}
              subroute="log"
              className="font-semibold"
            >
              <Button
                variant={"outline"}
                size={"sm"}
              >
                Logs
              </Button>
            </RekuestTask.DetailLink>
            {hasDelegations && (
              <RekuestTask.DetailLink
                object={data?.task}
                subroute="timeline"
                className="font-semibold"
              >
                <Button
                  variant={"outline"}
                  size={"sm"}
                >
                  Timeline
                </Button>
              </RekuestTask.DetailLink>
            )}
            {hasDelegations && (
              <RekuestTask.DetailLink
                object={data?.task}
                subroute="space"
                className="font-semibold"
              >
                <Button
                  variant={"outline"}
                  size={"sm"}
                >
                  Space
                </Button>
              </RekuestTask.DetailLink>
            )}
            {data.task.parent && <RekuestTask.DetailLink
              object={data?.task?.parent}
              subroute="log"
              className="font-semibold"
            >
              <Button
                variant={"outline"}
                size={"sm"}
              >
                Parent Logs
              </Button>
            </RekuestTask.DetailLink>}
            <div className="flex">
              <Button
                variant={"outline"}
                size={"sm"}
                onClick={() => {
                  reassign();
                }}
                className="rounded-r-none"
              >
                Rerun
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant={"outline"}
                    size={"sm"}
                    className="rounded-l-none border-l-0 px-2"
                  >
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() => {
                      reassign({ capture: true });
                    }}
                  >
                    Rerun with Capture
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            {isCancelable(data.task) && (
              <Button
                onClick={() => cancel(data.task.id)}
                variant={"destructive"}
                size={"sm"}
              >
                Cancel
              </Button>
            )}
            {isInterruptable(data.task) && (
              <Button
                onClick={() =>
                  interrupt({
                    variables: { input: { task: data.task.id } },
                  })
                }
                variant={"destructive"}
                size={"sm"}
              >
                Interrupt
              </Button>
            )}

            <DialogButton name="reportbug" variant="outline" size="sm"
              dialogProps={{ taskId: data?.task.id }}
            >
              Report Bug
            </DialogButton>
          </div>
        }
      >
        <div className="flex h-full w-full relative">
          <ChildTaskUpdater taskId={data.task.id} />
          {data?.task?.implementation?.higherOrderFor?.action?.key ===
          "run_flow" ? (
            <>
              <Tabs className="flex-grow flex flex-col " defaultValue="flow">
                <TabsList className="h-8 flex-initial">
                  <TabsTrigger value="flow">Flow</TabsTrigger>
                  <TabsTrigger value="logs">Logs</TabsTrigger>
                </TabsList>

                <TabsContent value="flow" className="flex-grow">
                  <TaskFlow
                    id={data?.task?.implementation?.interface}
                    task={data.task}
                  />
                </TabsContent>
                <TabsContent value="logs" className="h-full w-full">
                  <TaskTimeLine task={data?.task} />
                </TabsContent>
              </Tabs>
            </>
          ) : (
            <DefaultRenderer task={data?.task} />
          )}
        </div>
      </RekuestTask.ModelPage>
    );
  },
);


export default TPage;
