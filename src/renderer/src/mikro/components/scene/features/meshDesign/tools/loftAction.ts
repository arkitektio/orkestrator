import * as THREE from "three";

import { AnnotationKind } from "@/mikro/api/graphql";
import { resolveCollectionMatrix } from "../../annotations/annotationBounds";
import type { SelectedRoi } from "../../annotations/roiSelectionStore";
import type { SceneState } from "../../../platform/stores/sceneStore";
import type { BrushSkeletonState } from "../../annotations/enhancers/brushSkeletonStore";
import { marchField } from "../field/sculptField";
import { loftContours, type LoftContour } from "../field/loft";
import { finishDesignGeometry } from "../ops/postProcess";
import type { MeshDesignState } from "../store/meshDesignStore";

/**
 * Loft the SELECTED polygon annotations (traced on different z-slices in the
 * 2D view) into one closed design mesh — serial-section reconstruction.
 * A toolbar ACTION, not a held-key tool: it consumes a selection.
 */
export async function loftSelectedPolygons(
  design: MeshDesignState,
  brush: BrushSkeletonState,
  scene: SceneState,
  selected: readonly SelectedRoi[],
): Promise<string | null> {
  const polygons = selected.filter(
    (roi) => roi.kind === AnnotationKind.Polygon && roi.vectors.length >= 3,
  );
  if (polygons.length < 2) {
    design.setStatus("editing", "Select two or more polygon annotations on different slices first");
    return null;
  }
  const contours: LoftContour[] = [];
  for (const roi of polygons) {
    // ROI vectors are COLLECTION space; resolve the layer's matrix to world.
    const layer = scene.sceneLayers.find((candidate) => candidate.id === roi.layerId);
    let matrix = new THREE.Matrix4();
    if (layer?.__typename === "AnnotationLayer" && layer.annotationCollection) {
      matrix = resolveCollectionMatrix(layer, layer.annotationCollection, scene.transformContext);
    }
    const world = roi.vectors.map((vector) => {
      const p = new THREE.Vector3(vector[0] ?? 0, vector[1] ?? 0, vector[2] ?? 0).applyMatrix4(matrix);
      return p;
    });
    contours.push({
      points: world.map((p) => [p.x, p.y] as const),
      z: world.reduce((sum, p) => sum + p.z, 0) / world.length,
    });
  }
  const zSpread = Math.max(...contours.map((c) => c.z)) - Math.min(...contours.map((c) => c.z));
  if (zSpread <= 0) {
    design.setStatus("editing", "The selected polygons sit on the same slice — trace them at different z");
    return null;
  }
  // Field resolution from the slice gap: fine enough to carry each contour.
  const spacing = Math.max(zSpread / Math.max(8, contours.length * 4), 1e-6);
  let field;
  try {
    field = loftContours(contours, spacing);
  } catch (error) {
    design.setStatus("editing", error instanceof Error ? error.message : String(error));
    return null;
  }
  const { original, current } = await finishDesignGeometry(marchField(field, brush.marcher), {
    polishIterations: brush.polishIterations,
    detailWorld: brush.detailVoxels * spacing,
  });
  return design.applySculpt(null, {
    field,
    original,
    current,
    source: { kind: "blob", layerId: polygons[0].layerId, level: 0 },
  });
}
