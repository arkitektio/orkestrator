import { FiringOutcome } from "../api/graphql";

/**
 * A firing is one trigger meeting one signal. In words: it started a run,
 * the signal was turned away (conditions, debounce, a limit), or the run
 * could not be created.
 */
export const OUTCOME_LABELS: Record<FiringOutcome, string> = {
  [FiringOutcome.Fired]: "Fired",
  [FiringOutcome.Rejected]: "Rejected",
  [FiringOutcome.Failed]: "Failed",
};

export type FiringLike = {
  outcome: FiringOutcome;
  reason?: string | null;
  replay: boolean;
  task?: unknown | null;
};

export type FiringWords = {
  label: string;
  tone: "plain" | "muted" | "error";
  /** Why, when it started no run; "by hand" for a replay. */
  note: string | null;
};

export const describeFiring = (firing: FiringLike): FiringWords => {
  const byHand = firing.replay ? "by hand" : null;
  const note = [firing.reason, byHand].filter(Boolean).join(" · ") || null;
  switch (firing.outcome) {
    case FiringOutcome.Fired:
      // retention may have dropped the run it started
      return { label: OUTCOME_LABELS[firing.outcome], tone: firing.task ? "plain" : "muted", note };
    case FiringOutcome.Rejected:
      return { label: OUTCOME_LABELS[firing.outcome], tone: "muted", note };
    case FiringOutcome.Failed:
      return { label: OUTCOME_LABELS[firing.outcome], tone: "error", note };
  }
};
