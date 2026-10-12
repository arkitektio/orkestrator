import * as THREE from "three";
import * as TSLTyped from "three/tsl";
import type { StoreApi } from "zustand";

import { bindField } from "@/core/data/scene/stores/bindStore";
import { CROP_PLANE_FAR, type CropBox } from "../coords/cropBox";

// Same dynamic-typing bargain as the brick materials: three's TSL TypeScript
// surface does not expose the comparison methods the graph calls.
/* eslint-disable @typescript-eslint/no-explicit-any */
const TSL = TSLTyped as any;
const { modelWorldMatrix, uniform, vec3, vec4 } = TSL;

/**
 * The crop box as a pair of WORLD-space uniforms, for the instanced layers
 * whose materials place their own vertices (vectors, tracks).
 *
 * Those cannot use a `ClippingGroup` the way meshes and networks do: the group
 * clips on `positionView`, which three derives from the bound `position`
 * attribute — for an instanced glyph that is the TEMPLATE near the origin, not
 * where the instance is drawn. So they test an instance's own anchor against
 * the box instead, and drop the instance whole: half an arrow says nothing.
 *
 * Resting at ±`CROP_PLANE_FAR`, where the test passes everything, so a
 * material needs no "is there a crop" branch.
 */
export type CropUniformNodes = {
  uCropMin: { value: THREE.Vector3 };
  uCropMax: { value: THREE.Vector3 };
};

export const createCropUniforms = (): CropUniformNodes => ({
  uCropMin: uniform(new THREE.Vector3(-CROP_PLANE_FAR, -CROP_PLANE_FAR, -CROP_PLANE_FAR), "vec3"),
  uCropMax: uniform(new THREE.Vector3(CROP_PLANE_FAR, CROP_PLANE_FAR, CROP_PLANE_FAR), "vec3"),
});

/** A boolean node: is this OBJECT-space point inside the crop box? */
export const insideCropBox = (localPosition: any, nodes: CropUniformNodes): any => {
  const world = vec3(modelWorldMatrix.mul(vec4(vec3(localPosition), 1.0)).xyz);
  const lo = vec3(nodes.uCropMin);
  const hi = vec3(nodes.uCropMax);
  return world.x
    .greaterThanEqual(lo.x)
    .and(world.x.lessThanEqual(hi.x))
    .and(world.y.greaterThanEqual(lo.y))
    .and(world.y.lessThanEqual(hi.y))
    .and(world.z.greaterThanEqual(lo.z))
    .and(world.z.lessThanEqual(hi.z));
};

export const writeCropUniforms = (nodes: CropUniformNodes, box: CropBox | null): void => {
  if (box) {
    nodes.uCropMin.value.set(box.min[0], box.min[1], box.min[2]);
    nodes.uCropMax.value.set(box.max[0], box.max[1], box.max[2]);
  } else {
    nodes.uCropMin.value.set(-CROP_PLANE_FAR, -CROP_PLANE_FAR, -CROP_PLANE_FAR);
    nodes.uCropMax.value.set(CROP_PLANE_FAR, CROP_PLANE_FAR, CROP_PLANE_FAR);
  }
};

/**
 * Keep a material's crop uniforms on the store's crop box. A vanilla binding:
 * the box moves while its depth is being set and must not re-render the layer.
 * Returns the unsubscribe.
 */
export const bindCropUniforms = (
  viewerApi: StoreApi<{ cropBox: CropBox | null }>,
  nodes: CropUniformNodes,
  invalidate: () => void,
): (() => void) =>
  bindField(
    viewerApi,
    (state) => state.cropBox,
    (box) => {
      writeCropUniforms(nodes, box);
      invalidate();
    },
  );
