import { describe, expect, it } from "vitest";
import * as THREE from "three";

import {
  boxViewDepthRange,
  decodeDepth,
  depthFraction,
  depthRamp,
  depthRampCssStops,
  packDepth,
  RELIEF_AMBIENT,
  RELIEF_LIGHT,
  reliefNormal,
  reliefShade,
  turbo,
} from "./depthCode";

const luminance = ([r, g, b]: [number, number, number]) => 0.2126 * r + 0.7152 * g + 0.0722 * b;

describe("depthRamp", () => {
  it("is warm near and cool far", () => {
    const near = depthRamp(0);
    const far = depthRamp(1);
    expect(near[0]).toBeGreaterThan(near[2]);
    expect(far[2]).toBeGreaterThan(far[0]);
  });

  it("stays in [0, 1] and never goes near-black, so brightness still reads as intensity", () => {
    for (let i = 0; i <= 100; i++) {
      const c = depthRamp(i / 100);
      for (const v of c) {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(1);
      }
      expect(luminance(c)).toBeGreaterThan(0.15);
    }
  });

  it("clamps outside [0, 1]", () => {
    expect(depthRamp(-3)).toEqual(depthRamp(0));
    expect(depthRamp(7)).toEqual(depthRamp(1));
  });

  it("matches the published turbo endpoints closely", () => {
    const lo = turbo(0);
    expect(lo[0]).toBeCloseTo(0.136, 2);
    expect(lo[2]).toBeCloseTo(0.107, 2);
  });

  it("renders legend stops from the same ramp", () => {
    const stops = depthRampCssStops(3);
    const [r, g, b] = depthRamp(0).map((v) => Math.round(v * 255));
    expect(stops.startsWith(`rgb(${r} ${g} ${b}) 0.0%`)).toBe(true);
    expect(stops.endsWith("100.0%")).toBe(true);
  });
});

describe("depthFraction", () => {
  it("places and clamps", () => {
    expect(depthFraction(5, 0, 10)).toBeCloseTo(0.5);
    expect(depthFraction(-1, 0, 10)).toBe(0);
    expect(depthFraction(11, 0, 10)).toBe(1);
  });

  it("is mid-ramp for a degenerate range", () => {
    expect(depthFraction(3, 2, 2)).toBe(0.5);
    expect(depthFraction(3, 5, 2)).toBe(0.5);
  });
});

describe("boxViewDepthRange", () => {
  it("is the corner depth range along the camera's forward axis", () => {
    const camera = new THREE.PerspectiveCamera();
    camera.position.set(0, 0, 100);
    camera.lookAt(0, 0, 0);
    camera.updateMatrixWorld();
    const view = camera.matrixWorldInverse.elements;
    const { near, far } = boxViewDepthRange([-10, -10, -20], [10, 10, 20], view);
    expect(near).toBeCloseTo(80);
    expect(far).toBeCloseTo(120);
  });

  it("is invariant to sideways translation (view-space z, not radial distance)", () => {
    const camera = new THREE.OrthographicCamera();
    camera.position.set(0, 0, 50);
    camera.lookAt(0, 0, 0);
    camera.updateMatrixWorld();
    const view = camera.matrixWorldInverse.elements;
    const a = boxViewDepthRange([0, 0, 0], [1, 1, 1], view);
    const b = boxViewDepthRange([500, -300, 0], [501, -299, 1], view);
    expect(b.near).toBeCloseTo(a.near);
    expect(b.far).toBeCloseTo(a.far);
  });

  it("clamps the near end at the camera", () => {
    const camera = new THREE.PerspectiveCamera();
    camera.position.set(0, 0, 0);
    camera.lookAt(0, 0, -1);
    camera.updateMatrixWorld();
    const { near, far } = boxViewDepthRange([-1, -1, -5], [1, 1, 5], camera.matrixWorldInverse.elements);
    expect(near).toBe(0);
    expect(far).toBeCloseTo(5);
  });
});

describe("packed depth", () => {
  it("decodes the strength-weighted mean of additively blended passes", () => {
    const a = packDepth(0.2, 0.9);
    const b = packDepth(0.8, 0.3);
    const sum = { r: a.r + b.r, g: a.g + b.g };
    expect(decodeDepth(sum)).toBeCloseTo((0.2 * 0.9 + 0.8 * 0.3) / 1.2);
    expect(decodeDepth(packDepth(0.4, 1))).toBeCloseTo(0.4);
  });
});

describe("relief normal", () => {
  const ortho = { range: 10, near: 0, pxScale: 1, perspective: false };
  const all = Array(9).fill(true);
  /** A plane whose depth frac rises by `sx` per texel right and `sy` per row down. */
  const plane = (sx: number, sy: number) =>
    [-1, 0, 1].flatMap((row) => [-1, 0, 1].map((col) => 0.5 + sx * col + sy * row));

  it("faces the camera on a face-on plane", () => {
    const n = reliefNormal(plane(0, 0), all, ortho);
    expect(n[0]).toBeCloseTo(0);
    expect(n[1]).toBeCloseTo(0);
    expect(n[2]).toBeCloseTo(1);
    expect(reliefShade(n)).toBeCloseTo(RELIEF_AMBIENT + (1 - RELIEF_AMBIENT) * RELIEF_LIGHT[2]);
  });

  it("tilts by the world slope: 45° when depth rises one texel per texel", () => {
    // frac step 0.1 × range 10 = 1 world unit per 1-unit texel.
    const n = reliefNormal(plane(0.1, 0), all, ortho);
    expect(n[0]).toBeCloseTo(Math.SQRT1_2);
    expect(n[2]).toBeCloseTo(Math.SQRT1_2);
  });

  it("flips screen rows to view y (depth rising DOWN the screen tilts the normal down)", () => {
    expect(reliefNormal(plane(0, 0.1), all, ortho)[1]).toBeLessThan(0);
  });

  it("scales the texel by distance under perspective", () => {
    const near = reliefNormal(plane(0.1, 0), all, { range: 10, near: 0, pxScale: 0.1, perspective: true });
    const far = reliefNormal(plane(0.1, 0), all, { range: 10, near: 100, pxScale: 0.1, perspective: true });
    // Same frac slope, but texels are wider far away → shallower.
    expect(far[0]).toBeLessThan(near[0]);
  });

  it("treats neighbours without depth as flat", () => {
    const depths = plane(0.3, 0.3);
    const valid = depths.map((_, i) => i === 4);
    const n = reliefNormal(depths, valid, ortho);
    expect(n[2]).toBeCloseTo(1);
  });

  it("lights a surface facing the upper-left light brighter than one facing away", () => {
    // Depth rising to the right recedes rightward: the surface faces RIGHT,
    // away from the light; depth falling to the right faces left, into it.
    const facingRight = reliefShade(reliefNormal(plane(0.05, 0), all, ortho));
    const facingLeft = reliefShade(reliefNormal(plane(-0.05, 0), all, ortho));
    expect(facingRight).toBeLessThan(facingLeft);
  });
});
