import {
  dtypeRangeIsWeakProxy,
  serverHistogramRange,
} from "../../../platform/model/dataRange";
import type { Vec3 } from "../../../platform/coords/levelGeometry";
import { setAggregateEntry, setPageEntry } from "../gpu/pageTableTexture";
import { encodeEmptyTexel, encodeOccupancyTexel } from "../octree/brickEncoding";
import { nodeKey, parseNodeKey } from "../octree/nodeAddress";
import {
  aggregateIfComplete,
  aggregateSlabsIfComplete,
  parentCellsOf,
} from "../octree/occupancyAggregate";
import { PAGE_FLAG_EMPTY, PAGE_FLAG_RESIDENT } from "../octree/pageTableLayout";
import type { BrickSystemStats, LayerBrickPool, SlabRanges } from "./residencyTypes";

/**
 * Value-range encoding for a pool's page table, split out of the residency
 * manager: the layer auto-contrast range (`autoRange`), the occupancy
 * sidecar's observed/encode ranges and their two-drain promotion, the EMPTY /
 * occupancy re-encode passes, and the hierarchical-occupancy aggregates (R4).
 * Everything here mutates only the pool it is handed (fields + page-table
 * texels); scheduling — drain wake-ups, `poolsVersion` bumps, frames — stays
 * with the manager, which reads what to schedule from the return values.
 */

/** The range occupancy texels are quantized against — the pool range unless
 * the observed-range flag promoted a tighter one (see `occObservedRange`).
 * MUST be the range the shader's `uOccDecodeMin/Range` uniforms hold. */
export const occEncodeRangeOf = (pool: LayerBrickPool): { minValue: number; maxValue: number } => ({
  minValue: pool.occEncodeMin,
  maxValue: pool.occEncodeMax,
});

/** Per-slab occupancy texels for a multi-plane pool (`orkestrator.occPerSlab`),
 * or undefined when the pool has one plane / no per-slab measurement — the
 * sidecar then takes the union texel for every plane. */
export const slabTexelsOf = (
  pool: LayerBrickPool,
  ranges: SlabRanges | null | undefined,
): (readonly [number, number])[] | undefined =>
  pool.occSlabs > 1 && ranges
    ? ranges.map((range) => encodeOccupancyTexel(range[0], range[1], occEncodeRangeOf(pool)))
    : undefined;

/**
 * Whether a pool derives `minValue`/`maxValue` from the bricks that land rather
 * than from the dtype (see `LayerBrickPool.autoRange`).
 *
 * Written ONCE and called from both derivation sites — fresh pool creation and
 * the range-move re-derivation — because the two must never disagree.
 *
 * NEVER for a label pool, whatever its dtype: the EMPTY encoding quantizes
 * against exactly this range, so a moving range would make every already-
 * written uniform brick start decoding to a different id.
 */
export const shouldAutoRange = (
  valueSemantics: "intensity" | "labelIds",
  dtype: string,
  layer: Parameters<typeof serverHistogramRange>[0],
): boolean =>
  valueSemantics === "intensity" &&
  dtypeRangeIsWeakProxy(dtype) &&
  serverHistogramRange(layer) === null;

/**
 * How a REUSED pool's auto-range state carries across `ensurePool`'s movable
 * path (a slice-signature change: T / dim slider, axis remap — never z, which
 * `sliceSignature` deliberately excludes).
 *
 * **`keepRange`** — `derivation.dataRange` is the DTYPE range for an
 * auto-ranging pool (the histogram branch found nothing to use), so taking it
 * would throw away the measured range and re-run the whole ratchet on every
 * slider step. For a SIGNED dtype the dtype range is the pathological one (raw
 * 0 sits at mid-gray), so the layer would flash fogged AND lose empty-space
 * skipping until the first brick lands again. Kept only when the pool was
 * ALREADY auto-ranging, STAYS auto-ranging, and has a real measured range; a
 * policy change — a late server histogram turning `autoRange` off — must take
 * the derived range instead.
 *
 * **`autoRangeInitialized`** — the kept range is a SEED, not a floor. This
 * branch is the only thing that ever clears the flag (`flushPool` does not
 * touch it), and `accumulateAutoRange` only ever WIDENS while it is set. Keep
 * it across a flush and one hot timepoint would permanently dim every other
 * one: scrub to a t with a 30000 spike on otherwise 0..4000 data and every
 * later slice renders windowed to [0, 30000] for the life of the pool.
 * Photobleaching and per-timepoint exposure make that ordinary microscopy, not
 * a corner case. So a FLUSHED pool clears it and the next brick re-FITS
 * wholesale — while `minValue`/`maxValue` still hold the previous slice's
 * range, so nothing ever renders at the dtype range in between. Without a
 * flush the data is unchanged and there is nothing to re-fit.
 *
 * Exported for the vitest matrix, like `occPromotionWorthwhile`.
 */
