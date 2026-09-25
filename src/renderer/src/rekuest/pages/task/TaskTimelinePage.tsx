import { asDetailQueryRoute } from "@/core/app/routes/DetailQueryRoute";
import { Sidebars } from "@/core/components/layout/Sidebars";
import { PageAction } from "@/core/components/ui/page-action";
import { RekuestTask } from "@/core/linkers";
import {
  useCancelMutation,
  useDetailTaskQuery,
  useInterruptMutation,
} from "@/rekuest/api/graphql";
import { ChildTaskUpdater } from "@/rekuest/components/updaters/ChildTaskUpdater";
import { GanttTimeline } from "@/rekuest/components/timeline/GanttTimeline";
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
        title={data?.task?.action.name}
        object={data.task}
        pageActions={
          <>
            <PageAction
              size={"sm"}
              onClick={() => {
                reassign();
              }}
            >
              Rerun
            </PageAction>
            {isCancelable(data.task) && (
              <PageAction
                onClick={() =>
                  cancel({
                    variables: { input: { task: data.task.id } },
                  })
                }
                // Stopping a running task outranks starting another one.
                priority={20}
                variant={"destructive"}
                size={"sm"}
              >
                Cancel
              </PageAction>
            )}
            {isInterruptable(data.task) && (
              <PageAction
                onClick={() =>
                  interrupt({
                    variables: { input: { task: data.task.id } },
                  })
                }
                // Stopping a running task outranks starting another one.
                priority={20}
                variant={"destructive"}
                size={"sm"}
              >
                Interrupt
              </PageAction>
            )}
          </>
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
