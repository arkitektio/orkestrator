/** Retention choices offered in the picker; `null` keeps everything. */
export const RETENTION_CHOICES: readonly (number | null)[] = [null, 7, 30, 90, 180, 365, 730];

/** How long the server keeps points and segments, as words. */
export const retentionLabel = (days: number | null | undefined): string => {
  if (days == null) return "Forever";
  if (days % 365 === 0) return days === 365 ? "1 year" : `${days / 365} years`;
  return days === 1 ? "1 day" : `${days} days`;
};

/**
 * The picker's choices, with the server's current value added in order when
 * it is not one of them (set from a phone, say), so the select can show it.
 */
export const retentionChoices = (current: number | null | undefined): (number | null)[] => {
  if (current === undefined || RETENTION_CHOICES.includes(current)) return [...RETENTION_CHOICES];
  const days = RETENTION_CHOICES.filter((d): d is number => d != null);
  return [null, ...[...days, current as number].sort((a, b) => a - b)];
};

/** A select value for a retention (`"forever"` or the days), and back. */
export const retentionValue = (days: number | null | undefined) => (days == null ? "forever" : String(days));
export const retentionFromValue = (value: string): number | null => (value === "forever" ? null : Number(value));

/** A read's time: the time alone today, else the day and the time. */
export const formatAt = (iso: string, now = new Date()) => {
  const date = new Date(iso);
  const time = date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  if (date.toDateString() === now.toDateString()) return time;
  const day = date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: date.getFullYear() === now.getFullYear() ? undefined : "numeric",
  });
  return `${day} ${time}`;
};

/** The confirm word `deleteServerCopy` requires. */
export const DELETE_CONFIRM = "DELETE";
