import { resolveAxisIndices, type AxisIndices, type LayerAxisDims } from "../model/dims";
import type { TransformLike } from "@/lib/scene/coords/transformGraph";
import { relativeLevelScaleFactors } from "@/lib/scene/coords/levelScale";
import { effectiveChunkShapeOf } from "@/lib/zarr/runner/get-worker";

/**
 * Canonical per-layer pyramid geometry for the octree renderer. Everything in
 * `features/bricks/octree/` works in **spatial [x, y, z] order**, independent of the
 * zarr array's dim order — the axis positions recorded here are the only
 * bridge back to zarr-space (selections, chunk coords).
 */

export type Vec3 = readonly [number, number, number];

/**
 * Hard cap on pyramid levels. Lives here rather than with the brick encodings
 * because this is the module that APPLIES it, and platform/ cannot import from
 * a feature; the shader's traversal uniform arrays are sized to match.
 */
export const MAX_BRICK_LEVELS = 10;

/** Per-level source data, structurally identical to `chunkPlanning.PlanLevel`. */
export type LevelSource = {
  shape: readonly number[];
  chunks: readonly number[];
  dtype: string;
  storeId: string;
  scaleFactors?: readonly number[] | null;
};

export type LevelGeometry = {
  index: number;
  storeId: string;
  dtype: string;
  /** Full zarr shape / chunk shape, in the array's own dim order. */
  shape: readonly number[];
  chunks: readonly number[];
  /** Level extents in [x, y, z] voxels (z = 1 when the layer has no z axis). */
  spatialShape: Vec3;
  /** Zarr chunk extents along [x, y, z] (1 where there is no such axis). */
  spatialChunks: Vec3;
  /** Base voxels per level voxel along [x, y, z]. */
  scale: Vec3;
};

/**
 * What one z-slab of a brick slot holds. Channel slabs come first and are
 * indexed by the channel itself (slab i = channel i), so the existing shader
 * mapping (`intensityIndex` → slab) is unchanged; a phasor node then claims
 * THREE slabs after them, because the repack reduces its axis into g, s and a
 * mean photon count rather than storing the bins.
 */
export type SlabDesc =
  | { kind: "channel"; channel: number }
  | {
      kind: "phasor";
      /** g and s are the phasor; i is the MEAN photon count over the bins —
       * mean, not sum, so it stays in the data's own value range and the
       * ordinary clim/gamma transfer applies to it unchanged. */
      component: "g" | "s" | "i";
      /** Index of the phasor node in the layer's `phasors` (tree order). */
      node: number;
      /** The channel whose photons this phasor counts. */
      channel: number;
      harmonic: number;
    };

export type LayerLevelGeometry = {
  dims: readonly string[];
  axes: AxisIndices;
  /**
   * Slabs co-resident in a brick slot (capped at 16 like the 2D shader). Named
   * for its history — every slab used to be a channel — but with a phasor node
   * in the graph it counts channel slabs AND the node's g/s/i slabs. It is the
   * atlas' z-stacking factor (`slotSize.z = stored.z * channelCount`).
   */
  channelCount: number;
  /** What each of those slabs holds. `slabs.length === channelCount`. */
  slabs: readonly SlabDesc[];
  /** Channel slabs only — the layer's real channels. */
  channelSlabCount: number;
  /** Samples along the reduced phasor axis; 0 when the layer has no phasor. */
  phasorBins: number;
  /** Voxel values are IDENTITIES, not intensities (label masks): every lossy
   * storage option — above all the R16F half-float atlas, whose 11-bit
   * significand corrupts ids above 2048 — is off the table. Derived from the
   * layer's `__typename` at build time; false for test fixtures without one,
   * which is safe because real label layers always carry it. */
  exactValues: boolean;
  /** Finest first (index 0 = level 0), matching `dataArrays` ordering. */
  levels: readonly LevelGeometry[];
};

export const MAX_BRICK_CHANNELS = 16;

/** Slabs one phasor node occupies: g, s and the mean photon count. */
export const SLABS_PER_PHASOR = 3;

/** True when the geometry's bricks carry reduced phasor slabs. */
export const hasPhasorSlabs = (geo: LayerLevelGeometry): boolean =>
  geo.phasorBins > 0 && geo.slabs.some((slab) => slab.kind === "phasor");

/**
 * Level scales moved to `@/lib/scene/coords/levelScale` — a trace pyramid is the
 * same idea at rank 1, and elektro's timeline needs them too. Re-exported here so
 * this module stays the place brick code asks about level geometry.
 */
export {
  absoluteLevelScale,
  relativeLevelScaleFactors,
} from "@/lib/scene/coords/levelScale";

/** Structural subset of a `DataArray` fragment that `buildLevelSources` needs. */
export type DataArraySource = {
  level: number;
  toParent?: TransformLike;
  store: { id: string };
};

/**
 * The one shared `LevelSource[]` builder (plan tracker, residency manager and
 * pool-viability probe previously each hand-rolled this): opened-array shapes
 * per store plus the relative scale factors derived from the transform graph.
 * Throws (like `getArrayForStoreId`) when a store's array isn't opened yet.
 */
export function buildLevelSources(
  dataArrays: readonly DataArraySource[],
  dimCount: number,
  getArrayForStoreId: (storeId: string) => {
    shape: readonly number[];
    chunks: readonly number[];
    dtype: unknown;
  },
): LevelSource[] {
  const factors = relativeLevelScaleFactors(dataArrays, dimCount);
  return dataArrays.map((dataArray, i) => {
    const arr = getArrayForStoreId(dataArray.store.id);
    return {
      shape: arr.shape,
      // Sharded arrays: the fetch unit is the INNER chunk (`arr.chunks` is the
      // shard). Falls back to `arr.chunks` for unsharded arrays and for test
      // doubles that were never opened through `openZarrArray`.
      chunks: effectiveChunkShapeOf(arr) ?? arr.chunks,
      dtype: String(arr.dtype),
      storeId: dataArray.store.id,
      scaleFactors: factors[i] ?? undefined,
    };
  });
}

