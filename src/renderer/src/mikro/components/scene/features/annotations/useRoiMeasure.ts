import { useMemo } from "react";
import * as THREE from "three";

import { unitLabel } from "../../platform/coords/sceneUnits";
import { useSceneStore } from "../../platform/stores/sceneStore";
import { resolveCollectionMatrix, type AnnotationLayerVariant } from "./annotationBounds";
import { formatAnnotationMeasure, measureAnnotation } from "./roiMeasure";

/**
 * A shape's headline measure as the scene quotes it — "124 µm" for a path,
 * "10 × 4 µm · 40 µm²" for a rectangle — in WORLD units (the scale bar's),
 * through its layer's placement: the annotation list's readout, for one shape.
 * Null when the shape has no measure, or its layer is gone.
 */
export const useRoiMeasure = (roi: { layerId: string; kind: string; vectors: number[][] }): string | null => {
  const layer = useSceneStore((s) => s.sceneLayers.find((candidate) => candidate.id === roi.layerId));
  const transformContext = useSceneStore((s) => s.transformContext);
  const spatialUnit = useSceneStore((s) => s.spatialUnit);
  return useMemo(() => {
    if (layer?.__typename !== "AnnotationLayer" || !layer.annotationCollection) return null;
    const variant = layer as AnnotationLayerVariant;
    const matrix = resolveCollectionMatrix(variant, variant.annotationCollection!, transformContext);
    const world = roi.vectors.map((vector) => {
      const point = new THREE.Vector3(vector[0] ?? 0, vector[1] ?? 0, vector[2] ?? 0).applyMatrix4(matrix);
      return { x: point.x, y: point.y, z: point.z };
    });
    return formatAnnotationMeasure(measureAnnotation(roi.kind, world), unitLabel(spatialUnit));
  }, [layer, transformContext, spatialUnit, roi.kind, roi.vectors]);
};
