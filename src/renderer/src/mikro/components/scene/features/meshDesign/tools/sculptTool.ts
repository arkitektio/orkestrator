import { Hand } from "lucide-react";

import type { Vec3 } from "../field/stamps";
import { designDispatcher } from "../worker/designDispatcher";
import type { DesignOp } from "../worker/designJob";
import { baseFor, fieldSpacingFor, finishFor } from "./context";
import type { BrushSkeletonState } from "../brush";
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
  icon: Hand,
  group: "primary",
  gesture: "surface",
  hint: "Drag on the mesh to inflate / deflate / smooth it",
  shortcut: { keys: ["B", "drag"], description: "Sculpt: drag on the mesh surface" },
};

/** The brush sphere is half the extraction radius — sculpting is local. */
const SCULPT_RADIUS_FACTOR = 0.5;

/** The field ops one sculpt drag amounts to, for a field of `spacing`. */
export function sculptOps(
  points: readonly Vec3[],
  radiusWorld: number,
  variant: SculptVariant,
  spacing: number,
): DesignOp[] {
  const radius = Math.max(spacing, radiusWorld * SCULPT_RADIUS_FACTOR);
  const stroke = points.map((point) => [point[0], point[1], point[2]] as const);
  if (variant === "inflate") {
    return [{ type: "stamp", mode: "add", spec: { kind: "capsuleChain", points: stroke, radius } }];
  }
  if (variant === "deflate") return [{ type: "subtractCapsule", stroke, radius }];
  return [{ type: "smoothSpheres", points: stroke, radius }];
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
  const result = await designDispatcher().run({
    base: baseFor(target, fieldSpacing),
    ops: sculptOps(points, radius, design.sculptVariant, fieldSpacing),
    finish: finishFor(brush, fieldSpacing),
    skipUnchanged: true,
  });
  if (!result || !result.changed) return false;
  design.applySculpt(target.id, {
    field: result.field,
    original: result.original,
    current: result.current,
    source: target.source,
  });
  return true;
}
