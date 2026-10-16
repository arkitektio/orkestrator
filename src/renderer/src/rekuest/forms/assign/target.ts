/**
 * What an assign form runs: an action (any agent that provides it takes the
 * task) or one implementation (that agent, with its dependencies), optionally
 * within a resolution.
 */
export type AssignTarget =
  | { action: string; implementation?: never; resolution?: never }
  | { implementation: string; resolution?: string; action?: never };

/**
 * Starts following a run under its reference, before it is assigned, and
 * returns how to stop when the assign is refused. A smart-menu row passes the
 * tracker it would have used for a direct run, so a run that needed the form
 * still reaches the row's result sink and `onDone`.
 */
export type AssignTrack = (reference: string) => () => void;
