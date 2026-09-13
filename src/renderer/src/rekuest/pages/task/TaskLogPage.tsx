import { asDetailQueryRoute } from "@/app/routes/DetailQueryRoute";
import { Sidebars } from "@/components/layout/Sidebars";
import { Button } from "@/components/ui/button";
import { RekuestTask } from "@/linkers";
import {
  useDetailTaskQuery,
  useInterruptMutation,
} from "@/rekuest/api/graphql";
import Timestamp from "@/components/ui/timestamp";
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
                onClick={() => cancel(data.task.id)}
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
        <pre className="rounded rounded-md p-3 bg-gray-900 border border-gray-800 text-sm mb-4 overflow-x-auto">
          {data.task.events.map((event) => (
            <div key={event.id}>[<Timestamp date={event.createdAt} />] {event.kind}[{event.level}]: {event.message} {event.returns && JSON.stringify(event.returns)}</div>
          ))}
        </pre>

      </RekuestTask.ModelPage>
    );
  },
);


export default TPage;
