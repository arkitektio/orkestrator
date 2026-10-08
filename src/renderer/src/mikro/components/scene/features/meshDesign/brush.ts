/**
 * The designer's door into the annotation brush.
 *
 * The mesh designer is built ON the brush feature: it reuses the brush's
 * gesture capture (the stroke/click store), its extraction engines (the
 * centerline and the isosurface kernels) and their vocabulary. Everything it
 * takes from there comes through this one file, so the seam between the two
 * features is a list that can be read — and `architecture.test.ts` counts it
 * once instead of once per tool.
 *
 * Types and engine functions only. The brush's React pieces (param rows,
 * `useBrushSkeleton`) are imported directly by the few `ui/` files that
 * render them, which keeps this file safe to load from the pure modules.
 */
export {
  runGrowLoop,
  runStrokeExtraction,
  type ExtractionContext,
} from "../annotations/enhancers/paths/brushSkeleton/extraction";
export {
  useBrushSkeletonStore,
  useBrushSkeletonStoreApi,
  type BrushSkeletonState,
  type TubeSurface,
} from "../annotations/enhancers/brushSkeletonStore";
export type { BrushSample, Vec3 } from "../annotations/enhancers/shared/strokeModel";
export type { MarcherId } from "../annotations/enhancers/meshes/marcher";
