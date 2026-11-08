import { useCallback } from "react";
import * as THREE from "three";
import type { SceneAnnotationFragment } from "@/mikro/api/graphql";
import {
  getWorldExtent,
  resolveCollectionMatrix,
  worldExtentToBox3,
  type AnnotationLayerVariant,
} from "./annotationBounds";
import { applyFitToCamera, panCameraTo } from "@/core/data/scene/camera/cameraFit";
import { useModeStoreApi } from "../../platform/stores/modeStore";
import { useSceneStoreApi } from "../../platform/stores/sceneStore";
import { useViewerStoreApi } from "../../platform/stores/viewerStore";

/**
 * Jump the camera to an annotation, instantly. In 3D a PAN: the annotation's
 * center comes to the middle of the view, the angle and distance the user
 * chose stay (`panCameraTo`). In 2D, and with `frame` (a page landing ON the
 * annotation), a reframe — the same move as "fit camera to layer". In the flat view the annotation may live on another
 * slice, so navigation also moves `currentZ` and the non-z dim selections to
 * the annotation's pins (the pairing `AnimationPlayer` uses); framing alone
 * would center an empty patch.
 *
 * Store APIs, not subscriptions: navigation reads everything at click time, so
 * list rows never re-render at camera or z cadence.
 */
export const useNavigateToAnnotation = () => {
  const sceneStoreApi = useSceneStoreApi();
  const viewerStoreApi = useViewerStoreApi();
  const modeStoreApi = useModeStoreApi();

  return useCallback(
    (
      annotation: SceneAnnotationFragment,
      layer: AnnotationLayerVariant,
      options: { frame?: boolean } = {},
    ) => {
      if (!layer.annotationCollection) return;
      const { transformContext, layers } = sceneStoreApi.getState();
      const matrix = resolveCollectionMatrix(
        layer,
        layer.annotationCollection,
        transformContext,
      );
      const extent = getWorldExtent(annotation, matrix);
      if (!extent) return;

      const viewer = viewerStoreApi.getState();
      const flat = modeStoreApi.getState().displayMode !== "3D";

      if (flat) {
        viewer.setCurrentZ((extent.zSpan.min + extent.zSpan.max) / 2);
        // Pins named after an image z axis are resolved from `currentZ`, not
        // `dimSelections` — the store's contract (`viewerStore.dimSelections`
        // is not for z). Only the remaining dims move.
        const zAxes = new Set(
          layers.map((imageLayer) => imageLayer.zAxis).filter(Boolean),
        );
        for (const pin of annotation.coordinates ?? []) {
          if (!zAxes.has(pin.name)) viewer.setDimSelection(pin.name, pin.value);
        }
      }

      const canvas = viewer.canvas;
      if (!canvas) return;
      // A POINT (or flat shape) has zero extent on some axis; pad so it frames
      // to roughly 80 px at the current zoom instead of a degenerate fit.
      const minHalfExtent = Math.max(viewer.worldUnitsPerPixel * 40, 1e-3);
      const box = worldExtentToBox3(extent, minHalfExtent);
      if (!flat && !options.frame) panCameraTo(box.getCenter(new THREE.Vector3()), canvas);
      else applyFitToCamera(box, canvas);
    },
    [sceneStoreApi, viewerStoreApi, modeStoreApi],
  );
};
