import type { ExtractionContext, BrushSkeletonState, TubeSurface, BrushSample, Vec3 } from "../brush";
import type { DesignMesh, MeshDesignState } from "../store/meshDesignStore";
import type { DesignJob } from "../worker/designJob";

/**
 * What a design tool's `run` receives: the gesture (already captured into
 * the brush store), the resolved extraction context of the layer it landed
 * on, and snapshots of both stores.
 * Tools NEVER touch React — they are plain async functions, dispatched by
 * `useBrushSkeleton.extract` via the registry — which is what keeps each one
 * a small, unit-testable module.
 */
export type DesignToolRunContext = {
  /** The captured gesture: world/voxel samples, seed first. */
  stroke: readonly BrushSample[];
  layerId: string;
  /** Null when the layer left the scene (tools fail with a message then). */
  extraction: ExtractionContext | null;
  /** Snapshot of the brush store (settings + gesture bookkeeping). */
  brush: BrushSkeletonState;
  /** Snapshot of the session, taken AFTER any pending candidate was accepted. */
  design: MeshDesignState;
  /** True when a newer gesture took over — abandon silently. */
  stale: () => boolean;
  /** Report failure (keeps the session; shown in the panel). */
  fail: (message: string) => void;
  /** Clear the gesture after a successful apply. */
  clear: () => void;
  publishLive: (tube: TubeSurface) => void;
};

/** The design target of a stroke: the selected mesh, else the latest. */
export const targetMesh = (design: MeshDesignState): DesignMesh | undefined =>
  (design.selectedId ? design.meshes.find((m) => m.id === design.selectedId) : undefined) ??
  design.meshes.at(-1);

/** Field resolution for a mesh: the extraction spacing, finer under sub-voxel Detail. */
export const fieldSpacingFor = (spacing: Vec3 | readonly number[], detailVoxels: number): number =>
  Math.max(...spacing) * Math.min(1, Math.max(0.25, detailVoxels));

/** Where an edit of `target` starts: its field, or its mesh voxelized at `spacing`. */
export const baseFor = (target: DesignMesh, spacing: number): DesignJob["base"] =>
  target.field
    ? { kind: "field", field: target.field }
    : { kind: "mesh", geometry: target.original, spacing };

/** The shared finishing settings of an edit at `spacing` (world units per cell). */
export const finishFor = (
  brush: Pick<BrushSkeletonState, "marcher" | "polishIterations" | "detailVoxels">,
  spacing: number,
): DesignJob["finish"] => ({
  marcher: brush.marcher,
  polishIterations: brush.polishIterations,
  detailWorld: brush.detailVoxels * spacing,
});
