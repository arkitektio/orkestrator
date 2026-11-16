/**
 * What a state choice widget offers: the entries of a list in an agent's
 * state, read into options. Pure, so the reading rules are testable without
 * a form or a live state.
 */

export type StateChoiceAccessor = {
  optionKey: string;
  path?: string | null;
};

export type StateChoiceOption = {
  /** What tells one choice from another, and what the field shows as selected. */
  key: string;
  label: string;
  description?: string;
  /** What the port gets: the entry's value as the state holds it (a number stays a number). */
  value: unknown;
};

/** `a.b.c` and the JSON pointer `/a/b/c` both name the same place. */
export const pathSegments = (path: string | null | undefined): string[] => {
  if (!path) return [];
  const pointer = path.startsWith("/");
  return path
    .split(pointer ? "/" : ".")
    .filter((segment) => segment !== "")
    .map((segment) => (pointer ? segment.replace(/~1/g, "/").replace(/~0/g, "~") : segment));
};

/** The value at `segments` inside `root`; undefined when a step is missing. */
export const readPath = (root: unknown, segments: readonly string[]): unknown => {
  let current = root;
  for (const segment of segments) {
    if (current === null || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[segment];
  }
  return current;
};

const stable = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(stable);
  if (value !== null && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return Object.fromEntries(
      Object.keys(record)
        .sort()
        .filter((key) => record[key] !== undefined)
        .map((key) => [key, stable(record[key])]),
    );
  }
  return value;
};

/**
 * One string per distinct value: `1` and `"1"` share a key (a form may hold
 * either for the same choice), two objects share one when they hold the same
 * things in any key order. Undefined for "nothing chosen".
 */
export const choiceKey = (value: unknown): string | undefined => {
  if (value === undefined || value === null) return undefined;
  if (typeof value === "object") return JSON.stringify(stable(value));
  return String(value);
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);

const firstPresent = (...values: unknown[]): unknown =>
  values.find((value) => value !== undefined && value !== null && value !== "");

const text = (value: unknown): string | undefined =>
  value === undefined || value === null || typeof value === "object" ? undefined : String(value);

/**
 * The options a state list offers.
 *
 * Each accessor (`VALUE`, `LABEL`, `DESCRIPTION`) points into an entry; an
 * accessor without a path means the entry itself. Without a `VALUE` accessor a
 * port that takes an object (`wholeEntry`) gets the entry, any other port the
 * entry's `value`, `id`, `key` or, last, its name.
 */
export const stateChoiceOptions = (
  entries: readonly unknown[],
  accessors: readonly (StateChoiceAccessor | null | undefined)[] | null | undefined,
  wholeEntry: boolean,
): StateChoiceOption[] => {
  const accessor = (optionKey: string) =>
    accessors?.find((candidate) => candidate && String(candidate.optionKey) === optionKey);
  const valueAt = accessor("VALUE");
  const labelAt = accessor("LABEL");
  const descriptionAt = accessor("DESCRIPTION");

  const seen = new Set<string>();
  const options: StateChoiceOption[] = [];
  entries.forEach((entry, index) => {
    const record = isRecord(entry) ? entry : undefined;
    const value = valueAt
      ? readPath(entry, pathSegments(valueAt.path))
      : record && !wholeEntry
        ? firstPresent(record.value, record.id, record.key, record.name, record.label)
        : entry;
    const key = choiceKey(value);
    // An entry with nothing to send, or one already offered, is no choice.
    if (key === undefined || seen.has(key)) return;
    seen.add(key);

    const label =
      text(labelAt ? readPath(entry, pathSegments(labelAt.path)) : undefined) ??
      text(record && firstPresent(record.name, record.label, record.key, record.id)) ??
      text(value) ??
      `Option ${index + 1}`;
    const description = text(
      descriptionAt ? readPath(entry, pathSegments(descriptionAt.path)) : record?.description,
    );
    options.push({ key, label, description, value });
  });
  return options;
};

/** The options whose label holds `term`; all of them for an empty term. */
export const filterChoices = (options: readonly StateChoiceOption[], term: string | undefined) => {
  const needle = term?.trim().toLowerCase();
  if (!needle) return [...options];
  return options.filter(
    (option) =>
      option.label.toLowerCase().includes(needle) ||
      option.description?.toLowerCase().includes(needle),
  );
};

/** What changes when the choices do, and only then: a live state patches far more often than its list changes. */
export const choicesSignature = (options: readonly StateChoiceOption[]) =>
  options.map((option) => `${option.key}\u0000${option.label}`).join("\u0001");
