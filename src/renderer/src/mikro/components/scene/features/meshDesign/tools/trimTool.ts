import * as THREE from "three";

import { marchField, meshToField } from "../field/sculptField";
import { applyStamp, halfspaceStamp } from "../field/stamps";
import { finishDesignGeometry } from "../ops/postProcess";
import { fieldSpacingFor } from "./context";
import type { BrushSkeletonState } from "../../annotations/enhancers/brushSkeletonStore";
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
  gesture: "screen",
  roiTool: null,
  hint: "Trimming — drag a line across the mesh; the drag's left side is cut away",
  shortcut: { keys: ["T", "drag"], description: "Cut the mesh along a screen line" },
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
  const field = target.field ?? meshToField(target.original, fieldSpacing);
  const cut = applyStamp(field, halfspaceStamp(plane.normal, plane.distance), "subtract");
  if (cut === field) return false;
  const marched = marchField(cut, brush.marcher);
  const { original, current } = await finishDesignGeometry(marched, {
    polishIterations: brush.polishIterations,
    detailWorld: brush.detailVoxels * fieldSpacing,
  });
  design.applySculpt(target.id, { field: cut, original, current, source: target.source });
  return true;
}
