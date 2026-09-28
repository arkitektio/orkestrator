import * as THREE from "three";

import type { Vec3 } from "../../../platform/coords/levelGeometry";

/**
 * "Which LOD is the middle of the screen showing?" — the geometry half.
 *
 * The readout (`features/bricks/CenterLodReadout.tsx`) answers that question in two
 * steps: find the BASE VOXEL under the viewport's center pixel (here), then ask
 * the residency manager which level it can actually serve there
 * (`sampleResidentEx`, whose level walk IS the shader's per-sample coarse
 * fallback). This module is the first step, kept pure so the frame math is
 * testable without a canvas.
 *
 * Everything works in the layer's GROUP frame, which is base voxels: the
 * affine maps corner-anchored base-voxel coordinates straight to world
 * (COORDINATE_SYSTEMS.md §0), and level 0's `scale` is [1,1,1] by construction
 * (`LevelGeometry.scale` = base voxels per level voxel). So a group-local
 * position IS a fractional base-voxel index — no separate physical frame.
 */

export type CenterRay = {
  origin: THREE.Vector3;
  direction: THREE.Vector3;
};

/**
 * The world-space ray through the viewport's center pixel, unprojected from
 * the camera's view-projection matrix.
 *
 * Two NDC depths on the center axis define the ray for orthographic and
 * perspective cameras alike (the camera POSITION is not on the ray under
 * ortho, so it cannot be the origin). The near depth is convention-dependent —
 * 0 under WebGPU, -1 under WebGL — exactly like `platform/visibility/frustumClip.ts`, and the
 * origin must sit at the near plane so a 3D box entry point in front of the
 * camera is never mistaken for one behind it.
 */
export function centerWorldRay(
  viewProjectionMatrix: THREE.Matrix4,
  coordinateSystem: number = THREE.WebGLCoordinateSystem,
): CenterRay | null {
  const inverse = new THREE.Matrix4().copy(viewProjectionMatrix).invert();
  const ndcNearZ = coordinateSystem === THREE.WebGPUCoordinateSystem ? 0 : -1;
  const origin = new THREE.Vector3(0, 0, ndcNearZ).applyMatrix4(inverse);
  const far = new THREE.Vector3(0, 0, 1).applyMatrix4(inverse);
  const direction = far.sub(origin);
  // A singular matrix (three zeroes the inverse) or a degenerate frustum
  // leaves nothing to point at.
  if (!Number.isFinite(direction.lengthSq()) || direction.lengthSq() < 1e-20) return null;
  if (!Number.isFinite(origin.lengthSq())) return null;
  return { origin, direction: direction.normalize() };
}

export type CenterVoxelQuery = {
  /** Which shape the layer draws — the plan's own mode, not the scene's. */
  mode: "2D" | "3D";
  ray: CenterRay;
  /** The layer's affine: corner-anchored base voxels → world. */
  affine: THREE.Matrix4;
  /** Level-0 extent in base voxels. */
  baseShape: Vec3;
  /**
   * 2D only: base-voxel z of the displayed slab (`LayerNodePlan.slabZ`). The
   * plane's geometry always sits at group-local z = 0 — the slab is a texture
   * lookup, not a position — so the hit point cannot supply this.
   */
  slabZ?: number | null;
};

/**
 * The base-level voxel the center pixel looks at, or null when the center of
 * the screen is not over this layer's data.
 *
 * 2D takes the plane at group-local z = 0 (`BrickPlaneLayer`'s quad); 3D takes
 * the ENTRY point of the ray into the layer's box. Entry rather than "first
 * visible sample": the shader's `desiredLevelAt` is monotone non-finer along a
 * forward ray (see `features/bricks/shaderspec/raymarchStep.ts`), so the entry point is where the
 * finest level on that ray is desired — the honest answer to "how good is what
 * I'm looking at", and the one a CPU march could only refine, never beat.
 */
export function centerBaseVoxel(query: CenterVoxelQuery): Vec3 | null {
  const { mode, ray, affine, baseShape } = query;
  const inverse = new THREE.Matrix4().copy(affine).invert();
  const origin = ray.origin.clone().applyMatrix4(inverse);
  // transformDirection renormalizes, which is fine: only the ray PARAMETER
  // scales with the direction's length, and every use of it below is a
  // position, never a distance.
  const direction = ray.direction.clone().transformDirection(inverse);

  const clampIndex = (value: number, extent: number): number =>
    Math.max(0, Math.min(Math.max(1, extent) - 1, Math.floor(value)));

  if (mode === "2D") {
    if (Math.abs(direction.z) < 1e-9) return null; // ray parallel to the quad
    const t = -origin.z / direction.z;
    if (t < 0) return null; // the plane is behind the camera
    const x = origin.x + t * direction.x;
    const y = origin.y + t * direction.y;
    if (x < 0 || x >= baseShape[0] || y < 0 || y >= baseShape[1]) return null;
    return [
      clampIndex(x, baseShape[0]),
      clampIndex(y, baseShape[1]),
      clampIndex(query.slabZ ?? 0, baseShape[2]),
    ];
  }

  const hit = intersectVoxelBox(origin, direction, baseShape);
  if (hit === null) return null;
  return [
    clampIndex(origin.x + hit * direction.x, baseShape[0]),
    clampIndex(origin.y + hit * direction.y, baseShape[1]),
    clampIndex(origin.z + hit * direction.z, baseShape[2]),
  ];
}

/**
 * Slab test against the corner-anchored box [0, shape] in base voxels,
 * returning the ENTRY ray parameter (0 when the camera is inside the box) or
 * null when the ray misses it entirely / the box is wholly behind the camera.
 *
 * Not `features/bricks/probeMath.ts intersectLocalVolumeBox`: that one works in the
 * volume mesh's own unit box ([-0.5, 0.5]³, which needs the mesh's world
 * matrix), and this readout is deliberately mesh-free — it runs outside the
 * canvas, off the affine alone.
 */
function intersectVoxelBox(
  origin: THREE.Vector3,
  direction: THREE.Vector3,
  shape: Vec3,
): number | null {
  let near = -Infinity;
  let far = Infinity;

  for (let axis = 0; axis < 3; axis++) {
    const component = axis === 0 ? "x" : axis === 1 ? "y" : "z";
    const d = direction[component];
    const o = origin[component];
    const max = shape[axis];
    if (Math.abs(d) < 1e-9) {
      if (o < 0 || o > max) return null;
      continue;
    }
    const t1 = (0 - o) / d;
    const t2 = (max - o) / d;
    near = Math.max(near, Math.min(t1, t2));
    far = Math.min(far, Math.max(t1, t2));
  }

  if (near > far || far < 0) return null;
  return Math.max(near, 0);
}

/**
 * How much coarser than level 0 a level is, for the badge: the largest
 * per-axis factor. Max, not min or mean, because a level that keeps z at full
 * rate while quartering x/y (the usual microscopy pyramid) is a quarter-res
 * picture — the axis that lost the most detail is the one you see.
 */
export function levelDownsampleFactor(scale: Vec3): number {
  return Math.max(scale[0], scale[1], scale[2]);
}
