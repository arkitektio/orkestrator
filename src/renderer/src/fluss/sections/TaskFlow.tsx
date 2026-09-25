import type { Object } from "@/core/types";
import { useEffect, useRef } from "react";
import { useRunForTaskQuery } from "../api/graphql";
import { TrackFlow } from "../track/TrackFlow";

const RETRY_BASE_MS = 1000;
const RETRY_MAX_MS = 30_000;
const RETRY_MAX_ATTEMPTS = 6;

/**
 * Live flow view for a rekuest task whose implementation is a fluss
 * `run_flow`: fluss's `main` section on `@rekuest/task` pages. Needs only the
 * task's id; the run is fluss's own to look up.
 */
export const TaskFlow = (props: { identifier: string; object: Object }) => {
  const { data, error, refetch } = useRunForTaskQuery({
    variables: {
      id: props.object.id,
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
