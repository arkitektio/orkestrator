import { asDetailQueryRoute } from "@/app/routes/DetailQueryRoute";
import { Sidebars } from "@/components/layout/Sidebars";
import { Button } from "@/components/ui/button";
import { RekuestTask } from "@/linkers";
import {
  useCancelMutation,
  useDetailTaskQuery,
  useInterruptMutation,
} from "@/rekuest/api/graphql";
import { ChildTaskUpdater } from "@/rekuest/components/updaters/ChildTaskUpdater";
import { GanttTimeline } from "@/rekuest/components/timeline/GanttTimeline";
import Timestamp from "@/components/ui/timestamp";
import { useReassign } from "@/rekuest/hooks/useReassign";
import { isCancelable, isInterruptable } from "@/rekuest/lib/taskStatus";

/** Dependency→method gantt of a task's children (`tasks/:id/timeline`). */
export const TaskTimelinePage = asDetailQueryRoute(
  useDetailTaskQuery,
  ({ data, id }) => {
    const reassign = useReassign({ task: data.task });

    const [cancel] = useCancelMutation();
    const [interrupt] = useInterruptMutation();

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
        object={data.task}
        pageActions={
          <div className="flex gap-2">
            <Button
              variant={"outline"}
              size={"sm"}
              onClick={() => {
                reassign();
              }}
            >
              Rerun
            </Button>
            {isCancelable(data.task) && (
              <Button
                onClick={() =>
                  cancel({
                    variables: { input: { task: data.task.id } },
                  })
                }
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
          </div>
        }
        sidebars={
          <Sidebars>
            <Sidebars.Tab label="Knowledge">
              <RekuestTask.Knowledge object={data?.task} />
            </Sidebars.Tab>
          </Sidebars>
        }
      >
        <ChildTaskUpdater taskId={id} />
        <GanttTimeline task={data.task} />
      </RekuestTask.ModelPage>
    );
  }
);


export default TaskTimelinePage;
