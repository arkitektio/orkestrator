import type { Object } from "@/core/types";
import { useDetailTaskQuery } from "@/rekuest/api/graphql";
import { useEffect, useRef } from "react";
import { useRunForTaskQuery } from "../api/graphql";
import { PYTHON_RUNNER_INTERFACE } from "../python/deployments";
import { TrackFlow } from "../track/TrackFlow";
import { TaskPythonRun } from "./TaskPythonRun";

const RETRY_BASE_MS = 1000;
const RETRY_MAX_MS = 30_000;
const RETRY_MAX_ATTEMPTS = 6;

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

  // Retry with exponential backoff and a ceiling: a persistent error must not
  // become an unbounded 1 Hz refetch loop.
  const attemptsRef = useRef(0);
  useEffect(() => {
    if (!error) {
      attemptsRef.current = 0;
      return;
    }
    console.error(error);
    if (attemptsRef.current >= RETRY_MAX_ATTEMPTS) return;
    const delay = Math.min(RETRY_BASE_MS * 2 ** attemptsRef.current, RETRY_MAX_MS);
    attemptsRef.current += 1;
    const t = setTimeout(() => void refetch(), delay);
    return () => clearTimeout(t);
  }, [error, refetch]);

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
