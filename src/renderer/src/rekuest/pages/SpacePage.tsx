import { asDetailQueryRoute } from "@/core/layout/routes/DetailQueryRoute";
import { Sidebars } from "@/core/layout/Sidebars";
import { RekuestSpace } from "@/core/linkers";
import { PageAction } from "@/core/ui/page-action";
import { useSpaceQuery } from "@/rekuest/api/graphql";
import { BlokTravelProvider } from "@/rekuest/travel/context";
import { TravelBar } from "@/rekuest/travel/TravelBar";
import { useBlokTravel } from "@/rekuest/travel/useBlokTravel";
import { History, X } from "lucide-react";
import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { RekuestTask } from "@/core/linkers";
import { ComponentContext } from "@/rekuest/api/graphql";
import { SpaceScene } from "../space-scene";
import { REKUEST_HELP } from "../help";
import { SPACE_TASK_PARAM } from "../run/TaskRun";
import { useRunTask, useTaskActionBlok } from "../run/useRun";

/** What `?task=` draws: which run, and a way back to the room on its own. */
const RunChip = (props: { taskId: string; name?: string; missing: boolean; onClose: () => void }) => (
  <div
    className="pointer-events-auto absolute left-2 top-2 z-30 flex items-center gap-2 rounded-lg border bg-background/90 px-2 py-1 text-xs"
    onPointerDown={(event) => event.stopPropagation()}
  >
    <span className="text-muted-foreground">{props.missing ? "This run has no overlay" : "Showing the run"}</span>
    <RekuestTask.DetailLink object={{ id: props.taskId }} className="font-medium hover:underline">
      {props.name ?? props.taskId}
    </RekuestTask.DetailLink>
    <button type="button" onClick={props.onClose} title="Show the room on its own" className="text-muted-foreground hover:text-foreground">
      <X className="h-3.5 w-3.5" />
    </button>
  </div>
);

export const SpacePage = asDetailQueryRoute(useSpaceQuery, ({ data }) => {
  const travel = useBlokTravel();
  // `?task=`: a run of an action drawn into the room, its overlay over the placed agents.
  const [params, setParams] = useSearchParams();
  const taskId = params.get(SPACE_TASK_PARAM);
  // Followed here: the run may be someone else's, which no stream of ours carries.
  const { task } = useRunTask(taskId, { follow: true });
  const run = useTaskActionBlok(task, ComponentContext.Overlay);
  const closeRun = () =>
    setParams((current) => {
      const next = new URLSearchParams(current);
      next.delete(SPACE_TASK_PARAM);
      return next;
    });
  const agentNames = useMemo(
    () => new Map(data.space.placements.map((placement) => [placement.agent.id, placement.agent.name])),
    [data.space.placements],
  );

  return (
    <RekuestSpace.ModelPage
      title={data.space.name}
      help={REKUEST_HELP.space}
      object={data.space}
      pageActions={
        <>
          <PageAction
            size="sm"
            variant={travel.open ? "secondary" : "outline"}
            onClick={travel.toggle}
            title={travel.open ? "Back to live, and hide the history bar" : "Show this space as it was at an earlier time"}
          >
            <History className="h-4 w-4" />
            History
          </PageAction>
          <RekuestSpace.DetailLink object={data.space} subroute="edit">
            Edit
          </RekuestSpace.DetailLink>
          <RekuestSpace.ObjectButton alwaysShow object={data.space} />
        </>
      }
      sidebars={
        <Sidebars>
          <Sidebars.Tab label="Knowledge">
            <RekuestSpace.Knowledge object={data?.space} />
          </Sidebars.Tab>
        </Sidebars>
      }
    >
      <div className="h-full min-h-[500px]">
        {/* Around the whole room: one clock for every device in it, and for the cards they open. */}
        <BlokTravelProvider source={travel.source}>
          <SpaceScene
            space={data.space}
            run={run}
            overlay={
              <>
                {taskId ? (
                  <RunChip taskId={taskId} name={task?.action.name} missing={Boolean(task) && !run} onClose={closeRun} />
                ) : null}
                {travel.open ? (
                  // Above the scene's own controls and notices, which hold the bottom corners.
                  <TravelBar
                    travel={travel}
                    names={agentNames}
                    className="pointer-events-auto absolute inset-x-2 bottom-12 z-30 mx-auto max-w-3xl"
                  />
                ) : null}
              </>
            }
          />
        </BlokTravelProvider>
      </div>
    </RekuestSpace.ModelPage>
  );
});


export default SpacePage;