export const resolveReusedAutoRange = (
  pool: { autoRange: boolean; autoRangeInitialized: boolean },
  nextAutoRange: boolean,
  flushed: boolean,
): { keepRange: boolean; autoRangeInitialized: boolean } => {
  const keepRange = pool.autoRange && nextAutoRange && pool.autoRangeInitialized;
  return { keepRange, autoRangeInitialized: keepRange && !flushed };
};

/** Encode work a drain still owes a pool: the two-drain occupancy-range
 * promotion (either phase) or a pending auto-range EMPTY re-encode. The
 * drain idle-latch must NOT clear while any of these is set, or the second
 * drain of the promotion protocol never runs under the demand frame loop
 * (exported for the vitest matrix). */
export const hasPendingEncodeWork = (pool: {
  occReencodePending: boolean;
  autoRangeEncodeDirty: boolean;
}): boolean => pool.occReencodePending || pool.autoRangeEncodeDirty;

/**
 * Whether a DRAINED-EDGE occupancy-range promotion is worth a sidecar
 * rewrite: the observed union escaped the encode range, or tightened to
 * under 80% of it. The escape epsilon is relative to the OBSERVED span —
 * an epsilon on the (possibly tiny, post-first-promotion) encode span
 * turned every union growth during a cold load into an escape, cascading
 * 10-40 promotions per load. Pure, exported for the vitest matrix.
 */
export const occPromotionWorthwhile = (pool: {
  occObservedInitialized: boolean;
  occObservedMin: number;
  occObservedMax: number;
  occEncodeMin: number;
  occEncodeMax: number;
}): boolean => {
  if (!pool.occObservedInitialized) return false;
  const observedSpan = pool.occObservedMax - pool.occObservedMin;
  if (!(observedSpan > 0)) return false;
  const encodeSpan = Math.max(pool.occEncodeMax - pool.occEncodeMin, 1e-6);
  const eps = observedSpan * 0.01;
  const escaped =
    pool.occObservedMin < pool.occEncodeMin - eps ||
    pool.occObservedMax > pool.occEncodeMax + eps;
  const tightened = observedSpan < encodeSpan * 0.8;
  return escaped || tightened;
};

/**
 * Fold one brick's raw min/max into the layer's auto-contrast range
 * (weak-proxy-dtype layers with no server histogram — see
 * `LayerBrickPool.autoRange` and `shouldAutoRange`). The
 * per-brick min/max is already computed by both repack paths; this is the
 * only consumer of it for range purposes.
 *
 * When the range moves, EMPTY page entries must be re-encoded (they store
 * the value quantized against the pool range), and `poolsVersion` must be
 * bumped so `BrickVolumeLayer` rebuilds the `minValue`/`maxValue` uniforms —
 * no material rebuild. Bricks resident in the atlas hold raw values and
 * normalize live in the shader, so they need no rewrite. The pool fields are
 * updated here; the caller owns the scheduling the return value asks for:
 * "moved" = bump poolsVersion, "moved-reencode" = also wake the drain for
 * the coalesced EMPTY re-encode.
 */
