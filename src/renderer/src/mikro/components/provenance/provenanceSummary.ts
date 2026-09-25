/**
 * Saying what a provenance entry actually DID, in words.
 *
 * The raw entry is a kind plus a list of field changes, which a reader has to
 * assemble into a sentence themselves. These do the assembling, and they are
 * pure so the phrasing is pinned by tests rather than by eye.
 */

/** Human-facing name for a changed field. Unknown fields pass through. */
const FIELD_LABELS: Record<string, string> = {
  name: "name",
  description: "description",
};

const labelFor = (field: string): string => FIELD_LABELS[field] ?? field;

/**
 * "name", "name and description", "name, description and 2 more" — an English
 * list, truncated once it stops being readable.
 *
 * Two is the cutoff because the whole point is a glanceable phrase: past that
 * the changes are worth reading individually, and the rows below say them.
 */
export const summarizeFields = (fields: readonly string[]): string => {
  const labels = fields.map(labelFor);
  if (labels.length === 0) return "";
  if (labels.length === 1) return labels[0];
  if (labels.length === 2) return `${labels[0]} and ${labels[1]}`;
  return `${labels[0]}, ${labels[1]} and ${labels.length - 2} more`;
};

/**
 * How a change reads on its own: setting a field that was empty is not the same
 * act as rewriting one, and clearing it is a third. Callers render the old and
 * new values themselves; this only names which of the three happened.
 */
export type ChangeShape = "set" | "changed" | "cleared";

export const changeShape = (
  oldValue: string | null | undefined,
  newValue: string | null | undefined,
): ChangeShape => {
  const had = Boolean(oldValue?.trim());
  const has = Boolean(newValue?.trim());
  if (!had && has) return "set";
  if (had && !has) return "cleared";
  return "changed";
};
