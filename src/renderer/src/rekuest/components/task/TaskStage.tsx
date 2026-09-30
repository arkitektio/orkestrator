import { cn } from "@/core/util/utils";
import { PageSections } from "@/core/layout/PageSections";
import { DetailTaskFragment, TaskEventKind } from "@/rekuest/api/graphql";
import { TaskSpaceScene } from "@/rekuest/components/spaces/task/SpaceScene";
import { LiveTicker } from "@/rekuest/components/spaces/task/LiveTicker";
import { LiveStatusStrip } from "@/rekuest/components/spaces/task/panels/LiveStatusStrip";
import {
  createSpaceViewStore,
  SpaceViewStoreContext,
} from "@/rekuest/components/spaces/task/store";
import type {} from "@react-three/fiber";
import { useEffect, useState } from "react";
import { TaskResultSection } from "./TaskEventLog";
import { LaneTaskEvent } from "./lane/selection";

export type StageTab = "flow" | "space" | "result";

const TAB_LABEL: Record<StageTab, string> = {
  flow: "Flow",
  space: "Space",
  result: "Result",
};

/** The stage views this task has something for, in switcher order. */
export const stageTabs = (task: DetailTaskFragment): StageTab[] => {
  const tabs: StageTab[] = [];
  if (task.implementation?.higherOrderFor?.action?.key === "run_flow") {
    tabs.push("flow");
  }
  if (
    (task.children?.length ?? 0) > 0 ||
    (task.resolvedDependencies?.length ?? 0) > 0
  ) {
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
 * The 3D delegation space, following the task. `focusTime` scrubs it to what
 * the lane selected.
 */
const SpaceStage = (props: {
  task: DetailTaskFragment;
  focusTime: number | null;
}) => {
  const { task, focusTime } = props;
  const [store] = useState(() => createSpaceViewStore(task));

  useEffect(() => {
    store.getState().refreshTimeline(task);
  }, [store, task]);

  useEffect(() => {
    if (focusTime != null) store.getState().selectTimepoint(focusTime);
  }, [store, focusTime]);

  return (
    <SpaceViewStoreContext.Provider value={store}>
      <LiveTicker />
      <div className="flex h-full min-h-0 flex-col gap-1">
        <LiveStatusStrip />
        <div className="min-h-0 flex-1">
          <TaskSpaceScene />
        </div>
      </div>
    </SpaceViewStoreContext.Provider>
  );
};

/**
 * The big view above the lane: the fluss run for a flow task (drawn by fluss
 * through the `main` page-section slot), the delegation space, or the result
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
          <SpaceStage task={task} focusTime={props.focusTime} />
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
