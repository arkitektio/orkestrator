import { asDetailQueryRoute } from "@/app/routes/DetailQueryRoute";
import { Sidebars } from "@/components/layout/Sidebars";
import { Button } from "@/components/ui/button";
import { PageAction, PageActionGroup } from "@/components/ui/page-action";
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
      color: "text-chart-3",
      bgColor: "bg-chart-3/10",
    },
    {
      title: "Events",
      value: String(props.task.events.length),
      description: "Events recorded for this task",
      icon: ListChecks,
      color: "text-chart-4",
      bgColor: "bg-chart-4/10",
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
          className="p-4 rounded-lg border dark:border-border flex items-center gap-4"
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
        title={data?.task?.action.name}
        additionalSidebars={<Sidebars.Tab label="Stats"><TaskStatsSidebar task={data.task} /></Sidebars.Tab>}
        object={data.task}
        pageActions={
          <>
            {/* The task's other views. One control, so they give way
                together rather than leaving a stray link behind. */}
            <PageActionGroup priority={-10}>
              <RekuestTask.DetailLink
                object={data?.task}
                subroute="log"
                className="font-semibold"
              >
                <PageAction size="sm">Logs</PageAction>
              </RekuestTask.DetailLink>
              {hasDelegations && (
                <RekuestTask.DetailLink
                  object={data?.task}
                  subroute="timeline"
                  className="font-semibold"
                >
                  <PageAction size="sm">Timeline</PageAction>
                </RekuestTask.DetailLink>
              )}
              {hasDelegations && (
                <RekuestTask.DetailLink
                  object={data?.task}
                  subroute="space"
                  className="font-semibold"
                >
                  <PageAction size="sm">Space</PageAction>
                </RekuestTask.DetailLink>
              )}
              {data.task.parent && (
                <RekuestTask.DetailLink
                  object={data?.task?.parent}
                  subroute="log"
                  className="font-semibold"
                >
                  <PageAction size="sm">Parent Logs</PageAction>
                </RekuestTask.DetailLink>
              )}
            </PageActionGroup>
            {/* `gap-0`: the split button is one shape, not two buttons. */}
            <PageActionGroup priority={10} className="gap-0">
              <PageAction
                size="sm"
                onClick={() => {
                  reassign();
                }}
                className="rounded-r-none"
              >
                Rerun
              </PageAction>
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
            </PageActionGroup>
            {/* Only offered while the task can still be stopped, so while it
                is offered it is the most urgent thing on the row. */}
            {isCancelable(data.task) && (
              <PageAction
                priority={20}
                onClick={() => cancel(data.task.id)}
                variant={"destructive"}
                size={"sm"}
              >
                Cancel
              </PageAction>
            )}
            {isInterruptable(data.task) && (
              <PageAction
                priority={20}
                onClick={() =>
                  interrupt({
                    variables: { input: { task: data.task.id } },
                  })
                }
                variant={"destructive"}
                size={"sm"}
              >
                Interrupt
              </PageAction>
            )}

            <DialogButton
              priority={-20}
              name="reportbug"
              variant="outline"
              size="sm"
              dialogProps={{ taskId: data?.task.id }}
            >
              Report Bug
            </DialogButton>
          </>
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
