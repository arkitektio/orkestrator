/* eslint-disable react-hooks/immutability --
 * Writing `.value` on a TSL uniform node is how a frame's data reaches the GPU
 * without rebuilding the material; see `useVolumeRayUniforms.ts`. */
import { useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import * as THREE from "three";

import type { CropBox } from "../../../platform/coords/cropBox";
import { layersPlanKey } from "../../../platform/model/layerPlanKey";
import { useModeStore } from "../../../platform/stores/modeStore";
import { useSceneStoreApi } from "../../../platform/stores/sceneStore";
import { useViewerStoreApi } from "../../../platform/stores/viewerStore";
import { gatherLayerWorldBoxes } from "../../../platform/visibility/layerBoxes";
import type { DepthCodeUniforms } from "../gpu/depthCodeNodes";

type Vec3 = [number, number, number];

/**
 * The world box the depth ramp spans: the union of the visible layers'
 * RENDERED boxes, cut down to the crop box when there is one (a crop is how
 * one zooms the ramp onto a region). Null when nothing is visible or the
 * crop misses everything — the shader then sits mid-ramp.
 */
export const resolveDepthBox = (
  boxes: readonly THREE.Box3[],
  crop: CropBox | null,
): { min: Vec3; max: Vec3 } | null => {
  if (boxes.length === 0) return null;
  const union = new THREE.Box3();
  for (const box of boxes) union.union(box);
  if (crop) {
    union.intersect(
      new THREE.Box3(new THREE.Vector3(...crop.min), new THREE.Vector3(...crop.max)),
    );
  }
  if (union.isEmpty()) return null;
  return { min: union.min.toArray() as Vec3, max: union.max.toArray() as Vec3 };
};

/**
 * Feed a volume material the depth view's scene box (hold Q / Shift+Q).
 *
 * `uDepthCode` itself is NOT written here: the compositor flips it per pass
 * (`VolumeCompositor` → `material.userData.depthCodeUniform`), because a
 * normal pass and a packed-depth pass can run back to back in one frame.
 *
 * The view is a rare-cadence value (a key press), so the selector is
 * P17-clean. The BOX is gathered only while a depth view is on: on
 * activation, and again (coalesced to one rAF, after React has applied
 * visibility to the objects) when the trackables, the crop box or the
 * layers' placement / visibility (`layersPlanKey`) change. The camera needs
 * nothing from here — the shader projects the box's corners itself.
 *
 * Every change bumps `volumeInputs`: the compositor caches the volume frame
 * on that tracker, and without the bump holding Q would show nothing until
 * the camera moved.
 */
export const useDepthCodeUniforms = (nodes: DepthCodeUniforms | undefined): void => {
  const depthView = useModeStore((s) => s.depthView);
  const viewerStoreApi = useViewerStoreApi();
  const sceneStoreApi = useSceneStoreApi();
  const invalidate = useThree((state) => state.invalidate);
  const lastViewRef = useRef<typeof depthView>(null);

  useEffect(() => {
    if (!nodes) return;
    const commit = (reason: string) => {
      viewerStoreApi.getState().volumeInputs.bump(reason);
      invalidate();
    };

    // On AND off (not on mount): the compositor reads the view at its next
    // volume render, so a change must force one.
    if (lastViewRef.current !== depthView) {
      lastViewRef.current = depthView;
      commit("depth-view");
    }
    if (!depthView) return;

    const boxes: THREE.Box3[] = [];
    let last: { min: Vec3; max: Vec3 } | null | undefined;
    const gather = () => {
      const viewer = viewerStoreApi.getState();
      gatherLayerWorldBoxes(viewer.trackables, boxes);
      const box = resolveDepthBox(boxes, viewer.cropBox);
      const same =
        last !== undefined &&
        (last === box ||
          (!!last &&
            !!box &&
            last.min.every((v, i) => v === box.min[i]) &&
            last.max.every((v, i) => v === box.max[i])));
      if (same) return false;
      last = box;
      if (box) {
        nodes.uDepthBoxMin.value.set(...box.min);
        nodes.uDepthBoxMax.value.set(...box.max);
      } else {
        nodes.uDepthBoxMin.value.set(0, 0, 0);
        nodes.uDepthBoxMax.value.set(0, 0, 0);
      }
      return true;
    };
    gather();

    let frame: number | null = null;
    const schedule = () => {
      if (frame !== null) return;
      frame = requestAnimationFrame(() => {
        frame = null;
        if (gather()) commit("depth-view-box");
      });
    };
    let lastTrackables = viewerStoreApi.getState().trackables;
    let lastCrop = viewerStoreApi.getState().cropBox;
    const unsubscribeViewer = viewerStoreApi.subscribe((state) => {
      if (state.trackables === lastTrackables && state.cropBox === lastCrop) return;
      lastTrackables = state.trackables;
      lastCrop = state.cropBox;
      schedule();
    });
    // Only placement / visibility edits move the box; a contrast drag replaces
    // the layers every tick and must not re-walk the trackables (the walk
    // `CameraController` measured and moved off its hot path). `layersPlanKey`
    // is a per-layer-cached value signature that includes `visible`.
    let lastLayersKey = layersPlanKey(sceneStoreApi.getState().layers);
    const unsubscribeScene = sceneStoreApi.subscribe((state) => {
      const key = layersPlanKey(state.layers);
      if (key === lastLayersKey) return;
      lastLayersKey = key;
      schedule();
    });

    return () => {
      unsubscribeViewer();
      unsubscribeScene();
      if (frame !== null) cancelAnimationFrame(frame);
    };
  }, [nodes, depthView, viewerStoreApi, sceneStoreApi, invalidate]);
};
