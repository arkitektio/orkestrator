/**
 * A point layer's data: positions once, values per colouring.
 *
 * The split this module exists for is the same one the label LUT is built on, and it matters
 * more here. Positions come out of a parquet column and never change; values change every time
 * a gene or a column is picked. Reading them together would re-scan the table on every switch.
 *
 * Positions are read through `readPointPositions`, which is columnar: one scan, one typed array
 * per column, no JS object per row. The row path would allocate about seven objects per row per
 * column, which at a million points is the difference between a pause and a stall.
 */
import type { AttributeLookupEngine } from "@/mikro/lib/attributes/lookupEngine";
import type { ParquetStoreLike } from "@/mikro/lib/attributes/attributeTypes";
import { readPointPositions } from "@/mikro/lib/attributes/columnarReads";
import type { ColumnLutEntryColorBy } from "../../platform/attributes/columnLut";
import { valueWindowOf } from "../../platform/attributes/valueWindow";
import { resolveTimeline } from "../../platform/model/timeline";

/**
 * The byte budget for one point layer's GPU-resident data.
 *
 * Per point: position `xy` f32 (8 B) + value f32 (4 B) = 12 B, so this is about 1.4 M points.
 * Stated the way `labelColorLut.ts` states its own — a cap and a LOUD one, because silently
 * drawing a subset of a point cloud misrepresents density, which is usually the thing being
 * looked at.
 *
 * It bounds MEMORY, not draw calls. There is no level of detail here to fall back on: the mesh
 * planner handles budget pressure by substituting pre-authored coarser geometry, and a point set
 * has none, so aggregation would have to be invented rather than reached for.
 */
export const POINT_MAX_BYTES = 16 * 1024 * 1024;
/**
 * Position `xy` f32 (8 B) + value f32 (4 B). A timed table adds a timeline-index
 * f32 per point, which `bytesEachFor` accounts for — the budget refusal quotes a
 * real number or it is not a budget.
 */
export const POINT_BYTES_EACH = 12;
/** With a time column each point carries one more f32 (its timeline index). */
export const POINT_TIME_BYTES_EACH = 4;
export const bytesEachFor = (timed: boolean): number =>
  POINT_BYTES_EACH + (timed ? POINT_TIME_BYTES_EACH : 0);
export const POINT_MAX_COUNT = Math.floor(POINT_MAX_BYTES / POINT_BYTES_EACH);

export type PointGeometry = {
  /** Interleaved xy (and z when the table declares one), ready for a storage buffer. */
  positions: Float32Array;
  /** How many components each point occupies in `positions`. */
  stride: 2 | 3;
  count: number;
  /** `objectId -> instance index`, so a value keyed by id finds its point. */
  slotOf: (objectId: number) => number;
  /**
   * Per-point TIMELINE INDEX, parallel to `positions`. Null when the table
   * declares no time column — which is the common case, and the one where the
   * cull pass must behave exactly as it always did.
   *
   * Indices rather than raw t, so this layer's `t` scrubber is the same scrubber
   * an image's t axis drives. See `platform/model/timeline.ts`.
   */
  times: Float32Array | null;
  /** The distinct times observed, ascending. Null with no time column. */
  timeline: Float64Array | null;
};

export type PointColumns = {
  key: string;
  x: string;
  y: string;
  z?: string | null;
  /** The time column, if the table declares one. Read in the same scan. */
  t?: string | null;
};

/**
 * Read every point's position, once.
 *
 * Returns null when the read cannot be answered columnwise — the caller refuses rather than
 * falling back to the row path, whose cost is the reason this exists.
 */
export const loadPointGeometry = async (
  engine: AttributeLookupEngine,
  store: ParquetStoreLike,
  columns: PointColumns,
): Promise<PointGeometry | { error: string } | null> => {
  const read = await readPointPositions(engine, store, columns);
  if (!read) return null;

  const count = read.count;
  const bytesEach = bytesEachFor(read.t !== null);
  if (count * bytesEach > POINT_MAX_BYTES) {
    return {
      error:
        `this table holds ${count.toLocaleString()} points, which is ${Math.round((count * bytesEach) / 1e6)} MB of positions and values ` +
        `against a budget of ${Math.round(POINT_MAX_BYTES / 1e6)} MB — no points are drawn. Drawing a subset instead would misrepresent the density.`,
    };
  }

  const stride: 2 | 3 = read.z ? 3 : 2;
  const positions = new Float32Array(count * stride);
  for (let index = 0; index < count; index += 1) {
    positions[index * stride] = read.x[index];
    positions[index * stride + 1] = read.y[index];
    if (read.z) positions[index * stride + 2] = read.z[index];
  }

  // Built once, because positions are. A colour change reuses it rather than rebuilding the
  // mapping it needs to scatter into.
  const slots = new Map<number, number>();
  for (let index = 0; index < count; index += 1) slots.set(read.ids[index], index);

  // Resolved in the same pass as the positions, from the same scan, so the two are
  // structurally aligned rather than aligned by coincidence.
  const resolved = resolveTimeline(read.t);

  return {
    positions,
    stride,
    count,
    slotOf: (objectId) => slots.get(objectId) ?? -1,
    times: resolved?.rowIndices ?? null,
    timeline: resolved?.timeline ?? null,
  };
};

export type PointValues = {
  /** One value per point, aligned to the instance index. */
  values: Float32Array;
  /** The range the values span — the shader's `uValueMin`/`uValueMax`. */
  valueMin: number;
  valueMax: number;
};

/** Every point drawn flat: no colouring picked. */
export const flatValues = (count: number): PointValues => ({
  values: new Float32Array(count),
  valueMin: 0,
  valueMax: 1,
});

/**
 * Scatter a colouring's values onto the points.
 *
 * `byId` is whatever the colouring resolved to — a table column or one slice of a sparse
 * matrix. This module does not care which: both arrive as `objectId -> value`, which is the
 * whole reason the sparse work slotted in without a second painter.
 *
 * A point the colouring says nothing about takes the range's floor rather than being dropped:
 * for a sparse slice that IS its value (absent means zero), and for a column it is the honest
 * reading of "no row", since hiding it would be a filter and this is not one.
 */
export const scatterPointValues = (
  geometry: PointGeometry,
  byId: Map<number, unknown>,
  entry: ColumnLutEntryColorBy | null,
): PointValues => {
  const values = new Float32Array(geometry.count);
  if (!entry || byId.size === 0) return flatValues(geometry.count);

  const { valueMin: min, valueMax: max } = valueWindowOf(byId, entry);
  if (min === 0 && max === 1 && byId.size > 0 && ![...byId.values()].some((raw) => Number.isFinite(Number(raw)))) {
    return flatValues(geometry.count);
  }

  for (const [objectId, raw] of byId) {
    const slot = geometry.slotOf(objectId);
    if (slot < 0) continue;
    const value = Number(raw);
    if (Number.isFinite(value)) values[slot] = value;
  }
  // Points the colouring never mentioned sit at the floor rather than at 0, which would be
  // outside the range for a column whose values are all negative.
  if (min !== 0) {
    const mentioned = new Set<number>();
    for (const objectId of byId.keys()) {
      const slot = geometry.slotOf(objectId);
      if (slot >= 0) mentioned.add(slot);
    }
    for (let index = 0; index < values.length; index += 1) {
      if (!mentioned.has(index)) values[index] = min;
    }
  }

  return { values, valueMin: min, valueMax: max };
};
