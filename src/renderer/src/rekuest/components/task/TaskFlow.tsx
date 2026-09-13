import { useRunForTaskQuery } from "@/reaktion/api/graphql";
import { TrackFlow } from "@/reaktion/track/TrackFlow";
import { DetailTaskFragment } from "@/rekuest/api/graphql";
import { useEffect, useRef } from "react";

const RETRY_BASE_MS = 1000;
const RETRY_MAX_MS = 30_000;
const RETRY_MAX_ATTEMPTS = 6;

/**
 * Live flow view for tasks whose implementation is a reaktion `run_flow`.
 * Kept in its own module so pages that never render flows don't pull in the
 * reaktion dependency.
 */
export const TaskFlow = (props: {
  id: string;
  task: DetailTaskFragment;
}) => {
  const { data, error, refetch } = useRunForTaskQuery({
    variables: {
      id: props.task.id,
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
          task={props.task}
        />
      )}
      {error && <div>Error: {error.message}</div>}
    </>
  );
};
