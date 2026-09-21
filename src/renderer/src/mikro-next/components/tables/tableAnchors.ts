/**
 * Which of a table's coordinate anchors describe the rows on screen.
 *
 * A `CoordinateAnchor` on a table pins metadata to VALUES of its coordinate
 * columns, keyed by column name — `{t: 5}`, `{c: 0, t: 5}` — or to the whole
 * table when it names no column at all. The rule is the array's: an anchor
 * that omits a column is global along it. What differs is what "in view"
 * means. An array layer shows a slab, and a pin is met when the slider sits
 * on that index; a table shows a page of rows, and an anchor is in view when
 * at least one row on the page carries every value it pins.
 *
 * Pure, so the partition a page draws (the overlay pill, the row markers and
 * the unfolded panel all read the same one) is testable without a table.
 */

export type TablePin = { column: string; value: unknown };

export type TableAnchorLike = {
  id: string;
  coordinates: unknown;
  channelLabel?: { label: string } | null;
};

export type TableAnchorEntry<A extends TableAnchorLike> = {
  anchor: A;
  pins: TablePin[];
  /** Keys of the rows on the page this anchor pins; empty for a whole-table anchor. */
  rowKeys: string[];
};

export type TableAnchorPartition<A extends TableAnchorLike> = {
  inView: TableAnchorEntry<A>[];
  outOfView: { anchor: A; pins: TablePin[] }[];
};

/**
 * The pins an anchor's `coordinates` JSON names. Anything that is not a plain
 * object pins nothing (global); an entry whose value is null is treated as
 * omitted rather than as "the null value", which is the array's reading too.
 */
export const readTablePins = (coordinates: unknown): TablePin[] => {
  if (!coordinates || typeof coordinates !== "object" || Array.isArray(coordinates)) {
    return [];
  }
  return Object.entries(coordinates as Record<string, unknown>)
    .filter(([, value]) => value !== null && value !== undefined)
    .map(([column, value]) => ({ column, value }));
};

const asNumber = (value: unknown): number | null => {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "bigint") return Number(value);
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

/**
 * Does a row's cell hold the value an anchor pins?
 *
 * The two sides arrive through different doors: a cell was read by DuckDB and
 * normalised (a safe BigInt becomes a number, a Date an ISO string), an anchor
 * value is whatever JSON was stored on the `Any` scalar. So `1`, `"1.0"` and
 * `1n` must agree, and they do — numerically, and EXACTLY: table coordinates
 * are indices and labels, and an epsilon would match neighbouring float
 * positions. The empty string is not zero. Booleans and ISO dates compare as
 * their text, so `true` meets `"true"` but not `1`.
 */
export const sameValue = (a: unknown, b: unknown): boolean => {
  if (a === b) return true;
  if (a === null || a === undefined || b === null || b === undefined) return false;
  const na = asNumber(a);
  const nb = asNumber(b);
  if (na !== null && nb !== null) return na === nb;
  if (typeof a === "object" || typeof b === "object") {
    return JSON.stringify(a) === JSON.stringify(b);
  }
  return String(a) === String(b);
};

const rowMeetsPins = (row: Record<string, unknown>, pins: readonly TablePin[]) =>
  pins.every((pin) => pin.column in row && sameValue(row[pin.column], pin.value));

/**
 * Split anchors into the ones some row on this page carries and the rest.
 *
 * `rows` is whatever the page shows — already searched, sorted and paged —
 * so the answer follows the search the way the array's follows the sliders.
 * A hidden column still matches: the record keeps its value, only the cell
 * is hidden. A whole-table anchor is in view on every page but names no
 * individual row; marking every row for it would be noise, so `rowKeys`
 * stays empty and only the overlay lists it.
 */
export const partitionTableAnchors = <A extends TableAnchorLike>(
  anchors: readonly A[],
  rows: readonly Record<string, unknown>[],
  keyOf: (row: Record<string, unknown>) => string,
): TableAnchorPartition<A> => {
  const inView: TableAnchorEntry<A>[] = [];
  const outOfView: { anchor: A; pins: TablePin[] }[] = [];
  for (const anchor of anchors) {
    const pins = readTablePins(anchor.coordinates);
    if (pins.length === 0) {
      inView.push({ anchor, pins, rowKeys: [] });
      continue;
    }
    const rowKeys = rows.filter((row) => rowMeetsPins(row, pins)).map(keyOf);
    if (rowKeys.length > 0) inView.push({ anchor, pins, rowKeys });
    else outOfView.push({ anchor, pins });
  }
  return { inView, outOfView };
};

const formatPinValue = (value: unknown) =>
  typeof value === "object" ? JSON.stringify(value) : String(value);

/**
 * `t=5, c=0` — or what a pin-less anchor is about. `whole` names the
 * container an anchor with no pins is global over: the same JSON means "the
 * whole table" on a table and "the whole matrix" on a sparse dataset, and the
 * caption should say which.
 */
export const describePins = (pins: readonly TablePin[], whole: string): string =>
  pins.length === 0
    ? whole
    : pins.map((pin) => `${pin.column}=${formatPinValue(pin.value)}`).join(", ");

export const describeTablePins = (pins: readonly TablePin[]): string =>
  describePins(pins, "whole table");

/** What a row marker's tooltip calls an anchor: its channel, else its pins. */
export const anchorCaption = (anchor: TableAnchorLike, pins: readonly TablePin[]) =>
  anchor.channelLabel?.label ?? describeTablePins(pins);
