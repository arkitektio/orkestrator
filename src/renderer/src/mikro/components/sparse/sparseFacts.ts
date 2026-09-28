/**
 * The facts a sparse dataset page states about a matrix, computed from what the
 * server publishes — nothing here opens a store. Pure, so the card, the
 * overview and the palette display all say the same thing and it is testable
 * without a dataset.
 *
 * A sparse dataset is two enumerations (`axisNames`, in the order `shape` is
 * written) and one or more stored layouts, each indexing one axis. The array
 * names the layout it is by `path`; the store carries the layout's own facts.
 */

export type SparseLayoutFacts = {
  path: string;
  indexedAxis: number;
  nnz: number;
  dtype: string;
  /** The chunk length of each of `data`, `indices` and `indptr`, as JSON. */
  chunks?: unknown;
  rangeReadable: boolean;
};

export type SparseArrayFacts = {
  id: string;
  indexedAxis: number;
  indexedAxisName?: string | null;
  path: string;
  store: { layouts: readonly SparseLayoutFacts[] };
};

/**
 * `obs 2638 × var 1838`. The two lists are written in the same order, so they
 * pair by position; where the server gave one and not the other (a matrix
 * whose stores are not yet readable has names but no shape), the half that is
 * known is still stated rather than the line going blank.
 */
export const describeShape = (
  axisNames: readonly string[],
  shape: readonly number[],
): string => {
  const length = Math.max(axisNames.length, shape.length);
  if (length === 0) return "empty matrix";
  const parts: string[] = [];
  for (let index = 0; index < length; index += 1) {
    const name = axisNames[index];
    const extent = shape[index];
    if (name !== undefined && extent !== undefined) parts.push(`${name} ${extent}`);
    else if (name !== undefined) parts.push(name);
    else parts.push(String(extent));
  }
  return parts.join(" × ");
};

/** How many cells the dense matrix would hold; zero for a shapeless one. */
export const cellCount = (shape: readonly number[]): number =>
  shape.length === 0 ? 0 : shape.reduce((product, extent) => product * extent, 1);

/**
 * The store layout an array IS. By `path` first — that is the array's own
 * statement — and by the indexed axis when the paths disagree, which the
 * schema warns can happen where a description still says `layouts/csr_matrix`.
 */
export const layoutOfArray = <L extends SparseLayoutFacts>(
  array: { path: string; indexedAxis: number; store: { layouts: readonly L[] } },
): L | undefined =>
  array.store.layouts.find((layout) => layout.path === array.path) ??
  array.store.layouts.find((layout) => layout.indexedAxis === array.indexedAxis);

/**
 * The number of stored cells. Every layout of one dataset holds the same
 * matrix, so the first that resolves speaks for all; null when none does.
 */
export const nonZeroCount = (arrays: readonly SparseArrayFacts[]): number | null => {
  for (const array of arrays) {
    const layout = layoutOfArray(array);
    if (layout) return layout.nnz;
  }
  return null;
};

/** The fraction of cells that are stored, or null where there are no cells. */
export const density = (nnz: number, cells: number): number | null =>
  cells > 0 ? nnz / cells : null;

/**
 * A density as a percentage with as many digits as it needs to not read as
 * zero: `12%`, `3.4%`, `0.21%`, and `<0.01%` below the last of those — a
 * single-cell matrix in a million is still a matrix with a cell in it.
 */
export const formatDensity = (fraction: number): string => {
  const percent = fraction * 100;
  if (percent >= 10) return `${Math.round(percent)}%`;
  if (percent >= 1) return `${percent.toFixed(1)}%`;
  if (percent >= 0.01) return `${percent.toFixed(2)}%`;
  return "<0.01%";
};

/**
 * `data 65536 · indices 65536 · indptr 1024` out of the layout's `chunks`
 * JSON. The scalar is untyped (it is `JSON` in the schema), so anything that is
 * not an object of numbers is shown as it came rather than mis-read.
 */
export const describeChunks = (chunks: unknown): string => {
  if (chunks === null || chunks === undefined) return "";
  if (Array.isArray(chunks)) return chunks.map(String).join(" · ");
  if (typeof chunks === "object") {
    return Object.entries(chunks as Record<string, unknown>)
      .map(([name, value]) => `${name} ${Array.isArray(value) ? value.join("×") : String(value)}`)
      .join(" · ");
  }
  return String(chunks);
};

/**
 * What to call a matrix on a card, a title or a tab. `name` is required by the
 * schema but nothing stops a converter writing an empty one, and a card whose
 * only link is its name is then a card with nothing to click — which is how
 * this was found. So the title is never blank.
 */
export const sparseDatasetTitle = (name: string | null | undefined): string => {
  const trimmed = name?.trim() ?? "";
  return trimmed.length > 0 ? trimmed : "Unnamed sparse dataset";
};
