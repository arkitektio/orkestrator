import type { DebugSection } from "../features/debug/debugSection";
import { ANNOTATIONS_DEBUG_SECTION } from "../features/annotations/AnnotationsDebugSection";
import { BRICK_DEBUG_SECTION } from "../features/bricks/BrickDebugSection";
import { MESH_DEBUG_SECTION } from "../features/meshes/MeshDebugSection";

export type { DebugSection } from "../features/debug/debugSection";

/** The features that report into the debug panel. */
export type DebugFeature = "bricks" | "meshes" | "annotations";

/**
 * Per-feature DEBUG dispatch — the third sibling of `layerRegistry.ts` and
 * `layerPanel/cardRegistry.tsx`. Each feature owns its section in its own
 * folder and contributes one entry here; `features/debug/DebugPanel` renders
 * what it is handed and imports no feature.
 *
 * The features match `DebugSection` STRUCTURALLY (they may not import
 * `features/debug`), so this annotated `Record` is where a drifted entry fails
 * to compile.
 */
export const DEBUG_REGISTRY: Record<DebugFeature, DebugSection> = {
  bricks: BRICK_DEBUG_SECTION,
  meshes: MESH_DEBUG_SECTION,
  annotations: ANNOTATIONS_DEBUG_SECTION,
};

/**
 * Panel order. It is the order sections, bodies and self-test buttons appear
 * in (octree plans above fabriks; the repack parity test before the skeleton
 * one). A constant, so each section's `useContribution` hook is called in the
 * same order on every render.
 */
const DEBUG_ORDER: readonly DebugFeature[] = ["bricks", "meshes", "annotations"];

export const DEBUG_SECTIONS: readonly DebugSection[] = DEBUG_ORDER.map(
  (feature) => DEBUG_REGISTRY[feature],
);