export function foldAutoRange(
  pool: LayerBrickPool,
  brickMin: number,
  brickMax: number,
): "unchanged" | "moved" | "moved-reencode" {
  if (!pool.autoRange) return "unchanged";
  if (!Number.isFinite(brickMin) || !Number.isFinite(brickMax) || brickMax <= brickMin) {
    return "unchanged";
  }

  const nextMin = pool.autoRangeInitialized ? Math.min(pool.minValue, brickMin) : brickMin;
  const nextMax = pool.autoRangeInitialized ? Math.max(pool.maxValue, brickMax) : brickMax;

  // Ignore sub-1% wobble so a stream of bricks doesn't churn the uniforms;
  // the first (uninitialized) update always applies.
  const span = Math.max(pool.maxValue - pool.minValue, 1e-6);
  const changed =
    !pool.autoRangeInitialized ||
    Math.abs(nextMin - pool.minValue) > span * 0.01 ||
    Math.abs(nextMax - pool.maxValue) > span * 0.01;
  if (!changed) return "unchanged";

  pool.minValue = nextMin;
  pool.maxValue = nextMax;
  pool.autoRangeInitialized = true;
  // Flag-off pools keep the occupancy encode range mirroring the pool
  // range (legacy single-range behavior); the autoRangeEncodeDirty pass
  // re-encodes the sidecar against it, exactly as before.
  if (!pool.occObservedRange) {
    pool.occEncodeMin = nextMin;
    pool.occEncodeMax = nextMax;
  }

  // EMPTY page entries encode their value against the pool range, so a
  // range move requires re-encoding them — but COALESCED to one pass per
  // drain frame (early float streaming lands several moves per frame, and
  // each immediate rewrite re-uploaded page-table regions). The next drain
  // applies it; the caller wakes it.
  if (pool.emptyValues.size > 0) {
    pool.autoRangeEncodeDirty = true;
    return "moved-reencode";
  }
  return "moved";
}

/**
 * Fold a landed brick range into the pool's occupancy OBSERVED range —
 * UNION ONLY, no scheduling. The promotion decision moved to the drain
 * flush loop's drained-edge check (`occPromotionWorthwhile`): promoting
 * per landed brick cascaded during cold loads (the growing union
 * re-promoted on nearly every drain, each one blanking the whole sidecar,
 * starving the re-encode and injecting off-cadence frames that defeated
 * the streaming coalescer — ~9× the intended rendered frames with
 * occupancy culling dead the whole time). During a stream the texels
 * simply keep encoding against the CURRENT range: stale-but-conservative
 * by the four-corner clamp + byte-0 sentinel.
 */
export function accumulateOccRange(pool: LayerBrickPool, brickMin: number, brickMax: number): void {
  if (!pool.occObservedRange) return;
  if (!Number.isFinite(brickMin) || !Number.isFinite(brickMax) || brickMax < brickMin) return;

  pool.occObservedMin = pool.occObservedInitialized
    ? Math.min(pool.occObservedMin, brickMin)
    : brickMin;
  pool.occObservedMax = pool.occObservedInitialized
    ? Math.max(pool.occObservedMax, brickMax)
    : brickMax;
  pool.occObservedInitialized = true;
}

/** Re-encode every EMPTY page entry against the current pool range (the
 * page table is flushed by the caller). */
export function reencodeEmptyEntries(pool: LayerBrickPool): void {
  for (const [key, value] of pool.emptyValues) {
    const { level, coords } = parseNodeKey(key);
    setPageEntry(
      pool.pageTable,
      level,
      coords,
      encodeEmptyTexel(value, pool, pool.emptyBits),
      PAGE_FLAG_EMPTY,
    );
  }
}

/** Re-encode every RESIDENT brick's occupancy texel against the current
 * occupancy ENCODE range (same quantization dependency as the EMPTY
 * entries; a range move leaves old encodings relative to the old range,
 * which may no longer bracket the brick). */
