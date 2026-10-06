import { Shapes } from "lucide-react";

import type { StampSpec, Vec3 } from "../field/stamps";
import { designDispatcher } from "../worker/designDispatcher";
import { baseFor, fieldSpacingFor, finishFor, targetMesh } from "./context";
import type { BrushSkeletonState } from "../brush";
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
  icon: Shapes,
  group: "primary",
  gesture: "surface",
  hint: "Click to place the primitive on the mesh (or in space)",
  shortcut: { keys: ["S", "click"], description: "Stamp: click to place a primitive" },
};

export const stampSpecFor = (shape: StampShape, center: Vec3, radius: number): StampSpec => {
  switch (shape) {
    case "box":
      return { kind: "box", center, halfExtents: [radius, radius, radius] };
    case "ellipsoid":
      return { kind: "ellipsoid", center, radii: [radius * 1.5, radius, radius * 0.6] };
    default:
      return { kind: "sphere", center, radius };
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
  const spec = stampSpecFor(design.stampShape, center, radius);
  const target = targetMesh(design);
  const fieldSpacing =
    target?.field?.spacing ?? fieldSpacingFor([radius / 6, radius / 6, radius / 6], brush.detailVoxels);
  const result = await designDispatcher().run(
    target
      ? {
          base: baseFor(target, fieldSpacing),
          ops: [{ type: "stamp", mode: "add", spec }],
          finish: finishFor(brush, fieldSpacing),
        }
      : { base: { kind: "stamp", spec, spacing: fieldSpacing }, ops: [], finish: finishFor(brush, fieldSpacing) },
  );
  if (!result) return false;
  design.applySculpt(target?.id ?? null, {
    field: result.field,
    original: result.original,
    current: result.current,
    source: target?.source ?? { kind: "tube", layerId: "", level: 0 },
  });
  return true;
}
