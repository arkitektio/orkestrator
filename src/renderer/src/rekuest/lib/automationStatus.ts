/**
 * One word for where a schedule or trigger stands, for cards and headers.
 * A schedule owns at most one open run: waiting for its slot (`notBefore`
 * in the future), or executing. With neither it is between runs. A rule
 * that stopped by itself (its end passed, or its last allowed run is over)
 * has ended, whatever else is true of it.
 */
export type AutomationState = "ended" | "paused" | "failing" | "waiting" | "running" | "idle";

export const scheduleState = (
  schedule: {
    enabled: boolean;
    consecutiveFailures: number;
    exhausted?: boolean;
    nextRun?: { notBefore?: string | null; isDone: boolean } | null;
  },
  now: number = Date.now(),
): AutomationState => {
  if (schedule.exhausted) return "ended";
  if (!schedule.enabled) return "paused";
  if (schedule.consecutiveFailures > 0) return "failing";
  const run = schedule.nextRun;
  if (!run || run.isDone) return "idle";
  if (run.notBefore && new Date(run.notBefore).getTime() > now) return "waiting";
  return "running";
};

export const triggerState = (trigger: {
  enabled: boolean;
  consecutiveFailures: number;
  exhausted?: boolean;
}): AutomationState => {
  if (trigger.exhausted) return "ended";
  if (!trigger.enabled) return "paused";
  if (trigger.consecutiveFailures > 0) return "failing";
  return "waiting";
};

export const STATE_LABELS: Record<AutomationState, string> = {
  ended: "Ended",
  paused: "Paused",
  failing: "Failing",
  waiting: "Active",
  running: "Running",
  idle: "Active",
};
