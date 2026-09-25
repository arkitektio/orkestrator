import { marchField, meshToField, subtractCapsule, type SculptField } from "../field/sculptField";
import { applyStamp, capsuleChainStamp, smoothInSphere, type Vec3 } from "../field/stamps";
import { finishDesignGeometry } from "../ops/postProcess";
import { fieldSpacingFor } from "./context";
import type { BrushSkeletonState } from "../../annotations/enhancers/brushSkeletonStore";
import type { DesignMesh, MeshDesignState, SculptVariant } from "../store/meshDesignStore";
import type { DesignTool } from "./registry";

/**
 * B — sculpt: drag ON the mesh surface. The drag's points become falloff
 * spheres applied per the toolbar's variant — inflate (add), deflate
 * (subtract), smooth (local relax) — and the mesh re-marches ONCE on
 * release: one undo step per drag, like every other tool.
 */
export const sculptTool: DesignTool = {
  id: "sculpt",
  key: "b",
  label: "Sculpt",
  gesture: "surface",
  roiTool: null,
  hint: "Sculpting — drag on the mesh to inflate / deflate / smooth it",
  shortcut: { keys: ["B", "drag"], description: "Sculpt the mesh surface (inflate / deflate / smooth)" },
};

/** The brush sphere is half the extraction radius — sculpting is local. */
const SCULPT_RADIUS_FACTOR = 0.5;

export function sculptFieldAlong(
  field: SculptField,
  points: readonly Vec3[],
  radiusWorld: number,
  variant: SculptVariant,
): SculptField {
  const radius = Math.max(field.spacing, radiusWorld * SCULPT_RADIUS_FACTOR);
  if (variant === "inflate") return applyStamp(field, capsuleChainStamp(points, radius), "add");
  if (variant === "deflate") return subtractCapsule(field, points, radius);
  let out = field;
  for (const point of points) out = smoothInSphere(out, point, radius);
  return out;
}

/** Apply one finished sculpt drag to `target`. */
export async function applySculptStroke(
  design: MeshDesignState,
  brush: BrushSkeletonState,
  target: DesignMesh,
  points: readonly Vec3[],
): Promise<boolean> {
  const radius = brush.radiusWorld ?? 0;
  if (points.length === 0 || radius <= 0) return false;
  const fieldSpacing =
    target.field?.spacing ?? fieldSpacingFor([radius / 6, radius / 6, radius / 6], brush.detailVoxels);
  const field = target.field ?? meshToField(target.original, fieldSpacing);
  const sculpted = sculptFieldAlong(field, points, radius, design.sculptVariant);
  if (sculpted === field) return false;
  const marched = marchField(sculpted, brush.marcher);
  const { original, current } = await finishDesignGeometry(marched, {
    polishIterations: brush.polishIterations,
    detailWorld: brush.detailVoxels * fieldSpacing,
  });
  design.applySculpt(target.id, { field: sculpted, original, current, source: target.source });
  return true;
}
