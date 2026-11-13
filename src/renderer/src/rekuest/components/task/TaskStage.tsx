import { cn } from "@/core/util/utils";
import { PageSections } from "@/core/layout/PageSections";
import { DetailTaskFragment, TaskEventKind } from "@/rekuest/api/graphql";
import { TaskRunScene } from "@/rekuest/run/TaskRun";
import { LiveTicker } from "@/rekuest/components/spaces/task/LiveTicker";
import { TimeSlider } from "@/rekuest/components/spaces/task/panels/TimeSlider";
import {
  createSpaceViewStore,
  SpaceViewStoreContext,
} from "@/rekuest/components/spaces/task/store";
import { TaskTravel } from "@/rekuest/components/spaces/task/TaskRoom";
import { useEffect, useState } from "react";
import { TaskResultSection } from "./TaskEventLog";
import { LaneTaskEvent } from "./lane/selection";

export type StageTab = "flow" | "space" | "result";

const TAB_LABEL: Record<StageTab, string> = {
  flow: "Flow",
  space: "Space",
  result: "Result",
};

/**
 * The stage views this task has something for, in switcher order. `hasScene`:
 * the task's action declares a scene blok (its `<Space>`), drawn for the run.
 */
export const stageTabs = (task: DetailTaskFragment, hasScene = false): StageTab[] => {
  const tabs: StageTab[] = [];
  // fluss's runners: a graph flow, or a Python flow (deployed, or called bare).
  const runner = task.implementation?.higherOrderFor?.action?.key ?? task.implementation?.interface;
  if (runner === "run_flow" || runner === "run_python_flow") {
    tabs.push("flow");
  }
  // Only when its action draws the run in 3D: the action names its devices and their room.
  if (hasScene) {
    tabs.push("space");
  }
  if (
    task.action.returns.length > 0 &&
    task.events.some((e) => e.kind === TaskEventKind.Yield && e.returns != null)
  ) {
    tabs.push("result");
  }
  return tabs;
};

/**
 * The run in 3D, as its action's scene blok draws it: as it is while the task
 * is followed live and as it was at the slider's moment otherwise.
 * `focusTime` moves the slider to what the lane selected.
 */
const SpaceStage = (props: {
  task: DetailTaskFragment;
  focusTime: number | null;
  showAsk: boolean;
}) => {
  const { task, focusTime } = props;
  const [store] = useState(() => createSpaceViewStore(task));

  useEffect(() => {
    store.getState().refreshTask(task);
  }, [store, task]);

  useEffect(() => {
    if (focusTime != null) store.getState().selectTimepoint(focusTime);
  }, [store, focusTime]);

  return (
    <SpaceViewStoreContext.Provider value={store}>
      <LiveTicker />
      <div className="flex h-full min-h-0 flex-col">
        <div className="min-h-0 flex-1">
          <TaskTravel>
            <TaskRunScene taskId={task.id} showAsk={props.showAsk} />
          </TaskTravel>
        </div>
        <TimeSlider />
      </div>
    </SpaceViewStoreContext.Provider>
  );
};

/**
 * The big view above the lane: the fluss run for a flow task (drawn by fluss
 * through the `main` page-section slot), the run in 3D, or the result
 * large. Only the active view is mounted, so no canvas lives while it is
 * hidden.
 */
export const TaskStage = (props: {
  task: DetailTaskFragment;
  tabs: StageTab[];
  tab: StageTab;
  onTab: (tab: StageTab) => void;
  focusTime: number | null;
  selectedYield: LaneTaskEvent | null;
  /** Whether the Space's `<ask />` shows the run's open ask; off where the page shows a card for it. */
  showAsk?: boolean;
}) => {
  const { task, tabs, tab, onTab } = props;

  return (
    <div className="flex h-full min-h-0 flex-col">
      {tabs.length > 1 && (
        <div className="flex shrink-0 gap-0.5 self-start rounded-md border p-0.5 mx-2 my-1">
          {tabs.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => onTab(t)}
              className={cn(
                "rounded px-2 py-0.5 text-xs",
                t === tab
                  ? "bg-muted font-medium text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {TAB_LABEL[t]}
            </button>
          ))}
        </div>
      )}
      <div className="min-h-0 flex-1">
        {tab === "flow" && (
          <PageSections
            placement="main"
            identifier="@rekuest/task"
            object={{ id: task.id }}
          />
        )}
        {tab === "space" && (
          <SpaceStage task={task} focusTime={props.focusTime} showAsk={props.showAsk ?? true} />
        )}
        {tab === "result" && (
          <TaskResultSection
            task={task}
            event={props.selectedYield}
            className="h-full p-3"
          />
        )}
      </div>
    </div>
  );
};