/**
 * Per-axis level scale with the same fallback chain `planLayerChunks` uses for
 * x: explicit scaleFactors, else the shape ratio vs level 0, else 2^index
 * (assumed untouched for z, whose pyramids typically don't downsample).
 */
const resolveAxisScale = (
  levels: readonly LevelSource[],
  levelIndex: number,
  axisPos: number,
  isZ: boolean,
): number => {
  if (axisPos === -1) return 1;
  const fromScale = levels[levelIndex].scaleFactors?.[axisPos];
  if (typeof fromScale === "number" && fromScale > 0) return fromScale;
  const base = levels[0].shape[axisPos] ?? 0;
  const cur = levels[levelIndex].shape[axisPos] ?? 0;
  if (base > 0 && cur > 0) return base / cur;
  return isZ ? 1 : 2 ** levelIndex;
};

const axisExtent = (values: readonly number[], pos: number): number =>
  pos !== -1 ? Math.max(1, values[pos] ?? 1) : 1;

export function buildLayerLevelGeometry(
  dims: readonly string[],
  layer: LayerAxisDims,
  allLevels: readonly LevelSource[],
): LayerLevelGeometry | null {
  const axes = resolveAxisIndices([...dims], layer);
  const { xPos, yPos, zPos, intensityPos, phasorPos } = axes;
  if (allLevels.length === 0 || xPos === -1 || yPos === -1) return null;

  // Some pyramids carry duplicate resolutions (e.g. two level-0 dataArrays,
  // one without scaleFactors and one with [1,1,1,1], in different stores).
  // Keeping both would plan and FETCH the same resolution twice — and the
  // ancestor-chain logic would treat the duplicate as a distinct LOD. Keep
  // the first entry per unique spatial shape.
  const seenShapes = new Set<string>();
  const deduped = allLevels.filter((level) => {
    const shapeKey = `${axisExtent(level.shape, xPos)}:${axisExtent(level.shape, yPos)}:${axisExtent(level.shape, zPos)}`;
    if (seenShapes.has(shapeKey)) return false;
    seenShapes.add(shapeKey);
    return true;
  });
  // HARD CAP at MAX_BRICK_LEVELS: the shader's traversal uniform arrays
  // (uPageOffset/uLevelShape/uLevelScale) and its residency walk are sized
  // to exactly this many levels, and `uNumLevels` is min-clamped to it. An
  // uncapped geometry made the planner root its fetchBand-0 backdrop at a
  // level the shader could never read — deep (≥11-level) pyramids rendered
  // INVISIBLE until refinement reached level 9, with permanent holes
  // wherever it stopped coarser. Dropping the deepest levels merely makes
  // the coarsest available level level 9 — still a tiny backdrop.
  const levels = deduped.slice(0, MAX_BRICK_LEVELS);
  if (levels.length === 0) return null;

  const channelSlabCount =
    intensityPos !== -1
      ? Math.min(MAX_BRICK_CHANNELS, Math.max(1, levels[0].shape[intensityPos] ?? 1))
      : 1;

  const slabs: SlabDesc[] = [];
  for (let channel = 0; channel < channelSlabCount; channel++) {
    slabs.push({ kind: "channel", channel });
  }

  const phasorBins =
    phasorPos !== -1 ? Math.max(0, levels[0].shape[phasorPos] ?? 0) : 0;

  if (phasorPos !== -1 && phasorBins > 1) {
    // Each phasor node adds three slabs. A graph deep enough to overflow the
    // slot (16 slabs) drops the phasors that no longer fit rather than
    // silently mis-indexing the ones that do — the same "degrade, don't
    // explode" contract as the axis guards in `dims.ts`.
    (layer.phasors ?? []).forEach((phasor, node) => {
      if (slabs.length + SLABS_PER_PHASOR > MAX_BRICK_CHANNELS) return;
      const channel = Math.min(
        Math.max(0, phasor.intensityIndex ?? 0),
        channelSlabCount - 1,
      );
      const harmonic = Math.max(1, phasor.harmonic ?? 1);
      for (const component of ["g", "s", "i"] as const) {
        slabs.push({ kind: "phasor", component, node, channel, harmonic });
      }
    });
  }

  return {
    dims,
    axes,
    channelCount: slabs.length,
    slabs,
    channelSlabCount,
    phasorBins: slabs.some((slab) => slab.kind === "phasor") ? phasorBins : 0,
    exactValues: layer.__typename === "LabelLayer",
    levels: levels.map((level, index) => ({
      index,
      storeId: level.storeId,
      dtype: level.dtype,
      shape: level.shape,
      chunks: level.chunks,
      spatialShape: [
        axisExtent(level.shape, xPos),
        axisExtent(level.shape, yPos),
        axisExtent(level.shape, zPos),
      ],
      spatialChunks: [
        axisExtent(level.chunks, xPos),
        axisExtent(level.chunks, yPos),
        axisExtent(level.chunks, zPos),
      ],
      scale: [
        resolveAxisScale(levels, index, xPos, false),
        resolveAxisScale(levels, index, yPos, false),
        resolveAxisScale(levels, index, zPos, true),
      ],
    })),
  };
}
