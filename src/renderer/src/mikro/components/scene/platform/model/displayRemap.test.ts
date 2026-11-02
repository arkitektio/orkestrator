import { describe, expect, it } from "vitest";
import {
  composeDeltas,
  defaultRemapSlot,
  isAlignedTo,
  isRemapActive,
  isotropicRemap,
  remapDelta,
  remapViewPoint,
  unremapViewPoint,
  type DisplayRemap,
} from "./displayRemap";

const Z3 = { slot: 2, factor: 3, pivot: 10 } satisfies DisplayRemap;
const XZ_VIEW = [0, 2, 1] as const; // screen y shows world z

const apply = (m: readonly (readonly number[])[], p: [number, number, number]) =>
  [0, 1, 2].map((r) => m[r][0] * p[0] + m[r][1] * p[1] + m[r][2] * p[2] + m[r][3]);

describe("remapDelta", () => {
  it("is null at 1× and for a missing remap", () => {
    expect(remapDelta(null, null)).toBeNull();
    expect(remapDelta({ ...Z3, factor: 1 }, null)).toBeNull();
    expect(isRemapActive({ ...Z3, factor: 1.0001 })).toBe(false);
  });

  it("stretches the world axis about its pivot, in the slot the view draws it in", () => {
    expect(apply(remapDelta(Z3, null)!, [1, 2, 12])).toEqual([1, 2, 16]);
    // In the XZ view world z is screen y.
    expect(apply(remapDelta(Z3, XZ_VIEW)!, [1, 12, 2])).toEqual([1, 16, 2]);
  });

  it("agrees with remapViewPoint, and unremapViewPoint inverts both", () => {
    const point: [number, number, number] = [4, 7, -3];
    for (const view of [null, XZ_VIEW] as const) {
      const drawn = remapViewPoint(point, Z3, view);
      expect(apply(remapDelta(Z3, view)!, point)).toEqual(drawn);
      const back = unremapViewPoint(drawn, Z3, view);
      back.forEach((value, index) => expect(value).toBeCloseTo(point[index], 12));
    }
  });
});

describe("composeDeltas", () => {
  it("applies the right-hand delta first", () => {
    const shift = [
      [1, 0, 0, 0],
      [0, 1, 0, 0],
      [0, 0, 1, 5],
      [0, 0, 0, 1],
    ];
    // z = 10: shifted to 15, then stretched 3× about 10 → 25.
    expect(apply(composeDeltas(remapDelta(Z3, null), shift)!, [0, 0, 10])).toEqual([0, 0, 25]);
    expect(composeDeltas(null, shift)).toBe(shift);
  });
});

describe("isAlignedTo", () => {
  const anisotropic = [
    [0.5, 0, 0, 0],
    [0, 0.5, 0, 0],
    [0, 0, 5, 100],
    [0, 0, 0, 1],
  ];
  const c = Math.cos(0.3);
  const s = Math.sin(0.3);
  const tiltedInXZ = [
    [c, 0, -s, 0],
    [0, 1, 0, 0],
    [s, 0, c, 0],
    [0, 0, 0, 1],
  ];
  const rotatedInXY = [
    [c, -s, 0, 0],
    [s, c, 0, 0],
    [0, 0, 1, 0],
    [0, 0, 0, 1],
  ];

  it("passes an axis-aligned (even anisotropic, even permuted) placement", () => {
    expect(isAlignedTo(null, 2)).toBe(true);
    expect(isAlignedTo(anisotropic, 2)).toBe(true);
    const permuted = [
      [0, 1, 0, 0],
      [0, 0, 1, 0],
      [1, 0, 0, 0],
      [0, 0, 0, 1],
    ];
    expect(isAlignedTo(permuted, 2)).toBe(true);
  });

  it("fails a placement rotated out of the remapped axis, not one rotated about it", () => {
    expect(isAlignedTo(tiltedInXZ, 2)).toBe(false);
    expect(isAlignedTo(rotatedInXY, 2)).toBe(true);
    expect(isAlignedTo(rotatedInXY, 0)).toBe(false);
  });
});

describe("defaultRemapSlot", () => {
  const lattice = (sx: number, sy: number, sz: number) => [
    [sx, 0, 0, 0],
    [0, sy, 0, 0],
    [0, 0, sz, 0],
    [0, 0, 0, 1],
  ];

  it("picks the axis whose voxels stand out", () => {
    expect(defaultRemapSlot([lattice(0.5, 0.5, 5)], null, [0, 1, 2], 2)).toBe(2);
    expect(defaultRemapSlot([lattice(4, 0.3, 0.3)], null, [0, 1, 2], 2)).toBe(0);
    // In the XZ view screen z is world y.
    expect(defaultRemapSlot([lattice(0.5, 0.5, 5)], XZ_VIEW, [0, 1, 2], 2)).toBe(1);
  });

  it("falls back when the data is close to isotropic or absent", () => {
    expect(defaultRemapSlot([lattice(1, 1, 1.2)], null, [0, 1, 2], 2)).toBe(2);
    expect(defaultRemapSlot([], null, [0, 1], 1)).toBe(1);
  });
});

describe("isotropicRemap", () => {
  const lattice = (sx: number, sy: number, sz: number) => [
    [sx, 0, 0, 0],
    [0, sy, 0, 0],
    [0, 0, sz, 0],
    [0, 0, 0, 1],
  ];

  it("scales the odd axis to the others' voxel size", () => {
    const result = isotropicRemap([lattice(0.5, 0.5, 5)], null, null, [0, 1, 2]);
    expect(result?.slot).toBe(2);
    expect(result?.factor).toBeCloseTo(0.1, 12);
    const thin = isotropicRemap([lattice(2, 2, 0.5)], null, null, [0, 1, 2]);
    expect(thin?.factor).toBeCloseTo(4, 12);
  });

  it("measures physically: the drawn lattice under a remap gives the same answer", () => {
    const current = { slot: 2, factor: 3, pivot: 0 } satisfies DisplayRemap;
    // 0.5/0.5/2 µm drawn with z ×3 → z row 6.
    const result = isotropicRemap([lattice(0.5, 0.5, 6)], null, current, [0, 1, 2]);
    expect(result?.slot).toBe(2);
    expect(result?.factor).toBeCloseTo(0.25, 12);
  });

  it("follows the view: in XZ world z is drawn in screen y", () => {
    const result = isotropicRemap([lattice(0.5, 5, 0.5)], XZ_VIEW, null, [0, 1, 2]);
    expect(result?.slot).toBe(2);
    expect(result?.factor).toBeCloseTo(0.1, 12);
  });

  it("is null for cubic voxels or no volume, and clamps to the slider's range", () => {
    expect(isotropicRemap([lattice(1, 1, 1.02)], null, null, [0, 1, 2])).toBeNull();
    expect(isotropicRemap([], null, null, [0, 1, 2])).toBeNull();
    expect(isotropicRemap([lattice(0.1, 0.1, 50)], null, null, [0, 1, 2])?.factor).toBe(0.1);
  });

  it("takes the median factor over several layers", () => {
    const result = isotropicRemap(
      [lattice(1, 1, 2), lattice(1, 1, 4), lattice(1, 1, 8)],
      null,
      null,
      [0, 1, 2],
    );
    expect(result?.factor).toBeCloseTo(0.25, 12);
  });
});
