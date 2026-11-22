import type { Object } from "@/core/types";
import { useDetailTaskQuery } from "@/rekuest/api/graphql";
import { useRunForTaskQuery, useWatchRunsSubscription } from "../api/graphql";
import { PYTHON_RUNNER_INTERFACE } from "../python/deployments";
import { TrackFlow } from "../track/TrackFlow";
import { TaskPythonRun } from "./TaskPythonRun";

/** A task run by fluss's Python flow runner, deployed or called bare. */
const isPythonFlowTask = (task: {
  implementation?: { interface: string; higherOrderFor?: { action: { key: string } } | null } | null;
}) =>
  task.implementation?.interface === PYTHON_RUNNER_INTERFACE ||
  task.implementation?.higherOrderFor?.action.key === PYTHON_RUNNER_INTERFACE;

/**
 * Live flow view for a rekuest task fluss runs: fluss's `main` section on
 * `@rekuest/task` pages. Needs only the task's id. The task page has fetched
 * the task already, so which runner it is (a graph `run_flow` or a
 * `run_python_flow`) is read from the cache.
 */
export const TaskFlow = (props: { identifier: string; object: Object }) => {
  const { data } = useDetailTaskQuery({ variables: { id: props.object.id }, fetchPolicy: "cache-first" });
  if (!data?.task) return null;
  if (isPythonFlowTask(data.task)) return <TaskPythonRun taskId={props.object.id} />;
  return <TaskGraphFlow id={props.object.id} />;
};

const TaskGraphFlow = (props: { id: string }) => {
  const { data, error, refetch } = useRunForTaskQuery({
    variables: {
      id: props.id,
    },
  });

  // A fresh task may not have its run yet: the run starting for this task
  // (`runs` subscription) re-reads it, instead of retrying on a timer.
  useWatchRunsSubscription({
    skip: !!data?.runForTask,
    onData: ({ data: change }) => {
      if (change.data?.runs.create?.taskId === props.id) void refetch();
    },
  });

  return (
    <>
      {data?.runForTask && (
        <TrackFlow
          run={data.runForTask}
        />
      )}
      {error && <div>Error: {error.message}</div>}
    </>
  );
};
