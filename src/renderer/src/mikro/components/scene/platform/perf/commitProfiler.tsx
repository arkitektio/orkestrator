import { Profiler, type ProfilerOnRenderCallback, type ReactNode } from "react";
import { perfMonitor } from "./perfMonitor";

/**
 * Attribution for long React commits: DevTools "[Violation] rAF handler took
 * Nms" lines blame react-dom's scheduler chunk, which says nothing about WHICH
 * subtree was expensive. Wrapping the scene's coarse subtrees names the
 * culprit in the same console. Only commits at or above the threshold log, so
 * the steady state stays silent; in production React's <Profiler> is a
 * pass-through with no measurement cost.
 *
 * While a perf recording is armed EVERY commit also goes to the recorder
 * (`perfMonitor.markCommit`): per-subtree totals, and commits of 1 ms or more
 * on the timeline, so a missed frame shows which subtree committed inside it.
 */
const LONG_COMMIT_MS = 40;

const onRender: ProfilerOnRenderCallback = (id, phase, actualDuration) => {
  perfMonitor.markCommit(id, phase, actualDuration); // no-op unless a perf recording is armed
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
