/**
 * What a task said, as its one summary line.
 *
 * The server keeps the latest message any event carried (`latest_message`),
 * including the line the agent runtime writes for itself before the action
 * runs ("Queued for running", arkitekt-runtime `on_assign`). Nothing said
 * after it, it stays the task's message to the end, so a finished run read
 * "Queued for running". That line is the runtime's, not the action's: it is
 * not what the task said. The runtime no longer sends it, but tasks already
 * stored and agents on an older runtime still carry it.
 *
 * Only the summary skips it; the event log shows every event as it was.
 */
const RUNTIME_LINES = new Set(["Queued for running"]);

export const saidByTask = (task: {
  latestMessage?: string | null;
  events?: readonly { message?: string | null }[];
}): string | undefined => {
  // The server's latest report; the newest event that said something for a
  // shape that does not select it.
  const said = task.latestMessage ?? task.events?.find((e) => e.message)?.message;
  return said && !RUNTIME_LINES.has(said) ? said : undefined;
};
