import { reportErrorAs } from "@/core/notify";
import { asDetailQueryRoute } from "@/core/layout/routes/DetailQueryRoute";
import { Sidebars } from "@/core/layout/Sidebars";
import { useDialog } from "@/core/dialogs/registry";
import { Button } from "@/core/ui/button";
import { PageAction, PageActionGroup } from "@/core/ui/page-action";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/core/ui/dropdown-menu";
import { RekuestTask } from "@/core/linkers";
import {
  ComponentContext,
  useDetailTaskQuery,
  useInterruptMutation,
  usePauseMutation,
  useResumeMutation,
} from "@/rekuest/api/graphql";
import { ChevronDown, ChevronUp, MoreHorizontal } from "lucide-react";
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
import { TaskRunPanel, TaskRunScene } from "../run/TaskRun";
import { TaskBloks } from "../components/TaskBloks";
import { useRunTask, useTaskActionBlok } from "../run/useRun";
import { drawsAsk } from "../run/ActionBlokRenderer";
import { useTask } from "../hooks/useTasks";

const STAGE_OPEN_KEY = "rekuest.task.stage.open";
const RECORD_OPEN_KEY = "rekuest.task.record.open";
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
 * With no choice yet it is open for a finished task only: a running one has
 * its views in Live.
 */
