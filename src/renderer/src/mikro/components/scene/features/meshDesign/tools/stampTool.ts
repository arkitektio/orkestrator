import { marchField, meshToField } from "../field/sculptField";
import { applyStamp, boxStamp, ellipsoidStamp, sphereStamp, stampToField, type Stamp, type Vec3 } from "../field/stamps";
import { finishDesignGeometry } from "../ops/postProcess";
import { fieldSpacingFor, targetMesh } from "./context";
import type { BrushSkeletonState } from "../../annotations/enhancers/brushSkeletonStore";
import type { MeshDesignState, StampShape } from "../store/meshDesignStore";
import type { DesignTool } from "./registry";

/**
 * S — stamp: click places the toolbar-chosen primitive at the clicked point
 * (on the overlay surface, or the fallback plane when the session is empty)
 * and unions it into the active mesh. Data-free building: phantoms, filled
 * holes, blocked-out shapes.
 */
export const stampTool: DesignTool = {
  id: "stamp",
  key: "s",
  label: "Stamp",
  gesture: "surface",
  roiTool: null,
  hint: "Stamping — click to place the primitive on the mesh (or in space)",
  shortcut: { keys: ["S", "click"], description: "Stamp the chosen primitive onto the mesh" },
};

export const stampFor = (shape: StampShape, center: Vec3, radius: number): Stamp => {
  switch (shape) {
    case "box":
      return boxStamp(center, [radius, radius, radius]);
    case "ellipsoid":
      return ellipsoidStamp(center, [radius * 1.5, radius, radius * 0.6]);
    default:
      return sphereStamp(center, radius);
  }
};

/** Apply one stamp click. Returns false when there is nothing to size it by. */
export async function applyStampClick(
  design: MeshDesignState,
  brush: BrushSkeletonState,
  center: Vec3,
): Promise<boolean> {
  const radius = brush.radiusWorld ?? 0;
  if (radius <= 0) return false;
  const stamp = stampFor(design.stampShape, center, radius);
  const target = targetMesh(design);
  const fieldSpacing =
    target?.field?.spacing ?? fieldSpacingFor([radius / 6, radius / 6, radius / 6], brush.detailVoxels);
  let field = target ? (target.field ?? meshToField(target.original, fieldSpacing)) : null;
  field = field ? applyStamp(field, stamp, "add") : stampToField(stamp, fieldSpacing);
  const marched = marchField(field, brush.marcher);
  const { original, current } = await finishDesignGeometry(marched, {
    polishIterations: brush.polishIterations,
    detailWorld: brush.detailVoxels * fieldSpacing,
  });
  design.applySculpt(target?.id ?? null, {
    field,
    original,
    current,
    source: target?.source ?? { kind: "tube", layerId: "", level: 0 },
  });
  return true;
}
