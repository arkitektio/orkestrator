import type { ParquetQueryEngine } from "@/core/data/parquet/parquetEngine";
import { blockNnz, readSparseBlock, type SparseLayoutChoice } from "@/core/data/sparse/sparseReader";
import type { MikroClient } from "@/core/data/zarr/store/types";
import type { GridCellsLayerFragment, GridHeatmapLayerFragment } from "@/mikro/api/graphql";
import { cellsSql } from "@/mikro/lib/parquet/valuesSql";
import { openSparseLayout } from "@/mikro/lib/sparse/sparseSlice";
import type { WindowReader } from "@/mikro/lib/zarr/windowReader";
import { axisMapOf, emptyRaster, put, type AxisMap, type Raster } from "./gridModel";

/**
 * Reading a grid layer into a raster of its members.
 *
 * Every reader places the layer's positions through its `asAffine` -- which of
 * its axes is the grid's row axis and which the column axis -- so a long-form
 * table's `(cell, c)`, a matrix's `(gene, cell)` and an array's free axes all
 * land where the server says they do. Each refuses, in words, what would read
 * too much: a grid is a picture of members, not a download.
 */

/** Values read into one grid, at most. */
export const MAX_ELEMENTS = 32_000_000;
export const MAX_CELL_ROWS = 4_000_000;

export type GridWorld = { rowAxis: string; columnAxis: string | null };
export type GridRead = { raster: Raster; note: string | null };

type Placed = { row: AxisMap; col: AxisMap | null };

const placedOf = (affine: GridHeatmapLayerFragment["asAffine"], world: GridWorld): Placed => {
  const row = axisMapOf(affine, world.rowAxis);
  if (!row) throw new Error(`its placement says nothing about the rows ('${world.rowAxis}')`);
  const col = world.columnAxis ? axisMapOf(affine, world.columnAxis) : null;
  if (world.columnAxis && !col) throw new Error(`its placement says nothing about the columns ('${world.columnAxis}')`);
  return { row, col };
};

/** Member range of positions `[from, to)` through a map. */
const memberSpan = (map: AxisMap | null, to: number, from = 0) => {
  if (!map) return { first: 0, span: 1 };
  const a = map.scale * from + map.offset;
  const b = map.scale * (to - 1) + map.offset;
  return { first: Math.round(Math.min(a, b)), span: Math.round(Math.abs(b - a)) + 1 };
};

const member = (map: AxisMap | null, position: number) => (map ? Math.round(map.scale * position + map.offset) : 0);

// --- an array lens ----------------------------------------------------------

type ArrayLensLike = Extract<GridHeatmapLayerFragment["lens"], { __typename?: "ArrayLens" }>;

export const readArrayHeatmap = async (
  layer: GridHeatmapLayerFragment,
  lens: ArrayLensLike,
  world: GridWorld,
  reader: WindowReader,
): Promise<GridRead> => {
  const placed = placedOf(layer.asAffine, world);
  const dataset = lens.dataset;
  const level = [...dataset.dataArrays].sort((a, b) => a.level - b.level)[0];
  if (!level) throw new Error(`'${dataset.name}' holds no array to read`);
  const elements = lens.shape.reduce((a, b) => a * b, 1);
  if (elements > MAX_ELEMENTS) {
    throw new Error(`${elements.toLocaleString()} values is more than a grid reads (${MAX_ELEMENTS.toLocaleString()}); cut the lens smaller`);
  }
  const ranges = dataset.axisNames.map((axis) => {
    const slice = lens.slices.find((s) => s.axis === axis);
    return slice ? { start: slice.start ?? null, stop: slice.stop ?? null, step: slice.step ?? null } : null;
  });
  const read = await reader.read({ id: level.store.id, key: level.store.key }, ranges);
  const rowAxis = lens.axisNames.indexOf(placed.row.input);
  const colAxis = placed.col ? lens.axisNames.indexOf(placed.col.input) : -1;
  if (rowAxis < 0) throw new Error(`the lens has no axis '${placed.row.input}'`);
  const nRows = read.shape[rowAxis] ?? 1;
  const nCols = colAxis >= 0 ? (read.shape[colAxis] ?? 1) : 1;
  const rows = memberSpan(placed.row, nRows);
  const cols = memberSpan(placed.col, nCols);
  const raster = emptyRaster(rows.first, rows.span, cols.first, cols.span);
  // Every other axis is held to one position by the lens: index 0 of the read.
  for (let i = 0; i < nRows; i++) {
    for (let j = 0; j < nCols; j++) {
      const offset = i * read.strides[rowAxis] + (colAxis >= 0 ? j * read.strides[colAxis] : 0);
      put(raster, member(placed.row, i), member(placed.col, j), read.data[offset]);
    }
  }
  return { raster, note: raster.rowStep > 1 || raster.colStep > 1 ? "binned: each texel shows the largest of its members" : null };
};

// --- a sparse lens ----------------------------------------------------------

type SparseLensLike = Extract<GridHeatmapLayerFragment["lens"], { __typename?: "SparseLens" }>;

