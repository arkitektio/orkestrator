/**
 * One word for where a schedule or trigger stands, for cards and headers.
 * A schedule owns at most one open run: waiting for its slot (`notBefore`
 * in the future), or executing. With neither it is between runs.
 */
export type AutomationState = "paused" | "failing" | "waiting" | "running" | "idle";

export const scheduleState = (
  schedule: {
    enabled: boolean;
    consecutiveFailures: number;
    nextRun?: { notBefore?: string | null; isDone: boolean } | null;
  },
  now: number = Date.now(),
): AutomationState => {
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
}): AutomationState => {
  if (!trigger.enabled) return "paused";
  if (trigger.consecutiveFailures > 0) return "failing";
  return "waiting";
};

export const STATE_LABELS: Record<AutomationState, string> = {
  paused: "Paused",
  failing: "Failing",
  waiting: "Active",
  running: "Running",
  idle: "Active",
};
