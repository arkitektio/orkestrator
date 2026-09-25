import { Profiler, type ProfilerOnRenderCallback, type ReactNode } from "react";

/**
 * Attribution for long React commits: DevTools "[Violation] rAF handler took
 * Nms" lines blame react-dom's scheduler chunk, which says nothing about WHICH
 * subtree was expensive. Wrapping the scene's coarse subtrees names the
 * culprit in the same console. Only commits at or above the threshold log, so
 * the steady state stays silent; in production React's <Profiler> is a
 * pass-through with no measurement cost.
 */
const LONG_COMMIT_MS = 40;

const onRender: ProfilerOnRenderCallback = (id, phase, actualDuration) => {
  if (actualDuration < LONG_COMMIT_MS) return;
  console.warn(
    `[scene-perf] React commit "${id}" (${phase}) took ${actualDuration.toFixed(0)} ms`,
  );
};

export const LongCommitProfiler = ({
  id,
  children,
}: {
  id: string;
  children: ReactNode;
}) => (
  <Profiler id={id} onRender={onRender}>
    {children}
  </Profiler>
);
