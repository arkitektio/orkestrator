import { reportErrorAs } from "@/core/notify";
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
  ComponentContext,
  useDetailTaskQuery,
  useInterruptMutation,
  usePauseMutation,
  useResumeMutation,
} from "@/rekuest/api/graphql";
import { ChevronDown, PanelTop } from "lucide-react";
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
import { HoldCard } from "../components/task/HoldCard";
import { askClosed, pendingHolds } from "../lib/holds";
import { REKUEST_HELP } from "../help";
import { TaskFacts } from "../sidebars/TaskInfoSidebar";
import { OpenRunInSpace, TaskRunPanel } from "../run/TaskRun";
import { TaskBloks } from "../components/TaskBloks";
import { useRunTask, useTaskActionBlok } from "../run/useRun";
import { drawsAsk } from "../run/ActionBlokRenderer";
import { useTask } from "../hooks/useTasks";

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

export type TaskView = "live" | "timeline";

const viewKey = (action: string) => `rekuest.task.view.${action}`;

const VIEW_LABEL: Record<TaskView, string> = {
  live: "Live",
  timeline: "Timeline",
};

const isTaskView = (v: string | null): v is TaskView =>
  v === "live" || v === "timeline";

/**
 * Live (the run as its action draws it) or Timeline (the record), remembered
 * per viewer and action. `?view=` opens on one. With no choice yet, a run with
 * a panel of its own or still going opens Live, a finished one Timeline; null
 * while `liveFirst` is not known yet, so the page does not flip once it is.
 * `remember: false` switches without keeping it as the choice.
 */
const useTaskView = (action: string, liveFirst: boolean | null) => {
  const [params] = useSearchParams();
  const asked = params.get("view");
  const [chosen, setChosen] = useState<TaskView | null>(() => {
    if (isTaskView(asked)) return asked;
    const stored = readPref(viewKey(action));
    return isTaskView(stored) ? stored : null;
  });
  const setView = (next: TaskView, { remember = true } = {}) => {
    setChosen(next);
    if (remember) writePref(viewKey(action), next);
  };
  const view: TaskView | null =
    chosen ?? (liveFirst == null ? null : liveFirst ? "live" : "timeline");
  return { view, setView };
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
    // What waits for a decision: this task's own hold, or a child it asked for.
    const holds = useMemo(() => pendingHolds(data.task.events), [data.task.events]);
    // Being cancelled or interrupted, the asks stay, grayed; once it ended, they go.
    const closed = askClosed(data.task);
    // An ask through a blok is answered on its hold card: the blok list leaves it out.
    const onCards = useMemo(
      () => new Set(holds.flatMap((hold) => (hold.blok ? [hold.blok] : []))),
      [holds],
    );
    const resolved = useMemo(
      () => resolveSelection(data.task, selection),
      [data.task, selection],
    );

    // The run as its action draws it, when the action declared a blok for the panel.
    // The viewer's own runs follow every event through the cache; anyone else's is polled.
    const own = useTask({ task: data.task.id });
    const { task: run, error: runError } = useRunTask(data.task.id, {
      follow: own === undefined,
    });
    const panel = useTaskActionBlok(run, ComponentContext.Html);
    const { view, setView } = useTaskView(
      data.task.action.id,
      run || runError ? panel != null || !data.task.isDone : null,
    );
    // Live with a panel is the panel alone: it draws the open ask itself
    // when it has an `<ask />`, else the ask cards stay above it.
    const panelOnly = view === "live" && panel != null;
    const panelAsks = useMemo(
      () => (panel ? drawsAsk(panel.actionBlok) : false),
      [panel],
    );

    const stage = useStagePrefs();
    const tabs = stageTabs(data.task);
    const stageTab =
      stage.tab && tabs.includes(stage.tab) ? stage.tab : tabs[0];
    const stageOpen = view === "timeline" && stage.open && stageTab != null;

    const live = panelOnly ? (
      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        <TaskRunPanel taskId={data.task.id} showAsk={panelAsks} />
      </div>
    ) : (
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4">
        {/* The latest thing the task showed, live; the rest is the timeline's. */}
        <TaskBloks
          task={data.task.id}
          answeredElsewhere={onCards}
          only="latestInform"
          fallback={
            stageTab == null && (
              <p className="text-sm text-muted-foreground">
                This task draws nothing live.{" "}
                <button
                  type="button"
                  className="underline underline-offset-2 hover:text-foreground"
                  onClick={() => setView("timeline", { remember: false })}
                >
                  See its timeline
                </button>
              </p>
            )
          }
        />
        {stageTab != null && (
          <div className="min-h-80 flex-1">
            <TaskStage
              task={data.task}
              tabs={tabs}
              tab={stageTab}
              onTab={stage.setTab}
              focusTime={null}
              selectedYield={null}
            />
          </div>
        )}
      </div>
    );

    const body = (
      <div className="flex h-full min-h-0 w-full flex-col gap-4 overflow-y-auto p-4">
        <TaskFiredBy task={data.task} />
        {/* What the task showed: its informs, and its asks with their answers. */}
        <TaskBloks task={data.task.id} answeredElsewhere={onCards} compact />
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
        sidebarKey="TaskDetail"
        defaultSidebar="Info"
        additionalSidebars={
          <>
            <Sidebars.Tab label="Info">
              <div className="flex h-full flex-col gap-4 overflow-y-auto p-4">
                <TaskFacts task={data.task} />
              </div>
            </Sidebars.Tab>
            {/* The complete record, line by line: the lane's marks, in full. */}
            <Sidebars.Tab label="Log">
              <div className="p-2">
                <TaskTimeLine task={data.task} />
              </div>
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
            {view && (
              <PageActionGroup priority={5} className="gap-0">
                {(["live", "timeline"] as const).map((v, i) => (
                  <PageAction
                    key={v}
                    size="sm"
                    variant={v === view ? "secondary" : "outline"}
                    onClick={() => setView(v)}
                    className={i === 0 ? "rounded-r-none" : "rounded-l-none border-l-0"}
                  >
                    {VIEW_LABEL[v]}
                  </PageAction>
                ))}
              </PageActionGroup>
            )}
            <OpenRunInSpace taskId={data.task.id} priority={-6} />
            {view === "timeline" && tabs.length > 0 && (
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
                    }).catch(reportErrorAs("Couldn't resume the task"))
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
                        }).catch(reportErrorAs("Couldn't step the task"))
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
                  pause({ variables: { input: { task: data.task.id } } }).catch(
                    reportErrorAs("Couldn't pause the task"),
                  )
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
                onClick={() => cancel(data.task.id).catch(reportErrorAs("Couldn't cancel the task"))}
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
                  }).catch(reportErrorAs("Couldn't interrupt the task"))
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
          {!panelOnly && (
            <div className="shrink-0 px-4 pt-3">
              <TaskStatusHero task={data.task} />
            </div>
          )}
          {holds.length > 0 && closed !== "ended" && !(panelOnly && panelAsks) && (
            <div className="flex shrink-0 flex-col gap-2 px-4 pt-3">
              {holds.map((hold) => (
                <HoldCard key={hold.task} hold={hold} closed={closed} />
              ))}
            </div>
          )}
          {view == null ? null : view === "live" ? (
            live
          ) : stageOpen ? (
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
