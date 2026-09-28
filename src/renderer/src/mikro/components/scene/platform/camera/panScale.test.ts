import { describe, expect, it } from "vitest";
import * as THREE from "three";
import {
  contentDistanceAlongRay,
  nearestChordMidpointAlongRay,
  orbitDepthAlongRay,
  resolvePanSpeed,
  unionCenterT,
  unionChordAlongRay,
} from "./panScale";

const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const box = (min: [number, number, number], max: [number, number, number]) =>
  new THREE.Box3(new THREE.Vector3(...min), new THREE.Vector3(...max));

describe("contentDistanceAlongRay", () => {
  it("returns the entry distance of a box ahead of the camera", () => {
    const d = contentDistanceAlongRay(v(0, 0, 10), v(0, 0, -1), [box([-5, -5, -5], [5, 5, 5])], 99);
    expect(d).toBeCloseTo(5, 6);
  });

  it("uses the mid-chord when the camera is INSIDE a box (zoomed into a volume)", () => {
    // Camera at z=2 inside [-5,5]: exit along -z is at t=7 → mid-chord 3.5.
    const d = contentDistanceAlongRay(v(0, 0, 2), v(0, 0, -1), [box([-5, -5, -5], [5, 5, 5])], 99);
    expect(d).toBeCloseTo(3.5, 6);
  });

  it("takes the nearest of several boxes", () => {
    const boxes = [box([-1, -1, -30], [1, 1, -20]), box([-1, -1, -8], [1, 1, -4])];
    expect(contentDistanceAlongRay(v(0, 0, 0), v(0, 0, -1), boxes, 99)).toBeCloseTo(4, 6);
  });

  it("ignores boxes entirely behind the camera", () => {
    const d = contentDistanceAlongRay(v(0, 0, 0), v(0, 0, -1), [box([-1, -1, 5], [1, 1, 8])], 42);
    expect(d).toBe(42);
  });

  it("falls back when the ray misses everything", () => {
    const d = contentDistanceAlongRay(v(0, 0, 0), v(0, 0, -1), [box([10, 10, -5], [12, 12, -4])], 42);
    expect(d).toBe(42);
  });

  it("handles axis-parallel rays that never cross the slab", () => {
    // Ray along -z at x=20: outside the box's x slab, direction.x = 0.
    const d = contentDistanceAlongRay(v(20, 0, 0), v(0, 0, -1), [box([-5, -5, -5], [5, 5, 5])], 7);
    expect(d).toBe(7);
  });

  it("skips empty boxes", () => {
    expect(contentDistanceAlongRay(v(0, 0, 0), v(0, 0, -1), [new THREE.Box3()], 7)).toBe(7);
  });
});

describe("unionChordAlongRay", () => {
  it("returns the min-entry / max-exit across every hit box, entry unclamped", () => {
    const boxes = [box([-1, -1, -30], [1, 1, -20]), box([-1, -1, -8], [1, 1, -4])];
    expect(unionChordAlongRay(v(0, 0, 0), v(0, 0, -1), boxes)).toEqual({ tIn: 4, tOut: 30 });
    // Camera inside: negative entry survives (the inside signal).
    const inside = unionChordAlongRay(v(0, 0, 2), v(0, 0, -1), [box([-5, -5, -5], [5, 5, 5])]);
    expect(inside).toEqual({ tIn: -3, tOut: 7 });
  });

  it("null on a miss / behind-camera / empty boxes", () => {
    expect(unionChordAlongRay(v(0, 0, 0), v(0, 0, -1), [])).toBeNull();
    expect(unionChordAlongRay(v(0, 0, 0), v(0, 0, -1), [box([-1, -1, 5], [1, 1, 8])])).toBeNull();
    expect(unionChordAlongRay(v(0, 0, 0), v(0, 0, -1), [new THREE.Box3()])).toBeNull();
  });
});

describe("unionCenterT", () => {
  it("projects the union-box center onto the ray — hit or not", () => {
    // Box beside the ray (a miss): center (11, 11, -4.5) from origin along -z → t = 4.5.
    expect(unionCenterT(v(0, 0, 0), v(0, 0, -1), [box([10, 10, -5], [12, 12, -4])])).toBeCloseTo(4.5, 6);
    // Two boxes: center of the UNION box, not of either member.
    const boxes = [box([-1, -1, -30], [1, 1, -20]), box([-1, -1, -8], [1, 1, -4])];
    expect(unionCenterT(v(0, 0, 0), v(0, 0, -1), boxes)).toBeCloseTo(17, 6);
  });

  it("null with no contributing boxes", () => {
    expect(unionCenterT(v(0, 0, 0), v(0, 0, -1), [])).toBeNull();
    expect(unionCenterT(v(0, 0, 0), v(0, 0, -1), [new THREE.Box3()])).toBeNull();
  });
});

