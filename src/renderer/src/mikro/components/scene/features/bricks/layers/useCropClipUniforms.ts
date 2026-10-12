/* eslint-disable react-hooks/immutability --
 * Writing `.value` on a TSL uniform node is how a frame's data reaches the GPU
 * without rebuilding the material; see `useVolumeRayUniforms.ts`. */
import { useThree } from "@react-three/fiber";
import { useEffect } from "react";
import * as THREE from "three";

import { cropBoxToVoxelAabb, type CropBox } from "../../../platform/coords/cropBox";
import { affineToMatrix4 } from "../../../platform/coords/worldTransform";
import { useViewerStoreApi } from "../../../platform/stores/viewerStore";
import { CLIP_UNBOUNDED, type ClipUniformNodes } from "../gpu/volumeRayNodes";

/**
 * What `uClipMin` / `uClipMax` should hold for a layer: its share of the crop
 * box in base voxels, the resting pair without a crop, and an INVERTED pair
 * (which the shader discards outright) for a layer outside the box.
 *
 * `cropBoxToVoxelAabb` is the planner's function too (`nodePlanTracker`), which
 * is the point: the box the shader marches and the box the planner loads are
 * one computation, not two that agree.
 */
export const resolveCropClip = (
  box: CropBox | null,
  worldToVoxel: THREE.Matrix4,
  shape: readonly [number, number, number],
): { min: [number, number, number]; max: [number, number, number] } => {
  if (!box) {
    return {
      min: [-CLIP_UNBOUNDED, -CLIP_UNBOUNDED, -CLIP_UNBOUNDED],
      max: [CLIP_UNBOUNDED, CLIP_UNBOUNDED, CLIP_UNBOUNDED],
    };
  }
  return (
    cropBoxToVoxelAabb(box, worldToVoxel, shape) ?? {
      min: [CLIP_UNBOUNDED, CLIP_UNBOUNDED, CLIP_UNBOUNDED],
      max: [-CLIP_UNBOUNDED, -CLIP_UNBOUNDED, -CLIP_UNBOUNDED],
    }
  );
};

/**
 * Drive a brick material's crop uniforms off the store's crop box.
 *
 * A vanilla subscription, not a selector: the box moves per wheel notch while
 * its depth is being set, and a layer must not re-render for it (P17).
 *
 * `affine` is the layer's RAW affine, whose identity survives the per-tick
 * layer replacement of a contrast drag — depending on the layer itself would
 * resubscribe sixty times a second.
 */
export const useCropClipUniforms = (
  nodes: ClipUniformNodes | undefined,
  affine: number[][] | null | undefined,
  shape: readonly number[] | undefined,
): void => {
  const viewerStoreApi = useViewerStoreApi();
  const invalidate = useThree((state) => state.invalidate);
  const sx = shape?.[0];
  const sy = shape?.[1];
  const sz = shape?.[2];

  useEffect(() => {
    if (!nodes || sx === undefined || sy === undefined || sz === undefined) return;
    const worldToVoxel = affineToMatrix4(affine).invert();
    let last: CropBox | null | undefined;
    const apply = () => {
      const box = viewerStoreApi.getState().cropBox;
      if (box === last) return;
      last = box;
      const clip = resolveCropClip(box, worldToVoxel, [sx, sy, sz]);
      nodes.uClipMin.value.set(clip.min[0], clip.min[1], clip.min[2]);
      nodes.uClipMax.value.set(clip.max[0], clip.max[1], clip.max[2]);
      // The compositor caches the volume frame on this tracker; without the
      // bump a moved box would keep showing the old cut.
      viewerStoreApi.getState().volumeInputs.bump("crop-box");
      invalidate();
    };
    apply();
    return viewerStoreApi.subscribe(apply);
  }, [nodes, affine, sx, sy, sz, viewerStoreApi, invalidate]);
};