const useStagePrefs = (defaultOpen: boolean) => {
  const [params] = useSearchParams();
  const asked = params.get("stage");
  const [open, setOpenState] = useState(() => {
    if (isStageTab(asked)) return true;
    const stored = readPref(STAGE_OPEN_KEY);
    return stored == null ? defaultOpen : stored !== "false";
  });
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
 * a blok of its own or still going opens Live, a finished one Timeline; null
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

    const { openDialog } = useDialog();
    const doCancel = () =>
      cancel(data.task.id).catch(reportErrorAs("Couldn't cancel the task"));
    const doResume = (step: boolean) =>
      resume({ variables: { input: { task: data.task.id, step } } }).catch(
        reportErrorAs(step ? "Couldn't step the task" : "Couldn't resume the task"),
      );
    const primary = isResumable(data.task)
      ? "resume"
      : isCancelable(data.task)
        ? "cancel"
        : "rerun";

    // The lane and its details over the stage's foot: folded or not, remembered.
    const [recordOpen, setRecordOpenState] = useState(
      () => readPref(RECORD_OPEN_KEY) !== "false",
    );
    const setRecordOpen = (next: boolean) => {
      setRecordOpenState(next);
      writePref(RECORD_OPEN_KEY, String(next));
    };

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
    const scene = useTaskActionBlok(run, ComponentContext.Scene);
    const { view, setView } = useTaskView(
      data.task.action.id,
      run || runError
        ? panel != null || scene != null || !data.task.isDone
        : null,
    );
    // Live with a blok of the action's own is that blok alone, under the status
    // line: its panel, else its Space. It draws the open ask itself when it
    // has an `<ask />`, else the ask cards stay above it.
    const liveBlok = panel ?? scene;
    const blokOnly = view === "live" && liveBlok != null;
    const sceneAsks = useMemo(
      () => (scene ? drawsAsk(scene.actionBlok) : false),
      [scene],
    );
    const panelAsks = useMemo(
      () => (panel ? drawsAsk(panel.actionBlok) : false),
      [panel],
    );

    const stage = useStagePrefs(data.task.isDone);
    const tabs = stageTabs(data.task, scene != null);
    const stageTab =
      stage.tab && tabs.includes(stage.tab) ? stage.tab : tabs[0];
    const stageOpen = view === "timeline" && stage.open && stageTab != null;

    // One ask, once: where what is on screen draws it, there are no cards.
    const spaceShown =
      stageTab === "space" && (view === "live" ? !blokOnly : stageOpen);
    const askInView = blokOnly
      ? panel
        ? panelAsks
        : sceneAsks
      : spaceShown && sceneAsks;

    const live = blokOnly ? (
      panel ? (
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          <TaskRunPanel taskId={data.task.id} showAsk={panelAsks} />
        </div>
      ) : (
        <div className="min-h-0 flex-1">
          <TaskRunScene taskId={data.task.id} />
        </div>
      )
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
              showAsk={sceneAsks}
            />
          </div>
        )}
      </div>
    );

    const body = (
      <div className="flex min-h-0 w-full flex-col gap-4 p-4">
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
            {view && (
              <PageActionGroup alwaysShow className="gap-0">
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
            {/* The one thing most likely wanted now; the rest is under More.
                A paused task waits for a person — a pause someone asked for,
                or a workflow that held itself for a decision. */}
            {primary === "resume" && (
              <PageAction alwaysShow size="sm" onClick={() => doResume(false)}>
                Resume
              </PageAction>
            )}
            {primary === "cancel" && (
              <PageAction
                alwaysShow
                size="sm"
                variant="destructive"
                onClick={doCancel}
              >
                Cancel
              </PageAction>
            )}
            {primary === "rerun" && (
              <PageAction alwaysShow size="sm" onClick={() => reassign()}>
                Rerun
              </PageAction>
            )}
            <PageActionGroup alwaysShow>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  className="px-2"
                  title="More"
                  aria-label="More"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {isPausable(data.task) && (
                  <DropdownMenuItem
                    onClick={() =>
                      pause({
                        variables: { input: { task: data.task.id } },
                      }).catch(reportErrorAs("Couldn't pause the task"))
                    }
                  >
                    Pause
                  </DropdownMenuItem>
                )}
                {isResumable(data.task) && (
                  <DropdownMenuItem onClick={() => doResume(true)}>
                    Step to next breakpoint
                  </DropdownMenuItem>
                )}
                {primary !== "cancel" && isCancelable(data.task) && (
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={doCancel}
                  >
                    Cancel
                  </DropdownMenuItem>
                )}
                {isInterruptable(data.task) && (
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={() =>
                      interrupt({
                        variables: { input: { task: data.task.id } },
                      }).catch(reportErrorAs("Couldn't interrupt the task"))
                    }
                  >
                    Interrupt
                  </DropdownMenuItem>
                )}
                {primary !== "rerun" && (
                  <DropdownMenuItem onClick={() => reassign()}>
                    Rerun
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => reassign({ capture: true })}>
                  Rerun with Capture
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {view === "timeline" && tabs.length > 0 && (
                  <DropdownMenuItem onClick={() => stage.setOpen(!stageOpen)}>
                    {stageOpen ? "Hide the stage" : "Show the stage"}
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem asChild>
                  <RekuestTask.DetailLink object={data.task} subroute="log">
                    Logs
                  </RekuestTask.DetailLink>
                </DropdownMenuItem>
                {data.task.parent && (
                  <DropdownMenuItem asChild>
                    <RekuestTask.DetailLink
                      object={data.task.parent}
                      subroute="log"
                    >
                      Parent Logs
                    </RekuestTask.DetailLink>
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  onClick={() =>
                    openDialog("reportbug", { taskId: data.task.id })
                  }
                >
                  Report Bug
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            </PageActionGroup>
          </>
        }
      >
        <div className="flex h-full w-full flex-col">
          <ChildTaskUpdater taskId={data.task.id} />
          <div className="shrink-0">
            <TaskStatusHero task={data.task} />
          </div>
          {holds.length > 0 && closed !== "ended" && !askInView && (
            <div className="flex shrink-0 flex-col gap-2 px-4 pt-3">
              {holds.map((hold) => (
                <HoldCard key={hold.task} hold={hold} closed={closed} />
              ))}
            </div>
          )}
          {view == null ? null : view === "live" ? (
            live
          ) : stageOpen ? (
            // The stage takes the whole page; the record lies over its foot
            // and folds away to its handle.
            <div className="relative min-h-0 flex-1">
              <TaskStage
                task={data.task}
                tabs={tabs}
                tab={stageTab}
                onTab={stage.setTab}
                focusTime={selection ? selectionTime(resolved) : null}
                showAsk={sceneAsks}
                selectedYield={
                  resolved?.kind === "event" && isYieldLike(resolved.event)
                    ? resolved.event
                    : null
                }
              />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex max-h-[60%] flex-col">
                <button
                  type="button"
                  aria-expanded={recordOpen}
                  onClick={() => setRecordOpen(!recordOpen)}
                  className="pointer-events-auto ml-4 flex items-center gap-1.5 self-start rounded-t-md border border-b-0 bg-background/90 px-2.5 py-1 text-xs text-muted-foreground backdrop-blur hover:text-foreground"
                >
                  {recordOpen ? (
                    <ChevronDown className="h-3.5 w-3.5" />
                  ) : (
                    <ChevronUp className="h-3.5 w-3.5" />
                  )}
                  Timeline
                </button>
                {recordOpen && (
                  <div className="pointer-events-auto min-h-0 flex-1 overflow-y-auto border-t bg-background/90 backdrop-blur">
                    {body}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="min-h-0 flex-1 overflow-y-auto">{body}</div>
          )}
        </div>
      </RekuestTask.ModelPage>
    );
  },
);


export default TPage;
