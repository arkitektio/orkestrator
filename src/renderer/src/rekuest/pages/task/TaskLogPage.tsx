import { asDetailQueryRoute } from "@/core/app/routes/DetailQueryRoute";
import { Sidebars } from "@/core/components/layout/Sidebars";
import { PageAction } from "@/core/components/ui/page-action";
import { RekuestTask } from "@/core/linkers";
import {
  useDetailTaskQuery,
  useInterruptMutation,
} from "@/rekuest/api/graphql";
import Timestamp from "@/core/components/ui/timestamp";
import { useCancelTask } from "../../hooks/useAssign";
import { useReassign } from "../../hooks/useReassign";
import { isCancelable, isInterruptable } from "../../lib/taskStatus";

/** Raw, copy-friendly event log of a task (`tasks/:id/log`). */
export const TPage = asDetailQueryRoute(
  useDetailTaskQuery,
  ({ data }) => {
    const reassign = useReassign({ task: data.task });

    const { cancel } = useCancelTask();
    const [interrupt] = useInterruptMutation();

    return (
      <RekuestTask.ModelPage
        title={`${data?.task?.action.name} — Log`}
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
                onClick={() => cancel(data.task.id)}
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
