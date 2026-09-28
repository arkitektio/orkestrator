import type { TransformLike } from "./transformGraph";

/**
 * Pyramid level scales, derived from each level's `toParent` edge.
 *
 * Shared rather than mikro's, because a multiscale pyramid is not an imaging
 * idea: an electrophysiology trace is stored the same way, one level per
 * downsampling factor, and elektro's timeline picks a level on zoom exactly as
 * the octree renderer picks one per brick. Only the RANK differs — these are
 * generic over `dimCount` and structural over the transform, so neither module
 * needs the other's types.
 */

/**
 * Absolute per-axis scale (array dim order) declared by a level's `toParent`
 * edge: a bare `ScaleTransformation`, or the Scale child of a Sequence
 * (Sequence[Scale, Translation] is the canonical pyramid-level edge; the
 * translation is the half-voxel downsampling offset, not yet consumed).
 * Identity / pure-translation edges scale nothing (all-1s). Null when the
 * edge is absent or not expressible as per-axis factors — callers fall back
 * to the shape-ratio chain in `resolveAxisScale`.
 */
export const absoluteLevelScale = (
  toParent: TransformLike | undefined,
  dimCount: number,
): number[] | null => {
  if (!toParent) return null;
  const nodes = toParent.transformations?.length ? toParent.transformations : [toParent];
  let scale: number[] | null = null;
  for (const node of nodes) {
    if (!node) continue;
    if (node.scale?.length) {
      if (scale) return null;
      scale = [...node.scale];
    } else if (
      node.__typename !== "IdentityTransformation" &&
      node.__typename !== "TranslationTransformation"
    ) {
      return null;
    }
  }
  if (scale) return scale.length === dimCount ? scale : null;
  return Array<number>(dimCount).fill(1);
};

/**
 * Per-level factors relative to level 0 (array dim order) — the exact
 * semantics the removed server-side `DataArray.scaleFactors` field had —
 * derived from the levels' absolute `toParent` scales. The absolute scales
 * obey `scale·shape == const` per axis, so these agree with the shape-ratio
 * fallback by construction; declaring them here just short-circuits it.
 */
// Memoized on the `dataArrays` ARRAY IDENTITY: fragments are normalized, so
// the array reference is stable across replans (nodePlanTracker calls
// `buildLevelSources` per layer every ~200 ms during interaction) and a new
// scene fetch mints a new array. Without this, every replan re-parses the
// levels' `toParent` edges for factors that cannot have changed.
const factorsCache = new WeakMap<
  object,
  { dimCount: number; factors: (number[] | null)[] }
>();

export const relativeLevelScaleFactors = (
  dataArrays: readonly { level: number; toParent?: TransformLike }[],
  dimCount: number,
): (number[] | null)[] => {
  if (dataArrays.length === 0) return [];
  const cached = factorsCache.get(dataArrays);
  if (cached && cached.dimCount === dimCount) return cached.factors;
  const abs = dataArrays.map((dataArray) => absoluteLevelScale(dataArray.toParent, dimCount));
  const baseIndex = dataArrays.reduce(
    (best, dataArray, i) => (dataArray.level < dataArrays[best].level ? i : best),
    0,
  );
  const base = abs[baseIndex];
  const factors = base
    ? abs.map((a) => (a ? a.map((v, k) => (base[k] ? v / base[k] : 1)) : null))
    : dataArrays.map(() => null);
  factorsCache.set(dataArrays, { dimCount, factors });
  return factors;
};
