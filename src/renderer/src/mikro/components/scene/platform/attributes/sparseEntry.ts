import type { AxisPosition, LensLookup } from "@/mikro/lib/lenses/lensSelection";

/**
 * The SPARSE arm of a picker entry, as the client holds it.
 *
 * On the wire a sparse colouring or rule names a sparse LENS — the selection
 * that pins one position on every axis the matrix identifies itself by. Nothing
 * here can draw from an id: the readers need the matrix and the position
 * (`sparseSource.read(dataset, at)`), and a picker edits a position, for which
 * no lens may exist yet. So an entry in the scene store carries both client
 * fields beside the wire ones:
 *
 *   wire → store   `hydrateSparseEntries` fills `dataset` and `at` from the
 *                  lens, through the session registry, where a layer enters
 *                  the store.
 *   store → wire   `platform/layerui/entryInputs.ts` turns them back into a
 *                  lens id at the mutation, and they never reach the server.
 *
 * `at` is ALWAYS sorted by axis. Entry identity (`entryKey`) and the data key
 * (`entryDataKeyOf`) both spell it out, so one order is what keeps a Save, and
 * the server's echo of it, from looking like a different entry and rebuilding
 * the LUT.
 */
export type SparsePosition = {
  /** The sparse dataset read, or null/undefined for a column or graph entry. */
  dataset?: string | null;
  /** One position along every axis the matrix identifies itself by. */
  at?: readonly AxisPosition[] | null;
};

type SparseEntryLike = { lens?: string | null } & SparsePosition;

/** `at` in the one order entries are keyed by. */
export const sortedAt = (at: readonly AxisPosition[]): AxisPosition[] =>
  [...at]
    .map(({ axis, value }) => ({ axis, value }))
    .sort((a, b) => (a.axis < b.axis ? -1 : a.axis > b.axis ? 1 : 0));

/**
 * One entry with its position filled in. The same object when it is not a
 * sparse entry, is already positioned, or names a lens nothing is known about
 * (it then round-trips by its id and draws nothing).
 */
export function hydrateSparseEntry<E extends SparseEntryLike>(
  entry: E,
  lookup: LensLookup,
): E & SparsePosition {
  if (!entry.lens || entry.dataset != null) return entry;
  const selection = lookup(entry.lens);
  if (!selection || selection.kind !== "sparse" || !selection.at) return entry;
  return { ...entry, dataset: selection.dataset, at: selection.at };
}

/** A whole picker. The same array when no entry changed. */
export function hydrateSparseEntries<E extends SparseEntryLike>(
  entries: readonly E[],
  lookup: LensLookup,
): readonly (E & SparsePosition)[] {
  let changed = false;
  const next = entries.map((entry) => {
    const hydrated = hydrateSparseEntry(entry, lookup);
    if (hydrated !== entry) changed = true;
    return hydrated;
  });
  return changed ? next : entries;
}

type EntryBearing = {
  colorBys?: readonly SparseEntryLike[] | null;
  filterBys?: readonly SparseEntryLike[] | null;
  labelRender?: {
    colorBys?: readonly SparseEntryLike[] | null;
    filterBys?: readonly SparseEntryLike[] | null;
  } | null;
};

const hydratePickers = <T extends { colorBys?: unknown; filterBys?: unknown }>(
  holder: T,
  lookup: LensLookup,
): T => {
  const source = holder as {
    colorBys?: readonly SparseEntryLike[] | null;
    filterBys?: readonly SparseEntryLike[] | null;
  };
  const colorBys = source.colorBys ? hydrateSparseEntries(source.colorBys, lookup) : source.colorBys;
  const filterBys = source.filterBys
    ? hydrateSparseEntries(source.filterBys, lookup)
    : source.filterBys;
  if (colorBys === source.colorBys && filterBys === source.filterBys) return holder;
  return { ...holder, colorBys, filterBys };
};

/**
 * A layer — or a patch to one — with every picker it carries hydrated: a mesh,
 * network or point layer's own, and a label layer's inside `labelRender`.
 * The same object when there was nothing to fill, which is every layer without
 * a sparse entry.
 */
export function hydrateLayerEntries<L extends object>(layer: L, lookup: LensLookup): L {
  const holder = layer as L & EntryBearing;
  let next: L & EntryBearing = hydratePickers(holder, lookup);
  if (next.labelRender) {
    const render = hydratePickers(next.labelRender, lookup);
    if (render !== next.labelRender) next = { ...next, labelRender: render };
  }
  return next;
}
