import { QueryError } from "@/core/layout/fallbacks/ErrorPage";
import { useEffect, useState } from "react";
import { PythonRunStatus, usePythonRunForTaskQuery } from "../api/graphql";
import { PythonRunTrace } from "../python/PythonRunTrace";

const RETRY_BASE_MS = 1000;
const RETRY_MAX_MS = 30_000;
const RETRY_MAX_ATTEMPTS = 6;
const RUNNING_POLL_MS = 5000;

/**
 * The Python run of a task whose implementation is a deployed (or bare)
 * `run_python_flow`. The agent opens the run as the task starts, so a fresh
 * task may not have one yet: retried with backoff, like `TaskFlow`. A run has
 * no event stream, so its status is re-read while it is running.
 */
export const TaskPythonRun = ({ taskId }: { taskId: string }) => {
  const { data, error, refetch, startPolling, stopPolling } = usePythonRunForTaskQuery({
    variables: { id: taskId },
  });

  const [attempts, setAttempts] = useState(0);
  useEffect(() => {
    if (!error || attempts >= RETRY_MAX_ATTEMPTS) return;
    const delay = Math.min(RETRY_BASE_MS * 2 ** attempts, RETRY_MAX_MS);
    const t = setTimeout(() => {
      setAttempts((n) => n + 1);
      void refetch();
    }, delay);
    return () => clearTimeout(t);
  }, [error, attempts, refetch]);

  const running = data?.pythonRunForTask.status === PythonRunStatus.Running;
  useEffect(() => {
    if (!running) return;
    startPolling(RUNNING_POLL_MS);
    return () => stopPolling();
  }, [running, startPolling, stopPolling]);

  if (data?.pythonRunForTask) return <PythonRunTrace run={data.pythonRunForTask} />;
  if (error && attempts >= RETRY_MAX_ATTEMPTS) {
    return <QueryError error={error} onRetry={() => refetch()} resource="Python run" />;
  }
  return null;
};
