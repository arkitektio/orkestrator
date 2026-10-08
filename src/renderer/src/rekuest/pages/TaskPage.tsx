import { asDetailQueryRoute } from "@/core/layout/routes/DetailQueryRoute";
import { Sidebars } from "@/core/layout/Sidebars";
import { Button } from "@/core/ui/button";
import { PageAction, PageActionGroup } from "@/core/ui/page-action";
import { DialogButton } from "@/core/ui/dialogbutton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/core/ui/dropdown-menu";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/core/ui/resizable";
import { RekuestTask } from "@/core/linkers";
import {
  DetailTaskFragment,
  useDetailTaskQuery,
  useInterruptMutation,
  usePauseMutation,
  useResumeMutation,
} from "@/rekuest/api/graphql";
import { ChevronDown, Clock, ListChecks, PanelTop } from "lucide-react";
import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ChildTaskUpdater } from "../components/updaters/ChildTaskUpdater";
import {
  TaskStatusHero,
  TaskTimeLine,
} from "../components/task/TaskEventLog";
import { TaskLane } from "../components/task/lane/TaskLane";
import {
  isYieldLike,
  LaneSelection,
  resolveSelection,
  selectionTime,
} from "../components/task/lane/selection";
import { TaskDetailStrip } from "../components/task/TaskDetailStrip";
import {
  StageTab,
  stageTabs,
  TaskStage,
} from "../components/task/TaskStage";
import { useCancelTask } from "../hooks/useAssign";
import { useReassign } from "../hooks/useReassign";
import {
  isCancelable,
  isInterruptable,
  isPausable,
  isResumable,
} from "../lib/taskStatus";
import { TaskFiredBy } from "../components/task/TaskFiredBy";
import { REKUEST_HELP } from "../help";

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

const STAGE_OPEN_KEY = "rekuest.task.stage.open";
const STAGE_TAB_KEY = "rekuest.task.stage.tab";

const readPref = (key: string): string | null => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

const writePref = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Storage blocked: the choice just isn't remembered.
  }
};

const isStageTab = (v: string | null): v is StageTab =>
  v === "flow" || v === "space" || v === "result";

/**
 * Whether the stage is open and which view it shows, remembered per viewer.
 * `?stage=space` (the old /space and /timeline routes) opens it on that view.
 */
const useStagePrefs = () => {
  const [params] = useSearchParams();
  const asked = params.get("stage");
  const [open, setOpenState] = useState(
    () => isStageTab(asked) || readPref(STAGE_OPEN_KEY) !== "false",
  );
  const [tab, setTabState] = useState<StageTab | null>(() => {
    if (isStageTab(asked)) return asked;
    const stored = readPref(STAGE_TAB_KEY);
    return isStageTab(stored) ? stored : null;
  });
  const setOpen = (next: boolean) => {
    setOpenState(next);
    writePref(STAGE_OPEN_KEY, String(next));
  };
  const setTab = (next: StageTab) => {
    setTabState(next);
    writePref(STAGE_TAB_KEY, next);
  };
  return { open, setOpen, tab, setTab };
};

export const TPage = asDetailQueryRoute(
  useDetailTaskQuery,
  ({ data }) => {
    const reassign = useReassign({ task: data.task });

    const { cancel } = useCancelTask();
    const [interrupt] = useInterruptMutation();
    const [pause] = usePauseMutation();
    const [resume] = useResumeMutation();

    const [selection, setSelection] = useState<LaneSelection>(null);
    const resolved = useMemo(
      () => resolveSelection(data.task, selection),
      [data.task, selection],
    );

    const stage = useStagePrefs();
    const tabs = stageTabs(data.task);
    const stageTab =
      stage.tab && tabs.includes(stage.tab) ? stage.tab : tabs[0];
    const stageOpen = stage.open && stageTab != null;

    const body = (
      <div className="flex h-full min-h-0 w-full flex-col gap-4 overflow-y-auto p-4">
        <TaskFiredBy task={data.task} />
        <TaskLane
          task={data.task}
          selection={
            resolved?.kind === "event"
              ? { kind: "event", id: resolved.event.id }
              : resolved?.kind === "child"
                ? { kind: "child", id: resolved.child.id }
                : null
          }
          onSelect={setSelection}
        />
        <TaskDetailStrip task={data.task} resolved={resolved} />
      </div>
    );

    return (
      <RekuestTask.ModelPage
        title={data?.task?.action.name}
        help={REKUEST_HELP.task}
        additionalSidebars={
          <>
            {/* The complete record, line by line: the lane's marks, in full. */}
            <Sidebars.Tab label="Log">
              <div className="p-2">
                <TaskTimeLine task={data.task} />
              </div>
            </Sidebars.Tab>
            <Sidebars.Tab label="Stats">
              <TaskStatsSidebar task={data.task} />
            </Sidebars.Tab>
          </>
        }
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
            {tabs.length > 0 && (
              <PageAction
                priority={-5}
                size="sm"
                variant={stageOpen ? "secondary" : "outline"}
                onClick={() => stage.setOpen(!stageOpen)}
                title={stageOpen ? "Hide the stage" : "Show the stage"}
              >
                <PanelTop className="h-4 w-4" />
                Stage
              </PageAction>
            )}
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
            {/* A paused task waits for a person — a pause someone asked for,
                or a workflow that held itself for a decision. */}
            {isResumable(data.task) && (
              <PageActionGroup priority={25} className="gap-0">
                <PageAction
                  size="sm"
                  onClick={() =>
                    resume({
                      variables: { input: { task: data.task.id, step: false } },
                    })
                  }
                  className="rounded-r-none"
                >
                  Resume
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
                      onClick={() =>
                        resume({
                          variables: {
                            input: { task: data.task.id, step: true },
                          },
                        })
                      }
                    >
                      Step to next breakpoint
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </PageActionGroup>
            )}
            {isPausable(data.task) && (
              <PageAction
                priority={15}
                size="sm"
                variant="outline"
                onClick={() =>
                  pause({ variables: { input: { task: data.task.id } } })
                }
              >
                Pause
              </PageAction>
            )}
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
        <div className="flex h-full w-full flex-col">
          <ChildTaskUpdater taskId={data.task.id} />
          <div className="shrink-0 px-4 pt-3">
            <TaskStatusHero task={data.task} />
          </div>
          {stageOpen ? (
            <ResizablePanelGroup
              direction="vertical"
              autoSaveId="rekuest:task-stage"
              className="min-h-0 flex-1"
            >
              <ResizablePanel defaultSize={50} minSize={15}>
                <TaskStage
                  task={data.task}
                  tabs={tabs}
                  tab={stageTab}
                  onTab={stage.setTab}
                  focusTime={selection ? selectionTime(resolved) : null}
                  selectedYield={
                    resolved?.kind === "event" && isYieldLike(resolved.event)
                      ? resolved.event
                      : null
                  }
                />
              </ResizablePanel>
              <ResizableHandle />
              <ResizablePanel defaultSize={50} minSize={20}>
                {body}
              </ResizablePanel>
            </ResizablePanelGroup>
          ) : (
            <div className="min-h-0 flex-1">{body}</div>
          )}
        </div>
      </RekuestTask.ModelPage>
    );
  },
);


export default TPage;
