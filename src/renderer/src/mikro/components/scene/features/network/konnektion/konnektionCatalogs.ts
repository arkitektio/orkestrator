import * as THREE from "three";
import type { KonnektionManifest } from "./konnektionManifest";
import { rootLevel } from "./konnektionManifest";
import {
  toNumber,
  toNumberArray,
  toNumberOrNull,
  toTriple,
} from "@/mikro/components/scene/platform/parquet/rowValues";
import { octreeCellKey } from "../../../platform/parquet/mortonCell";
import { toWorldCells } from "../../../platform/lod/lodCatalog";

/**
 * The two catalogs, and the world-space index the planner works from.
 *
 * The same split fabriks makes, and for the same reason — they answer opposite
 * questions and a Parquet file has one schema:
 *
 *  - `catalog/cells.parquet` — the SPATIAL index, one row per (level, cell).
 *    Read once at mount; from it alone the planner decides which level to draw
 *    and which of its cells are in view, without opening a geometry file.
 *  - `catalog/objects.parquet` — the IDENTITY index, one row per object (an
 *    arbor, a vessel tree, one connectome component set). Loaded LAZILY:
 *    nothing on the first-render path needs it.
 *
 * Two columns here have no fabriks counterpart and both are worth knowing:
 *
 *  - **`ghost_count`.** Ghosts are counted separately from nodes because they
 *    are not data — they are copies of an endpoint owned by a neighbouring
 *    cell. Summing `node_count` across cells is the object's real node count;
 *    adding `ghost_count` would double-count every crossing edge's endpoint.
 *  - **`component_count`** on an object, which is how connectivity stays
 *    falsifiable at a single level — and a single level is the common case.
 */

/** `platform/parquet/mortonCell.ts`'s key, under this format's name. */
export const konnektionCellKey = octreeCellKey;

/** One row of the cell catalog, in the collection's own voxel space. */
export type KonnektionCellRow = {
  level: number;
  cell: number;
  /** Nodes this cell OWNS. Excludes ghosts — see the module docblock. */
  nodeCount: number;
  edgeCount: number;
  /** Copies of endpoints owned by neighbouring cells, stored at the TAIL of
   *  this cell's node array. */
  ghostCount: number;
  bboxMin: [number, number, number];
  bboxMax: [number, number, number];
  lodError: number;
  objectCount: number;
  /** Bit k set ⟺ the Morton child at octant k carries geometry. */
  childMask: number;
  /** Locator into the level's parts. Null means "fetch the part whole". */
  part: number | null;
  rowGroup: number | null;
  blobBytes: number | null;
};

/** A catalog row with the world-space quantities the planner actually uses. */
export type KonnektionCellEntry = KonnektionCellRow & {
  key: string;
  worldMin: [number, number, number];
  worldMax: [number, number, number];
  /** `lodError` scaled into world units; see `maxAxisScale`. */
  worldLodError: number;
};

export type KonnektionCellIndex = {
  cells: readonly KonnektionCellEntry[];
  byKey: ReadonlyMap<string, KonnektionCellEntry>;
  /** Cells grouped by level, so the planner can cost a whole level at once —
   *  which is how it chooses, konnektion being drawn one level at a time. */
  byLevel: ReadonlyMap<number, readonly KonnektionCellEntry[]>;
  /** Levels carrying geometry, ascending (0 = finest). */
  levels: readonly number[];
  /** The coarsest level with geometry — where level selection starts. */
  root: number;
};

export type KonnektionObjectEntry = {
  objectId: number;
  /** Dense 0-based rank — the LUT index, and what the segments carry. */
  ordinal: number;
  /**
   * The node the ancestor-closed pruning invariant is stated relative to. Null
   * for an object with no distinguished root — a connectome component rather
   * than a rooted tree — where connectivity is checked per component instead.
   */
  rootNodeId: number | null;
  /** How many connected pieces this object is in. */
  componentCount: number;
  bboxMin: [number, number, number];
  bboxMax: [number, number, number];
  nodeCount: number;
  edgeCount: number;
  /**
   * Morton codes of the cells holding a piece of this object.
   *
   * **The level is not recorded.** konnektion's writer flattens
   * `(level, cell)` pairs to bare codes (`build.py:_object_catalog`), so a code
   * here identifies a cell only once a level is fixed. Treat it as a candidate
   * set to intersect with the cells of the level being drawn — never as a
   * (level, cell) key.
   */
  cells: number[];
};

