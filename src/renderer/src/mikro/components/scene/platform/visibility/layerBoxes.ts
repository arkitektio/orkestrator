import * as THREE from "three";
import type { CropBox } from "../coords/cropBox";

/**
 * The structural slice of `viewerStore.TrackableObject` the box gather needs —
 * structural on purpose, so pure-core stays import-free of the store types
 * (the `platform/camera/orbitPivot.ts` pattern).
 */
export type LayerTrackable = {
  kind: string;
  ref: { current: THREE.Object3D | null | undefined };
};

const scratchBox = new THREE.Box3();
const scratchCrop = new THREE.Box3();

/**
 * World-space bounding boxes of every VISIBLE layer trackable, written into
 * the pooled `out` array (grown once, reused per gather — the array is
 * truncated to the live count; entries are overwritten in place). Shared by
 * `PanScaleSync` (settle/gesture retarget) and the double-click recenter —
 * both need "where is the content" against the same box walk that
 * `platform/visibility/visibility.ts` already does per rAF, so this runs strictly less
 * often than that.
 *
 * With a `crop` box each layer box is clipped to it and a layer wholly
 * outside is dropped: nothing outside the crop is drawn, so "where is the
 * content" must not land there (pivot depth, pan speed, recenter). Callers
 * that place a NEW crop pass none.
 */
export function gatherLayerWorldBoxes(
  trackables: Iterable<LayerTrackable>,
  out: THREE.Box3[],
  crop?: CropBox | null,
): void {
  if (crop) {
    scratchCrop.min.fromArray(crop.min);
    scratchCrop.max.fromArray(crop.max);
  }
  let count = 0;
  for (const trackable of trackables) {
    if (trackable.kind !== "layer") continue;
    const object = trackable.ref.current;
    if (!object || object.visible === false) continue;
    scratchBox.setFromObject(object);
    if (crop) scratchBox.intersect(scratchCrop);
    if (scratchBox.isEmpty()) continue;
    (out[count] ??= new THREE.Box3()).copy(scratchBox);
    count += 1;
  }
  out.length = count;
}
