/**
 * Geometry vocabulary shared across tiers.
 *
 * These types live here rather than with their producer because a `platform/`
 * consumer cannot import from a feature: `platform/draw/PreviewLine` renders
 * the points that `features/annotations/roiOutline` produces, so the type has
 * to sit below both.
 *
 * NOTE: three separate `Vec3` aliases still exist in the tree
 * (`platform/coords/levelGeometry.ts` and
 * `features/annotations/enhancers/shared/strokeModel.ts` are `readonly`,
 * `features/annotations/primitiveDraw.ts` is mutable). Consolidating them is a
 * separate change — the readonly/mutable split is real, not accidental.
 */

/** One vertex of a drawn outline, in scene world coordinates. */
export type OutlinePoint = [number, number, number];
