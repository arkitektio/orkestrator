import { QueryError } from "@/core/layout/fallbacks/ErrorPage";
import {
  usePythonRunForTaskQuery,
  useWatchPythonRunSubscription,
  useWatchPythonRunsSubscription,
} from "../api/graphql";
import { PythonRunTrace } from "../python/PythonRunTrace";

/**
 * The Python run of a task whose implementation is a deployed (or bare)
 * `run_python_flow`. The agent opens the run as the task starts, so a fresh
 * task may not have one yet: the run starting (`pythonRuns`) re-reads it. Once
 * there, its status changes (`pythonRun(id)`) re-read the trace.
 */
export const TaskPythonRun = ({ taskId }: { taskId: string }) => {
  const { data, error, refetch } = usePythonRunForTaskQuery({
    variables: { id: taskId },
  });
  const run = data?.pythonRunForTask;

  useWatchPythonRunsSubscription({
    skip: !!run,
    onData: ({ data: change }) => {
      if (change.data?.pythonRuns.create?.taskId === taskId) void refetch();
    },
  });
  useWatchPythonRunSubscription({
    variables: { id: run?.id ?? "" },
    skip: !run,
    onData: () => void refetch(),
  });

  if (run) return <PythonRunTrace run={run} />;
  if (error) {
    return <QueryError error={error} onRetry={() => refetch()} resource="Python run" />;
  }
  return null;
};
