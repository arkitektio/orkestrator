import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { createSlabPlanes, updateSlabPlanes } from "./slabClip";

/** A point is kept when it is on the positive side of BOTH planes. */
const kept = (planes: ReturnType<typeof createSlabPlanes>, z: number): boolean =>
  planes.every((p) => p.distanceToPoint(new THREE.Vector3(0, 0, z)) >= 0);

describe("slab clip planes", () => {
  it("keeps exactly the slab, and rejects both sides of it", () => {
    const planes = createSlabPlanes();
    updateSlabPlanes(planes, { z: 10, thickness: 4 });
    expect(kept(planes, 10)).toBe(true); // centre
    expect(kept(planes, 8.1)).toBe(true); // just inside the bottom
    expect(kept(planes, 11.9)).toBe(true); // just inside the top
    expect(kept(planes, 7.9)).toBe(false); // below
    expect(kept(planes, 12.1)).toBe(false); // above
  });

  it("pins the normal/constant pairing that the two managers used to spell differently", () => {
    const planes = createSlabPlanes();
    updateSlabPlanes(planes, { z: 10, thickness: 4 });
    expect(planes[0].normal.toArray()).toEqual([0, 0, -1]);
    expect(planes[0].constant).toBe(12); // z + half
    expect(planes[1].normal.toArray()).toEqual([0, 0, 1]);
    expect(planes[1].constant).toBe(-8); // -(z - half)
  });

  it("mutates in place so a z-scrub never reallocates", () => {
    const planes = createSlabPlanes();
    const [a, b] = planes;
    updateSlabPlanes(planes, { z: 1, thickness: 2 });
    updateSlabPlanes(planes, { z: 50, thickness: 2 });
    expect(planes[0]).toBe(a);
    expect(planes[1]).toBe(b);
    expect(kept(planes, 50)).toBe(true);
    expect(kept(planes, 1)).toBe(false);
  });

  it("keeps a zero-thickness slab describing a region, not nothing", () => {
    const planes = createSlabPlanes();
    updateSlabPlanes(planes, { z: 3, thickness: 0 });
    expect(kept(planes, 3)).toBe(true);
  });
});
