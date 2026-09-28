import * as THREE from "three";

/**
 * The two world-space clip planes of a 2D slab, in a FIXED order.
 *
 * `[0]` keeps `z <= top` (normal `-z`), `[1]` keeps `z >= bottom` (normal
 * `+z`). Both halves of a plane — the normal and the constant — have to agree,
 * and three's `Plane` keeps them apart, so the pairing is the thing worth
 * stating once.
 *
 * ## Why this exists
 *
 * The fabriks and konnektion managers each grew their own copy, and they wrote
 * the pair in OPPOSITE orders: fabriks declared `[-z, +z]` and assigned
 * `[0] = z + half`, konnektion declared `[+z, -z]` and assigned
 * `[0] = -(z - half)`. Both were internally consistent, so both were correct —
 * they agreed only by coincidence, with no test covering it and nothing
 * stopping the next edit to one from silently disagreeing with the other.
 *
 * Constants are MUTATED in place, never reassigned: a z-scrub must not
 * reallocate the planes the renderer already holds, and both managers rely on
 * that (they hand the same array to their clipping group once, at construction).
 */
export type SlabPlanes = readonly [THREE.Plane, THREE.Plane];

export const createSlabPlanes = (): SlabPlanes => [
  new THREE.Plane(new THREE.Vector3(0, 0, -1), 0), // keeps z <= slab top
  new THREE.Plane(new THREE.Vector3(0, 0, 1), 0), //  keeps z >= slab bottom
];

/** Point the planes at a slab centred on `z`. Thickness is clamped away from
 *  zero so a degenerate slab still describes a (very thin) region rather than
 *  an empty one. */
export const updateSlabPlanes = (
  planes: SlabPlanes,
  slab: { z: number; thickness: number },
): void => {
  const half = Math.max(slab.thickness, 1e-6) / 2;
  planes[0].constant = slab.z + half;
  planes[1].constant = -(slab.z - half);
};
