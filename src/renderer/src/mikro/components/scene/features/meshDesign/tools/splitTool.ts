import { marchField, meshToField } from "../field/sculptField";
import { splitField } from "../field/split";
import { finishDesignGeometry } from "../ops/postProcess";
import { fieldSpacingFor } from "./context";
import type { BrushSkeletonState } from "../../annotations/enhancers/brushSkeletonStore";
import type { DesignMesh, MeshDesignState } from "../store/meshDesignStore";
import type { DesignTool } from "./registry";
import type { Vec3 } from "../field/stamps";

/**
 * K — split: two clicks ON the mesh surface. The inside region parts along
 * the watershed between the two seeds; the far side becomes a NEW mesh with
 * its own object id.
 */
export const splitTool: DesignTool = {
  id: "split",
  key: "k",
  label: "Split",
  gesture: "surface",
  roiTool: null,
  hint: "Split — click both sides of the waist; the mesh parts between them",
  shortcut: { keys: ["K", "click ×2"], description: "Split the mesh between two clicked points" },
};

/** Apply the second click. True when the mesh actually split. */
export async function applySplit(
  design: MeshDesignState,
  brush: BrushSkeletonState,
  target: DesignMesh,
  seedA: Vec3,
  seedB: Vec3,
): Promise<boolean> {
  const fieldSpacing = target.field?.spacing ?? fieldSpacingFor([1, 1, 1], brush.detailVoxels);
  const field = target.field ?? meshToField(target.original, fieldSpacing);
  const parts = splitField(field, seedA, seedB);
  if (!parts) return false;
  const finish = (f: typeof field) =>
    finishDesignGeometry(marchField(f, brush.marcher), {
      polishIterations: brush.polishIterations,
      detailWorld: brush.detailVoxels * fieldSpacing,
    });
  const [a, b] = await Promise.all([finish(parts.a), finish(parts.b)]);
  // The near half replaces the mesh (ONE undo step); the far half is new.
  design.applySculpt(target.id, { field: parts.a, original: a.original, current: a.current, source: target.source });
  design.applySculpt(null, { field: parts.b, original: b.original, current: b.current, source: target.source });
  return true;
}
