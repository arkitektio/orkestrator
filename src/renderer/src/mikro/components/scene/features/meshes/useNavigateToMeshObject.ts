import { useCallback } from "react";
import * as THREE from "three";
import { applyFitToCamera, padDegenerateAxes } from "@/core/lib/scene/camera/cameraFit";
import type { FabriksObjectEntry } from "./fabriks/fabriksCatalogs";
import { useModeStoreApi } from "../../platform/stores/modeStore";
import { useViewerStoreApi } from "../../platform/stores/viewerStore";

/**
 * A catalog object's voxel-space AABB in world space.
 *
 * `Box3.applyMatrix4` transforms all eight corners and re-bounds them — the
 * same thing `buildFabriksCellIndex` does for cells — so a rotated or sheared
 * placement frames correctly rather than by its two extreme corners.
 */
export const meshObjectBox = (
  entry: FabriksObjectEntry,
  matrix: THREE.Matrix4,
): THREE.Box3 =>
  new THREE.Box3(
    new THREE.Vector3(...entry.bboxMin),
    new THREE.Vector3(...entry.bboxMax),
  ).applyMatrix4(matrix);

/**
 * Jump the camera to a world box — the mesh twin of `useNavigateToAnnotation`,
 * and the ONLY way to frame a mesh: mesh layers register no trackable, so
 * `viewerStore.fitToLayer` throws for a `MeshLayer` and the Layers panel's
 * focus button never covered them.
 *
 * Moving `currentZ` in 2D is load-bearing, not parity: the layer clips itself
 * to a slab around `currentZ` (`FabriksCollectionLayer` → `setSlabClip`), so a
 * reframe alone would centre an empty patch whenever the object sits off the
 * displayed slice.
 *
 * Store APIs, not subscriptions: everything is read at click time, so list rows
 * never re-render at camera or z cadence.
 */
export const useNavigateToMeshBox = () => {
  const viewerStoreApi = useViewerStoreApi();
  const modeStoreApi = useModeStoreApi();

  return useCallback(
    (box: THREE.Box3) => {
      if (box.isEmpty()) return;
      const viewer = viewerStoreApi.getState();

      if (modeStoreApi.getState().displayMode !== "3D") {
        viewer.setCurrentZ((box.min.z + box.max.z) / 2);
      }

      const canvas = viewer.canvas;
      if (!canvas) return;
      // A one-voxel-thick object has near-zero extent on some axis; pad so it
      // frames to roughly 80 px at the current zoom instead of a degenerate fit.
      const minHalfExtent = Math.max(viewer.worldUnitsPerPixel * 40, 1e-3);
      applyFitToCamera(padDegenerateAxes(box.clone(), minHalfExtent), canvas);
    },
    [viewerStoreApi, modeStoreApi],
  );
};