describe("orbitDepthAlongRay (content-center rule)", () => {
  it("ray through the box center: identical to the old chord-midpoint rule", () => {
    // Camera at z=10 looking -z through [-5,5]: center projection t=10 lies
    // inside the chord [5,15] → 10, the historical golden.
    const d = orbitDepthAlongRay(v(0, 0, 10), v(0, 0, -1), [box([-5, -5, -5], [5, 5, 5])], 99);
    expect(d).toBeCloseTo(10, 6);
  });

  it("grazing/oblique hit: the center projection is clamped INTO the chord", () => {
    // Ray at x=4.9 grazes [-5,5] along z from z=10: chord [5,15]; the union
    // center (0,0,0) projects to t=10 — still within the chord here. Push the
    // ray to clip only a corner sliver in z: box [-5,5]² × [-5,-4], camera at
    // z=10 → chord [14,15], center projection t = 10 − (−4.5) = 14.5 ∈ chord.
    const sliver = box([-5, -5, -5], [5, 5, -4]);
    expect(orbitDepthAlongRay(v(0, 0, 10), v(0, 0, -1), [sliver], 99)).toBeCloseTo(14.5, 6);
    // A center projection OUTSIDE the chord clamps to the chord edge: second
    // box far behind drags the union center to t=32, chord of the hit box
    // is [14,15] ∪ nothing → union chord [14,15] → clamped to 15.
    const far = box([10, 10, -60], [12, 12, -50]); // not hit by the ray
    expect(orbitDepthAlongRay(v(0, 0, 10), v(0, 0, -1), [sliver, far], 99)).toBeCloseTo(15, 6);
  });

  it("two hit boxes: depth pulls toward the union center, clamped by the union chord", () => {
    const boxes = [box([-1, -1, -30], [1, 1, -20]), box([-1, -1, -8], [1, 1, -4])];
    // Union chord [4,30], union center t=17 → 17 (was 6 under nearest-chord).
    expect(orbitDepthAlongRay(v(0, 0, 0), v(0, 0, -1), boxes, 99)).toBeCloseTo(17, 6);
  });

  it("inside the union: midpoint of the REMAINING chord (never collapses to 0)", () => {
    // Camera at z=2 inside [-5,5]: exit t=7 → 3.5 (the historical inside golden).
    const d = orbitDepthAlongRay(v(0, 0, 2), v(0, 0, -1), [box([-5, -5, -5], [5, 5, 5])], 99);
    expect(d).toBeCloseTo(3.5, 6);
    // Just past the center (center projection would be ≤ 0): still the
    // remaining-chord midpoint, strictly positive — dollying through the
    // center must not collapse the orbit radius.
    const past = orbitDepthAlongRay(v(0, 0, -1), v(0, 0, -1), [box([-5, -5, -5], [5, 5, 5])], 99);
    expect(past).toBeCloseTo(2, 6);
    expect(past).toBeGreaterThan(0);
  });

  it("miss with content BESIDE the ray: pivots at the content's depth, not the stale radius", () => {
    // Panned half off-screen: box at x∈[10,12], ray along -z at x=0 misses,
    // but the center projects to t=4.5 ahead → 4.5, not the fallback.
    const d = orbitDepthAlongRay(v(0, 0, 0), v(0, 0, -1), [box([10, 10, -5], [12, 12, -4])], 42);
    expect(d).toBeCloseTo(4.5, 6);
  });

  it("miss with content BEHIND the camera: keeps the current radius", () => {
    expect(orbitDepthAlongRay(v(0, 0, 0), v(0, 0, -1), [], 42)).toBe(42);
    expect(
      orbitDepthAlongRay(v(0, 0, 0), v(0, 0, -1), [box([-1, -1, 5], [1, 1, 8])], 42),
    ).toBe(42);
    expect(orbitDepthAlongRay(v(0, 0, 0), v(0, 0, -1), [new THREE.Box3()], 42)).toBe(42);
  });
});

describe("nearestChordMidpointAlongRay (cursor picking rule)", () => {
  it("targets the chord midpoint of a box ahead", () => {
    const d = nearestChordMidpointAlongRay(v(0, 0, 10), v(0, 0, -1), [box([-5, -5, -5], [5, 5, 5])], 99);
    expect(d).toBeCloseTo(10, 6);
  });

  it("inside a box, targets the midpoint of the remaining chord", () => {
    const d = nearestChordMidpointAlongRay(v(0, 0, 2), v(0, 0, -1), [box([-5, -5, -5], [5, 5, 5])], 99);
    expect(d).toBeCloseTo(3.5, 6);
  });

  it("picks the NEAREST box's chord, not the deepest — the box the user pointed at", () => {
    const boxes = [box([-1, -1, -30], [1, 1, -20]), box([-1, -1, -8], [1, 1, -4])];
    expect(nearestChordMidpointAlongRay(v(0, 0, 0), v(0, 0, -1), boxes, 99)).toBeCloseTo(6, 6);
  });

  it("falls back on a miss or behind-camera box", () => {
    expect(nearestChordMidpointAlongRay(v(0, 0, 0), v(0, 0, -1), [], 42)).toBe(42);
    expect(
      nearestChordMidpointAlongRay(v(0, 0, 0), v(0, 0, -1), [box([-1, -1, 5], [1, 1, 8])], 42),
    ).toBe(42);
  });
});

describe("resolvePanSpeed", () => {
  it("is 1 when the target already sits at the content depth (stock behavior)", () => {
    expect(resolvePanSpeed(100, 100)).toBe(1);
  });

  it("boosts pan when the orbit radius collapsed below the content depth", () => {
    // The zoomed-in freeze: radius 0.001, content 50 → pan restored 50000×
    // (three multiplies by panSpeed · targetDistance, so the product is the
    // content distance again).
    expect(resolvePanSpeed(50, 0.001)).toBeCloseTo(10_000, 6); // hits the sanity clamp
    expect(resolvePanSpeed(50, 0.01) * 0.01).toBeCloseTo(50, 6);
  });

  it("slows pan when the target is far behind close-up content", () => {
    expect(resolvePanSpeed(2, 200)).toBeCloseTo(0.01, 8);
  });

  it("degenerate inputs fall back to 1", () => {
    expect(resolvePanSpeed(0, 10)).toBe(1);
    expect(resolvePanSpeed(10, 0)).toBe(1);
    expect(resolvePanSpeed(Number.NaN, 10)).toBe(1);
    expect(resolvePanSpeed(10, Number.POSITIVE_INFINITY)).toBe(1);
  });
});
