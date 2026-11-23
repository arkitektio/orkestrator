import { reportErrorAs } from "@/core/notify";
import { asDetailQueryRoute } from "@/core/layout/routes/DetailQueryRoute";
import { Sidebars } from "@/core/layout/Sidebars";
import { PageAction } from "@/core/ui/page-action";
import { RekuestTask } from "@/core/linkers";
import {
  useDetailTaskQuery,
} from "@/rekuest/api/graphql";
import Timestamp from "@/core/ui/timestamp";
import { useCancelTask } from "../../hooks/useAssign";
import { useTaskCalls } from "../../session/calls";
import { useReassign } from "../../hooks/useReassign";
import { isCancelable, isInterruptable } from "../../lib/taskStatus";
import { REKUEST_HELP } from "../../help";

/** Raw, copy-friendly event log of a task (`tasks/:id/log`). */
export const TPage = asDetailQueryRoute(
  useDetailTaskQuery,
  ({ data }) => {
    const reassign = useReassign({ task: data.task });

    const { cancel } = useCancelTask();
    const calls = useTaskCalls();

    return (
      <RekuestTask.ModelPage
        title={`${data?.task?.action.name} — Log`}
        help={REKUEST_HELP.taskLog}
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
                onClick={() => cancel(data.task.id).catch(reportErrorAs("Couldn't cancel the task"))}
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
                  calls
                    .control("INTERRUPT", data.task.id)
                    .catch(reportErrorAs("Couldn't interrupt the task"))
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
        <pre className="rounded rounded-md p-3 bg-card border border-border text-sm mb-4 overflow-x-auto">
          {data.task.events.map((event) => (
            <div key={event.id}>[<Timestamp date={event.createdAt} />] {event.kind}[{event.level}]: {event.message} {event.returns && JSON.stringify(event.returns)}</div>
          ))}
        </pre>

      </RekuestTask.ModelPage>
    );
  },
);


export default TPage;