export function reencodeOccupancyEntries(pool: LayerBrickPool): void {
  const encodeRange = occEncodeRangeOf(pool);
  for (const [key, range] of pool.brickRanges) {
    const slot = pool.pool.slotOf(key);
    if (!slot) continue; // evicted since — its page entry is UNMAPPED
    const { level, coords } = parseNodeKey(key);
    setPageEntry(
      pool.pageTable,
      level,
      coords,
      slot.coords,
      PAGE_FLAG_RESIDENT,
      encodeOccupancyTexel(range[0], range[1], encodeRange),
      slabTexelsOf(pool, pool.brickSlabRanges.get(key)),
    );
  }
  for (const [key, range] of pool.aggregateRanges) {
    const { level, coords } = parseNodeKey(key);
    setAggregateEntry(
      pool.pageTable,
      level,
      coords,
      encodeOccupancyTexel(range[0], range[1], encodeRange),
      slabTexelsOf(pool, pool.aggregateSlabRanges.get(key)),
    );
  }
}

/** Blank every RESIDENT brick's occupancy texel (and every aggregate
 * texel) to the all-zero "unknown, never skip/hop" sentinel — the
 * conservative intermediate state of a range promotion (valid under ANY
 * decode uniforms; see `occObservedRange`). */
export function blankOccupancyEntries(pool: LayerBrickPool): void {
  for (const key of pool.brickRanges.keys()) {
    const slot = pool.pool.slotOf(key);
    if (!slot) continue;
    const { level, coords } = parseNodeKey(key);
    setPageEntry(pool.pageTable, level, coords, slot.coords, PAGE_FLAG_RESIDENT);
  }
  for (const key of pool.aggregateRanges.keys()) {
    const { level, coords } = parseNodeKey(key);
    setAggregateEntry(pool.pageTable, level, coords, null);
  }
}

/**
 * Hierarchical occupancy (R4): fold one brick's measured range into
 * `measuredRanges` and write every parent cell's aggregate that just
 * became complete (`occupancyAggregate.ts`). Uniform (EMPTY) bricks land
 * here too, as [v, v] — an aggregate is only as complete as ALL its
 * children. While a range promotion is in flight the texel is written as
 * the unknown sentinel (like the per-brick path); the re-encode pass
 * rewrites it from `aggregateRanges`.
 */
export function recordMeasuredRange(
  pool: LayerBrickPool,
  stats: Pick<BrickSystemStats, "aggregateWrites">,
  key: string,
  level: number,
  coords: Vec3,
  brickMin: number,
  brickMax: number,
  /** Per-slab ranges (multi-plane pools). Omitted — a uniform brick — means
   * every slab is [brickMin, brickMax]. */
  slabRanges?: SlabRanges | null,
): void {
  if (!pool.occHierarchy) return;
  if (!Number.isFinite(brickMin) || !Number.isFinite(brickMax) || brickMax < brickMin) return;
  pool.measuredRanges.set(key, [brickMin, brickMax]);
  const perSlab = pool.occSlabs > 1;
  if (perSlab) {
    pool.measuredSlabRanges.set(
      key,
      slabRanges ??
        Array.from({ length: pool.occSlabs }, () => [brickMin, brickMax] as const),
    );
  }
  const parentLevel = level + 1;
  for (const cell of parentCellsOf(pool.geometry, pool.spec, level, coords)) {
    const aggregate = aggregateIfComplete(
      pool.geometry,
      pool.spec,
      parentLevel,
      cell,
      pool.measuredRanges,
    );
    if (!aggregate) continue;
    const parentKey = nodeKey(parentLevel, cell);
    pool.aggregateRanges.set(parentKey, aggregate);
    const slabAggregate = perSlab
      ? aggregateSlabsIfComplete(
          pool.geometry,
          pool.spec,
          parentLevel,
          cell,
          pool.measuredSlabRanges,
          pool.occSlabs,
        )
      : null;
    if (slabAggregate) pool.aggregateSlabRanges.set(parentKey, slabAggregate);
    setAggregateEntry(
      pool.pageTable,
      parentLevel,
      cell,
      pool.occReencodePending
        ? null
        : encodeOccupancyTexel(aggregate[0], aggregate[1], occEncodeRangeOf(pool)),
      pool.occReencodePending ? null : slabTexelsOf(pool, slabAggregate),
    );
    stats.aggregateWrites += 1;
  }
}
