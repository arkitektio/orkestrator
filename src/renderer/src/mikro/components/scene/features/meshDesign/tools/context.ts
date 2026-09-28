import type { ExtractionContext } from "../../annotations/enhancers/paths/brushSkeleton/extraction";
import type { BrushSkeletonState, TubeSurface } from "../../annotations/enhancers/brushSkeletonStore";
import type { BrushSample, Vec3 } from "../../annotations/enhancers/shared/strokeModel";
import { marchField, meshToField, unionMesh } from "../field/sculptField";
import { finishDesignGeometry } from "../ops/postProcess";
import { weldSoup } from "../ops/weld";
import type { DesignMesh, MeshDesignState } from "../store/meshDesignStore";

/**
 * What a design tool's `run` receives: the gesture (already captured into
 * the brush store), the resolved extraction context of the layer it landed
 * on, snapshots of both stores, and the field helpers every tool ends in.
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

/**
 * The shared tail of every ADDITIVE tool: weld the world-space surface soup,
 * union it into the target mesh's field (building the field lazily for a
 * mesh that predates sculpting), re-march, polish, simplify, apply — ONE
 * undo step. Returns false when the piece is empty.
 */
export async function unionPieceIntoDesign(
  ctx: DesignToolRunContext,
  tube: TubeSurface,
  spacing: Vec3,
  level: number,
  kind: "tube" | "blob",
): Promise<boolean> {
  if (tube.triangles === 0) return false;
  const piece = weldSoup(tube.positions);
  if (piece.indices.length === 0) return false;
  const { detailVoxels, polishIterations, marcher } = ctx.brush;
  const target = ctx.design.selectedId
    ? ctx.design.meshes.find((m) => m.id === ctx.design.selectedId)
    : undefined;

  const fieldSpacing = fieldSpacingFor(spacing, detailVoxels);
  let field = target ? (target.field ?? meshToField(target.original, fieldSpacing)) : null;
  field = field ? unionMesh(field, piece) : meshToField(piece, fieldSpacing);
  const marched = marchField(field, marcher);
  const { original, current } = await finishDesignGeometry(marched, {
    polishIterations,
    detailWorld: detailVoxels * Math.max(...spacing),
  });
  if (ctx.stale()) return true; // applied nothing, but the gesture moved on
  ctx.design.applySculpt(target?.id ?? null, {
    field,
    original,
    current,
    source: { kind, layerId: ctx.layerId, level },
  });
  return true;
}
