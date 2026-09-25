// @vitest-environment jsdom
// (the generated `graphql.ts` enums are runtime values, and importing that
// module pulls in the Apollo hooks barrel, which touches `window` on load)
import { describe, expect, it } from "vitest";

import { Easing } from "@/mikro/api/graphql";
import type { AnimationWaypointFragment, CameraStateFragment } from "@/mikro/api/graphql";
import {
  buildTourLegs,
  easingFn,
  lerpCameraState,
  sampleTour,
  sortWaypoints,
  tourDurationMs,
} from "./animation";

const makeState = (overrides: Partial<CameraStateFragment> = {}): CameraStateFragment => ({
  position: {},
  crossSectionOrientation: null,
  crossSectionScale: null,
  projectionOrientation: null,
  projectionScale: null,
  ...overrides,
});

const makeWaypoint = (opts: {
  order: number;
  durationMs?: number;
  easing?: Easing;
  camera?: Partial<CameraStateFragment>;
}): AnimationWaypointFragment =>
  ({
    id: `wp-${opts.order}`,
    order: opts.order,
    name: `stop ${opts.order}`,
    durationMs: opts.durationMs ?? 1000,
    easing: opts.easing ?? Easing.Linear,
    camera: makeState(opts.camera),
  }) as AnimationWaypointFragment;

describe("easingFn", () => {
  it("pins both ends for every curve", () => {
    for (const easing of Object.values(Easing)) {
      expect(easingFn(easing)(0)).toBeCloseTo(0);
      expect(easingFn(easing)(1)).toBeCloseTo(1);
    }
  });

  it("starts slower than linear when easing in, and faster when easing out", () => {
    expect(easingFn(Easing.EaseIn)(0.25)).toBeLessThan(0.25);
    expect(easingFn(Easing.EaseOut)(0.25)).toBeGreaterThan(0.25);
  });

  it("is symmetric about the midpoint when easing in and out", () => {
    expect(easingFn(Easing.EaseInOut)(0.5)).toBeCloseTo(0.5);
    expect(easingFn(Easing.EaseInOut)(0.25) + easingFn(Easing.EaseInOut)(0.75)).toBeCloseTo(1);
  });

  // The schema's stated default for a stop that does not name one.
  it("defaults to EASE_IN_OUT", () => {
    expect(easingFn(null)(0.25)).toBeCloseTo(easingFn(Easing.EaseInOut)(0.25));
  });
});

describe("sortWaypoints", () => {
  it("orders by `order`, not array position", () => {
    const out = sortWaypoints([makeWaypoint({ order: 2 }), makeWaypoint({ order: 0 })]);
    expect(out.map((w) => w.order)).toEqual([0, 2]);
  });
});

describe("buildTourLegs", () => {
  // "Ignored for the first pose, which is where the tour starts."
  it("ignores the first waypoint's duration", () => {
    const legs = buildTourLegs([
      makeWaypoint({ order: 0, durationMs: 9999 }),
      makeWaypoint({ order: 1, durationMs: 500 }),
    ]);
    expect(legs).toHaveLength(1);
    expect(legs[0]).toMatchObject({ startMs: 0, durationMs: 500 });
  });

  it("lays legs end to end on the clock", () => {
    const legs = buildTourLegs([
      makeWaypoint({ order: 0 }),
      makeWaypoint({ order: 1, durationMs: 200 }),
      makeWaypoint({ order: 2, durationMs: 300 }),
    ]);
    expect(legs.map((l) => [l.startMs, l.durationMs])).toEqual([
      [0, 200],
      [200, 300],
    ]);
  });

  it("has no legs for a tour of fewer than two stops", () => {
    expect(buildTourLegs([makeWaypoint({ order: 0 })])).toEqual([]);
    expect(buildTourLegs([])).toEqual([]);
  });
});

describe("tourDurationMs", () => {
  it("sums every leg but the first stop", () => {
    expect(
      tourDurationMs([
        makeWaypoint({ order: 0, durationMs: 9999 }),
        makeWaypoint({ order: 1, durationMs: 200 }),
        makeWaypoint({ order: 2, durationMs: 300 }),
      ]),
    ).toBe(500);
  });

  it("is zero for a single stop", () => {
    expect(tourDurationMs([makeWaypoint({ order: 0 })])).toBe(0);
  });
});

