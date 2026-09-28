/**
 * When the agent island has something to say.
 *
 * Pure, and its own module, so the rule is testable without mounting anything.
 *
 * Two things are worth a row: this app is running work for someone else
 * (assignments), or it was supposed to be reachable and is not. Everything else
 * is silence — a permanent green "Agent online" row would be chrome for a state
 * that needs no attention, and the rail does not carry panels that have nothing
 * to show.
 *
 * A first, clean connection attempt has no code and no reason yet, so launching
 * the app does not flash a row before the socket opens.
 */
export const shouldShowAgentIsland = (state: {
  /** The build has no agent support at all. */
  disabled: boolean;
  /** The user has the agent switched on (`settings.startAgent`). */
  startAgent: boolean;
  connected: boolean;
  assignments: number;
  lastCode?: number;
  lastReason?: string;
}): boolean => {
  if (state.disabled || !state.startAgent) return false;
  if (state.assignments > 0) return true;
  return (
    !state.connected &&
    (state.lastCode !== undefined || state.lastReason !== undefined)
  );
};
