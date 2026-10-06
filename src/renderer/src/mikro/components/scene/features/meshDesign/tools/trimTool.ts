import { Slice } from "lucide-react";

import * as THREE from "three";

import { designDispatcher } from "../worker/designDispatcher";
import { baseFor, fieldSpacingFor, finishFor } from "./context";
import type { BrushSkeletonState } from "../brush";
import type { DesignMesh, MeshDesignState } from "../store/meshDesignStore";
import type { DesignTool } from "./registry";

/**
 * T — trim: drag a line across the screen; the plane through that line along
 * the view direction cuts the ACTIVE mesh, removing the side to the drag's
 * left. A boolean cut through the field, so the cross-section closes.
 */
export const trimTool: DesignTool = {
  id: "trim",
  key: "t",
  label: "Trim",
  icon: Slice,
  group: "more",
  gesture: "screen",
  hint: "Drag a line across the mesh; the drag's left side is cut away",
  shortcut: { keys: ["T", "drag"], description: "Trim: cut the mesh along a screen line" },
};

/**
 * The cutting plane of a screen-space drag: through both unprojected points,
 * containing the view direction. Its normal points to the drag's LEFT — the
 * removed side.
 */
export function planeFromScreenDrag(
  camera: THREE.Camera,
  startNdc: THREE.Vector2,
  endNdc: THREE.Vector2,
): { normal: [number, number, number]; distance: number } | null {
  const a = new THREE.Vector3(startNdc.x, startNdc.y, 0.5).unproject(camera);
  const b = new THREE.Vector3(endNdc.x, endNdc.y, 0.5).unproject(camera);
  const view = camera.getWorldDirection(new THREE.Vector3());
  const along = b.clone().sub(a);
  if (along.lengthSq() < 1e-12) return null;
  const normal = view.clone().cross(along).normalize();
  if (!Number.isFinite(normal.x) || normal.lengthSq() < 0.5) return null;
  return { normal: [normal.x, normal.y, normal.z], distance: normal.dot(a) };
}

/** Cut `target` with the plane; false when the cut misses it entirely. */
export async function applyTrim(
  design: MeshDesignState,
  brush: BrushSkeletonState,
  target: DesignMesh,
  plane: { normal: [number, number, number]; distance: number },
): Promise<boolean> {
  const fieldSpacing = target.field?.spacing ?? fieldSpacingFor([1, 1, 1], brush.detailVoxels);
  const result = await designDispatcher().run({
    base: baseFor(target, fieldSpacing),
    ops: [
      {
        type: "stamp",
        mode: "subtract",
        spec: { kind: "halfspace", normal: plane.normal, distance: plane.distance },
      },
    ],
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
