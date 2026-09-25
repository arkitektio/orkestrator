import { describe, expect, it } from "vitest";
import {
  closestParamOnAxis,
  intersectPlane,
  nudge,
  rotateAboutAxis,
  scaleAlongWorldAxis,
  scaleUniform,
  screenConstantSize,
  signedAngle,
  snap,
  translateAlongAxis,
  translateInPlane,
  type Ray,
} from "./gizmoMath";
import { applyPoint, isIdentity, type Vec3 } from "./mat4";

const PIVOT: Vec3 = [10, 20, 0];
const Z: Vec3 = [0, 0, 1];

/** The 2D view: every ray looks straight down −z, only the origin moves. */
const ortho = (x: number, y: number): Ray => ({ origin: [x, y, 100], direction: [0, 0, -1] });

/** The 3D view: every ray leaves one eye. */
const EYE: Vec3 = [10, 20, 100];
const perspective = (x: number, y: number, z = 0): Ray => ({
  origin: EYE,
  direction: [x - EYE[0], y - EYE[1], z - EYE[2]],
});

describe("primitives", () => {
  it("finds the closest parameter along an axis", () => {
    expect(closestParamOnAxis(ortho(17, 99), PIVOT, [1, 0, 0])).toBeCloseTo(7, 9);
    expect(closestParamOnAxis(perspective(4, 20), PIVOT, [1, 0, 0])).toBeCloseTo(-6, 9);
  });

  it("returns null when the axis is viewed end-on", () => {
    expect(closestParamOnAxis(ortho(17, 99), PIVOT, Z)).toBeNull();
    // Nearly parallel is just as unreadable as exactly parallel.
    expect(closestParamOnAxis({ origin: [0, 0, 100], direction: [0.01, 0, -1] }, PIVOT, Z)).toBeNull();
  });

  it("intersects a plane, and refuses grazing or behind-the-eye hits", () => {
    expect(intersectPlane(ortho(3, 4), PIVOT, Z)).toEqual([3, 4, 0]);
    expect(intersectPlane({ origin: [0, 0, 5], direction: [1, 0, 0] }, PIVOT, Z)).toBeNull();
    expect(intersectPlane({ origin: [0, 0, 5], direction: [0, 0, 1] }, PIVOT, Z)).toBeNull();
  });

  it("measures a signed angle, counter-clockwise positive about +z", () => {
    expect(signedAngle(PIVOT, Z, [11, 20, 0], [10, 21, 0])).toBeCloseTo(Math.PI / 2, 9);
    expect(signedAngle(PIVOT, Z, [10, 21, 0], [11, 20, 0])).toBeCloseTo(-Math.PI / 2, 9);
    expect(signedAngle(PIVOT, Z, PIVOT, [11, 20, 0])).toBeNull();
  });

  it("snaps only when asked", () => {
    expect(snap(0.27, 0.1)).toBeCloseTo(0.3, 9);
    expect(snap(0.27, null)).toBe(0.27);
    expect(snap(0.27, 0)).toBe(0.27);
  });
});

describe("gestures", () => {
  it("translates along an axis, ignoring off-axis pointer motion", () => {
    const g = translateAlongAxis(ortho(12, 20), ortho(19, 55), PIVOT, [1, 0, 0])!;
    expect(applyPoint(g, [0, 0, 0])).toEqual([7, 0, 0]);
  });

  it("translates in the view plane under both cameras", () => {
    const flat = translateInPlane(ortho(0, 0), ortho(3, -4), PIVOT, Z)!;
    expect(applyPoint(flat, PIVOT)).toEqual([13, 16, 0]);
    const deep = translateInPlane(perspective(10, 20), perspective(13, 16), PIVOT, Z)!;
    applyPoint(deep, PIVOT).forEach((v, i) => expect(v).toBeCloseTo([13, 16, 0][i], 9));
  });

  it("rotates about the pivot, which therefore stays put", () => {
    const g = rotateAboutAxis(ortho(15, 20), ortho(10, 25), PIVOT, Z)!;
    applyPoint(g, PIVOT).forEach((v, i) => expect(v).toBeCloseTo(PIVOT[i], 9));
    applyPoint(g, [15, 20, 0]).forEach((v, i) => expect(v).toBeCloseTo([10, 25, 0][i], 9));
  });

  it("snaps a rotation to the step", () => {
    const step = Math.PI / 12; // 15°
    const g = rotateAboutAxis(ortho(15, 20), ortho(15, 22.2), PIVOT, Z, step)!; // ~23.7° → 30°
    const p = applyPoint(g, [11, 20, 0]);
    expect(Math.atan2(p[1] - 20, p[0] - 10)).toBeCloseTo(Math.PI / 6, 9);
  });

  it("scales uniformly by the ratio of distances from the pivot", () => {
    const g = scaleUniform(ortho(12, 20), ortho(16, 20), PIVOT, Z)!;
    applyPoint(g, [11, 21, 0]).forEach((v, i) => expect(v).toBeCloseTo([13, 23, 0][i], 9));
    applyPoint(g, PIVOT).forEach((v, i) => expect(v).toBeCloseTo(PIVOT[i], 9));
  });

  it("never scales through zero", () => {
    const g = scaleAlongWorldAxis(ortho(12, 20), ortho(4, 20), PIVOT, 0)!; // dragged past the pivot
    expect(g[0][0]).toBeGreaterThan(0);
    expect(g[1][1]).toBe(1);
  });

  it("stretches one world axis only", () => {
    const g = scaleAlongWorldAxis(ortho(12, 20), ortho(14, 33), PIVOT, 0)!;
    applyPoint(g, [11, 21, 0]).forEach((v, i) => expect(v).toBeCloseTo([12, 21, 0][i], 9));
  });

  it("returns null rather than a wild matrix for an unreadable drag", () => {
    expect(translateAlongAxis(ortho(1, 1), ortho(2, 2), PIVOT, Z)).toBeNull();
    expect(scaleUniform(ortho(10, 20), ortho(16, 20), PIVOT, Z)).toBeNull(); // grabbed at the pivot
    expect(rotateAboutAxis(ortho(10, 20), ortho(16, 20), PIVOT, Z)).toBeNull();
  });

  it("a drag that returns to its start is exactly identity", () => {
    expect(isIdentity(translateInPlane(ortho(5, 5), ortho(5, 5), PIVOT, Z)!)).toBe(true);
    expect(isIdentity(rotateAboutAxis(ortho(15, 20), ortho(15, 20), PIVOT, Z)!, 1e-12)).toBe(true);
  });
});

describe("screen-space helpers", () => {
  it("nudges by pixels, whatever the zoom", () => {
    expect(applyPoint(nudge([1, 0, 0], 10, 0.5), [0, 0, 0])).toEqual([5, 0, 0]);
    expect(isIdentity(nudge([0, 0, 0], 10, 0.5))).toBe(true);
  });
  it("sizes handles in pixels", () => {
    expect(screenConstantSize(80, 0.25)).toBe(20);
  });
});