/**
 * The largest length among the matrix's basis vectors.
 *
 * An LOD error is a scalar, but the voxel→world map is anisotropic, so there is
 * no single "the" scale. The max is the conservative choice: it can only
 * over-refine, never under-refine, and under-refining is the visible failure.
 */

/**
 * Precompute world AABBs and world-space errors once per (collection, matrix).
 *
 * Doing the transform here rather than per plan is what lets the planner use
 * the real camera and the real frustum, and it costs one pass over the catalog
 * — repeated only when the layer matrix changes, which is a registration edit,
 * not a frame event.
 */
export function buildKonnektionCellIndex(
  rows: readonly KonnektionCellRow[],
  manifest: KonnektionManifest,
  voxelToWorld: THREE.Matrix4,
): KonnektionCellIndex {
  const cells: KonnektionCellEntry[] = toWorldCells(rows, voxelToWorld);

  const byKey = new Map(cells.map((entry) => [entry.key, entry]));
  const byLevel = new Map<number, KonnektionCellEntry[]>();
  for (const entry of cells) {
    const bucket = byLevel.get(entry.level);
    if (bucket) bucket.push(entry);
    else byLevel.set(entry.level, [entry]);
  }
  const levels = [...byLevel.keys()].sort((a, b) => a - b);

  let root = rootLevel(manifest);
  if (!byLevel.has(root) && levels.length > 0) {
    const coarsest = levels[levels.length - 1];
    console.warn(
      `[konnektion] no cells at level ${root}; treating level ${coarsest} as the coarsest instead.`,
    );
    root = coarsest;
  }

  return { cells, byKey, byLevel, levels, root };
}

/** The cell-catalog columns this reader needs. */
export const CELL_CATALOG_COLUMNS = [
  "level", "cell", "node_count", "edge_count", "ghost_count",
  "bbox_min_x", "bbox_min_y", "bbox_min_z",
  "bbox_max_x", "bbox_max_y", "bbox_max_z",
  "lod_error", "object_count", "child_mask",
  "part", "row_group", "blob_bytes",
];

/** The object-catalog columns this reader needs. */
export const OBJECT_CATALOG_COLUMNS = [
  "object_id", "ordinal", "root_node_id", "component_count",
  "bbox_min_x", "bbox_min_y", "bbox_min_z",
  "bbox_max_x", "bbox_max_y", "bbox_max_z",
  "node_count", "edge_count", "cells",
];

/** One raw cell-catalog row → the typed voxel-space shape. */
export function parseCellRow(row: Record<string, unknown>): KonnektionCellRow {
  return {
    level: toNumber(row.level, "level"),
    cell: toNumber(row.cell, "cell"),
    nodeCount: toNumber(row.node_count, "node_count"),
    edgeCount: toNumber(row.edge_count, "edge_count"),
    ghostCount: toNumber(row.ghost_count, "ghost_count"),
    bboxMin: toTriple(row, "bbox_min"),
    bboxMax: toTriple(row, "bbox_max"),
    lodError: toNumber(row.lod_error, "lod_error"),
    objectCount: toNumber(row.object_count, "object_count"),
    childMask: toNumber(row.child_mask, "child_mask"),
    // Nullable by schema: a built-but-unwritten collection has no locator, and
    // a hand-written manifest may omit it. Null means "read the part whole".
    part: toNumberOrNull(row.part),
    rowGroup: toNumberOrNull(row.row_group),
    blobBytes: toNumberOrNull(row.blob_bytes),
  };
}

/**
 * One raw object-catalog row → the typed shape.
 *
 * `cells` is a `list<int64>` of bare Morton codes — flatter than fabriks's
 * `list<struct<level, cell>>`, and lossily so. See `KonnektionObjectEntry.cells`.
 */
export function parseObjectRow(row: Record<string, unknown>): KonnektionObjectEntry {
  return {
    objectId: toNumber(row.object_id, "object_id"),
    ordinal: toNumber(row.ordinal, "ordinal"),
    // Null for an object with no distinguished root; not an error.
    rootNodeId: toNumberOrNull(row.root_node_id),
    componentCount: toNumber(row.component_count, "component_count"),
    bboxMin: toTriple(row, "bbox_min"),
    bboxMax: toTriple(row, "bbox_max"),
    nodeCount: toNumber(row.node_count, "node_count"),
    edgeCount: toNumber(row.edge_count, "edge_count"),
    cells: toNumberArray(row.cells, "cells"),
  };
}
