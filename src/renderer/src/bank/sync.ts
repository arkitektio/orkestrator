/**
 * Whether a sync may run now, from the server's own budget: the earliest
 * allowed time and the syncs left today. Computed by the server on read, so
 * the button can say why it is off instead of failing.
 */
export const syncBudget = (
  entity: { nextSyncAllowedAt?: string | null; syncsRemainingToday?: number | null },
  now: number = Date.now(),
) => {
  const until = entity.nextSyncAllowedAt && new Date(entity.nextSyncAllowedAt).getTime() > now
    ? entity.nextSyncAllowedAt
    : null;
  const exhausted = entity.syncsRemainingToday === 0;
  const blocked = !!until || exhausted;
  const at = until ? new Date(until).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" }) : null;
  const title = blocked
    ? at
      ? `Next sync allowed at ${at}`
      : "No syncs left today"
    : entity.syncsRemainingToday != null
      ? `${entity.syncsRemainingToday} sync${entity.syncsRemainingToday === 1 ? "" : "s"} left today`
      : "Sync now";
  return { blocked, until, title, remaining: entity.syncsRemainingToday ?? null };
};