describe("lerpCameraState", () => {
  it("interpolates the axes both poses name", () => {
    const out = lerpCameraState(
      makeState({ position: { x: 0, t: 10 } }),
      makeState({ position: { x: 100, t: 20 } }),
      0.25,
    );
    expect(out.position).toEqual({ x: 25, t: 12.5 });
  });

  // A pose that omits an axis is saying "leave it alone" — lerping toward a
  // value it never stated would invent motion.
  it("holds an axis only one pose names constant", () => {
    const out = lerpCameraState(
      makeState({ position: { x: 0, y: 5 } }),
      makeState({ position: { x: 100 } }),
      0.5,
    );
    expect(out.position).toEqual({ x: 50, y: 5 });
  });

  it("interpolates zoom geometrically, not linearly", () => {
    const out = lerpCameraState(
      makeState({ crossSectionScale: 1 }),
      makeState({ crossSectionScale: 100 }),
      0.5,
    );
    expect(out.crossSectionScale).toBeCloseTo(10); // √(1·100), not 50.5
  });

  it("keeps the scale a pose does not state rather than blending into null", () => {
    const out = lerpCameraState(
      makeState({ projectionScale: 4 }),
      makeState({ projectionScale: null }),
      0.5,
    );
    expect(out.projectionScale).toBe(4);
  });

  it("slerps orientation, staying a unit quaternion", () => {
    const half = Math.SQRT1_2;
    const out = lerpCameraState(
      makeState({ projectionOrientation: [0, 0, 0, 1] }),
      makeState({ projectionOrientation: [0, 0, half, half] }),
      0.5,
    );
    const q = out.projectionOrientation!;
    expect(Math.hypot(...q)).toBeCloseTo(1);
  });
});

describe("sampleTour", () => {
  const tour = [
    makeWaypoint({ order: 0, camera: { position: { x: 0 } } }),
    makeWaypoint({ order: 1, durationMs: 1000, camera: { position: { x: 100 } } }),
    makeWaypoint({ order: 2, durationMs: 1000, camera: { position: { x: 300 } } }),
  ];

  it("is the first stop at the start", () => {
    expect(sampleTour(tour, 0)?.position).toEqual({ x: 0 });
  });

  it("interpolates within a leg", () => {
    expect(sampleTour(tour, 500)?.position).toEqual({ x: 50 });
  });

  it("picks the right leg once the clock passes the first", () => {
    expect(sampleTour(tour, 1500)?.position).toEqual({ x: 200 });
  });

  it("clamps to the last stop past the end", () => {
    expect(sampleTour(tour, 99999)?.position).toEqual({ x: 300 });
  });

  it("clamps to the first stop before the start", () => {
    expect(sampleTour(tour, -500)?.position).toEqual({ x: 0 });
  });

  it("is the sole stop for a one-stop tour, at any time", () => {
    const single = [makeWaypoint({ order: 0, camera: { position: { x: 7 } } })];
    expect(sampleTour(single, 0)?.position).toEqual({ x: 7 });
    expect(sampleTour(single, 5000)?.position).toEqual({ x: 7 });
  });

  it("is null for an empty tour", () => {
    expect(sampleTour([], 0)).toBeNull();
  });

  // A zero-duration leg is a cut, not a division by zero.
  it("jumps straight to the destination across a zero-duration leg", () => {
    const cut = [
      makeWaypoint({ order: 0, camera: { position: { x: 0 } } }),
      makeWaypoint({ order: 1, durationMs: 0, camera: { position: { x: 100 } } }),
      makeWaypoint({ order: 2, durationMs: 1000, camera: { position: { x: 200 } } }),
    ];
    expect(sampleTour(cut, 0)?.position).toEqual({ x: 100 });
    expect(sampleTour(cut, 500)?.position).toEqual({ x: 150 });
  });

  it("eases with the curve of the stop being travelled TO", () => {
    const eased = [
      makeWaypoint({ order: 0, camera: { position: { x: 0 } } }),
      makeWaypoint({
        order: 1,
        durationMs: 1000,
        easing: Easing.EaseIn,
        camera: { position: { x: 100 } },
      }),
    ];
    // EASE_IN at the quarter mark is behind the linear 25.
    expect(sampleTour(eased, 250)?.position.x).toBeCloseTo(6.25);
  });
});