export const readSparseHeatmap = async (
  layer: GridHeatmapLayerFragment,
  lens: SparseLensLike,
  world: GridWorld,
  deps: { client: MikroClient; datalayer: string },
): Promise<GridRead> => {
  const placed = placedOf(layer.asAffine, world);
  const dataset = lens.sparseDataset;
  if (dataset.axisNames.length !== 2) {
    throw new Error(`'${dataset.name}' has ${dataset.axisNames.length} axes; a grid draws a matrix of two (a pinned slice of more is not drawn yet)`);
  }
  const shape = dataset.shape ?? [];
  // The layout indexed on the ROW axis reads a block of rows in one range; one
  // indexed on the column axis reads columns, which are transposed into place.
  const choices = dataset.arrays.flatMap((array) =>
    array.store.layouts
      .filter((layout) => layout.path === array.path && !layout.rangeReadable)
      .map((layout) => ({ array, layout })),
  );
  const rowIndex = dataset.axisNames.indexOf(placed.row.input);
  const chosen = choices.find((c) => c.layout.indexedAxis === rowIndex) ?? choices[0];
  if (!chosen) throw new Error(`'${dataset.name}' holds no layout a range can be read from`);
  const indexed = chosen.layout.indexedAxis;
  const other = 1 - indexed;
  const choice: SparseLayoutChoice = { store: chosen.array.store, layout: chosen.layout, indexedAxis: indexed, objectAxis: other };
  const handle = await openSparseLayout(deps.client, deps.datalayer, choice);

  const bound = (axis: number) => {
    const name = dataset.axisNames[axis];
    const window = (lens.windows ?? []).find((w) => w.axis === name);
    const n = shape[axis] ?? handle.indptr.length - 1;
    return { from: Math.max(0, Math.ceil(window?.min ?? 0)), to: Math.min(n, Math.floor(window?.max ?? n - 1) + 1), n };
  };
  const outer = bound(indexed);
  const inner = bound(other);
  const nnz = blockNnz(handle, outer.from, outer.to);
  if (nnz > MAX_ELEMENTS) {
    throw new Error(`${nnz.toLocaleString()} stored values is more than a grid reads (${MAX_ELEMENTS.toLocaleString()}); window the lens to fewer ${dataset.axisNames[indexed]}`);
  }
  const block = await readSparseBlock(handle, outer.from, outer.to);

  const indexedIsRow = dataset.axisNames[indexed] === placed.row.input;
  const rowMap = placed.row;
  const colMap = placed.col;
  const rowRange = indexedIsRow ? outer : inner;
  const colRange = indexedIsRow ? inner : outer;
  const rows = memberSpan(rowMap, rowRange.to, rowRange.from);
  const cols = memberSpan(colMap, colRange.to, colRange.from);
  const raster = emptyRaster(rows.first, rows.span, cols.first, cols.span);
  // A sparse matrix's absent entries are zeros, not gaps: the cells it spans start at 0.
  raster.values.fill(0);
  raster.lo = 0;
  raster.hi = 0;
  for (let k = 0; k < block.to - block.from; k++) {
    const position = block.from + k;
    for (let e = block.offsets[k]; e < block.offsets[k + 1]; e++) {
      const at = block.indices[e];
      if (at < inner.from || at >= inner.to) continue;
      const [r, c] = indexedIsRow ? [position, at] : [at, position];
      put(raster, member(rowMap, r), member(colMap, c), block.values[e]);
    }
  }
  return {
    raster,
    note: `${nnz.toLocaleString()} stored values${raster.rowStep > 1 || raster.colStep > 1 ? ", binned to the largest per texel" : ""}`,
  };
};

// --- a table's cells --------------------------------------------------------

export const readCells = async (layer: GridCellsLayerFragment, world: GridWorld, engine: ParquetQueryEngine): Promise<GridRead> => {
  const placed = placedOf(layer.asAffine, world);
  const filters = (layer.windowFilters ?? []).filter((f) => !(f.joinPath && f.joinPath.length > 0));
  const store = layer.tableDataset.store;
  const read = await engine.readColumnsTyped(
    [store],
    (urlOf) => cellsSql(urlOf(store.id), { row: placed.row.input, column: placed.col?.input ?? null, value: layer.valueColumn }, filters, MAX_CELL_ROWS + 1),
    ["r", "c", "v"],
  );
  if (!read) throw new Error("the read was cancelled");
  const r = read.r as ArrayLike<number>;
  const c = read.c as ArrayLike<number>;
  const v = read.v as ArrayLike<number>;
  let r0 = Infinity;
  let r1 = -Infinity;
  let c0 = Infinity;
  let c1 = -Infinity;
  const n = Math.min(r.length, MAX_CELL_ROWS);
  for (let i = 0; i < n; i++) {
    const row = member(placed.row, r[i]);
    const col = member(placed.col, c[i]);
    if (row < r0) r0 = row;
    if (row > r1) r1 = row;
    if (col < c0) c0 = col;
    if (col > c1) c1 = col;
  }
  if (!(r1 >= r0)) throw new Error("no row has a value in every column the grid reads");
  const raster = emptyRaster(r0, r1 - r0 + 1, c0, c1 - c0 + 1);
  for (let i = 0; i < n; i++) put(raster, member(placed.row, r[i]), member(placed.col, c[i]), v[i]);
  const skipped = (layer.windowFilters ?? []).length - filters.length;
  const notes = [
    r.length > MAX_CELL_ROWS ? `the first ${MAX_CELL_ROWS.toLocaleString()} rows` : null,
    skipped > 0 ? `${skipped} filter${skipped === 1 ? "" : "s"} through another table not applied` : null,
  ].filter(Boolean);
  return { raster, note: notes.length ? notes.join("; ") : null };
};
