import * as THREE from "three";

import { AnnotationKind } from "@/mikro/api/graphql";
import { resolveCollectionMatrix } from "../../annotations/annotationBounds";
import type { SelectedRoi } from "../../annotations/roiSelectionStore";
import type { SceneState } from "../../../platform/stores/sceneStore";
import type { BrushSkeletonState } from "../brush";
import { designDispatcher } from "../worker/designDispatcher";
import { baseFor, fieldSpacingFor, finishFor, targetMesh } from "./context";
import type { MeshDesignState } from "../store/meshDesignStore";

/**
 * Sweep the SELECTED path annotation into a tube at the brush radius and add
 * it to the design — the parametric sibling of the brush: the skeleton is an
 * annotation (light, editable), the swept tube a designed mesh. Constant
 * radius for now; per-point radius handles are the obvious refinement.
 */
export async function tubeFromSelectedPath(
  design: MeshDesignState,
  brush: BrushSkeletonState,
  scene: SceneState,
  selected: readonly SelectedRoi[],
): Promise<string | null> {
  const path = selected.find((roi) => roi.kind === AnnotationKind.Path && roi.vectors.length >= 2);
  if (!path) {
    design.setStatus("editing", "Select a path annotation first (draw one with the brush in Annotate)");
    return null;
  }
  const radius = brush.radiusWorld ?? 0;
  if (radius <= 0) {
    design.setStatus("editing", "Set a brush radius first");
    return null;
  }
  const layer = scene.sceneLayers.find((candidate) => candidate.id === path.layerId);
  let matrix = new THREE.Matrix4();
  if (layer?.__typename === "AnnotationLayer" && layer.annotationCollection) {
    matrix = resolveCollectionMatrix(layer, layer.annotationCollection, scene.transformContext);
  }
  const points = path.vectors.map((vector) => {
    const p = new THREE.Vector3(vector[0] ?? 0, vector[1] ?? 0, vector[2] ?? 0).applyMatrix4(matrix);
    return [p.x, p.y, p.z] as const;
  });
  const spec = { kind: "capsuleChain", points, radius } as const;
  const target = targetMesh(design);
  const spacing = target?.field?.spacing ?? fieldSpacingFor([radius / 6, radius / 6, radius / 6], brush.detailVoxels);
  const result = await designDispatcher().run(
    target
      ? { base: baseFor(target, spacing), ops: [{ type: "stamp", mode: "add", spec }], finish: finishFor(brush, spacing) }
      : { base: { kind: "stamp", spec, spacing }, ops: [], finish: finishFor(brush, spacing) },
  );
  if (!result) return null;
  return design.applySculpt(target?.id ?? null, {
    field: result.field,
    original: result.original,
    current: result.current,
    source: { kind: "tube", layerId: path.layerId, level: 0 },
  });
}
