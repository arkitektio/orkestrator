import * as THREE from "three";

import { Easing } from "@/mikro/api/graphql";
import type {
  AnimationWaypointFragment,
  AnimationWaypointInput,
  CameraStateFragment,
} from "@/mikro/api/graphql";

/**
 * Playing a camera tour: easing, pose interpolation, and sampling a tour at a
 * point in time. Pure — no camera, no store, no clock — so the whole of
 * playback is testable without a Canvas. `features/animation/AnimationPlayer.tsx` is the
 * only thing that turns a sample into camera motion.
 */

/** The tour's timeline: a waypoint and the clock window that travels TO it. */
export type TourLeg = {
  from: AnimationWaypointFragment;
  to: AnimationWaypointFragment;
  /** Clock time this leg starts at, ms from the tour's start. */
  startMs: number;
  durationMs: number;
};

const EASINGS: Record<Easing, (t: number) => number> = {
  [Easing.Linear]: (t) => t,
  [Easing.EaseIn]: (t) => t * t,
  [Easing.EaseOut]: (t) => t * (2 - t),
  [Easing.EaseInOut]: (t) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),
};

/** The easing curve, defaulting to the schema's own default (EASE_IN_OUT). */
export const easingFn = (easing: Easing | null | undefined): ((t: number) => number) =>
  EASINGS[easing ?? Easing.EaseInOut] ?? EASINGS[Easing.EaseInOut];

/** Waypoints in tour order. `order` is authoritative — never array position. */
export const sortWaypoints = (
  waypoints: readonly AnimationWaypointFragment[],
): AnimationWaypointFragment[] => [...waypoints].sort((a, b) => a.order - b.order);

/**
 * The tour's legs. The first waypoint is where the tour STARTS, so its
 * `durationMs` is ignored (the schema says so); every later waypoint's
 * duration is the travel TO it.
 */
export const buildTourLegs = (
  waypoints: readonly AnimationWaypointFragment[],
): TourLeg[] => {
  const ordered = sortWaypoints(waypoints);
  const legs: TourLeg[] = [];
  let clock = 0;
  for (let i = 1; i < ordered.length; i++) {
    const durationMs = Math.max(0, ordered[i].durationMs);
    legs.push({ from: ordered[i - 1], to: ordered[i], startMs: clock, durationMs });
    clock += durationMs;
  }
  return legs;
};

/** Total tour length in ms (0 for a tour of fewer than two stops). */
export const tourDurationMs = (waypoints: readonly AnimationWaypointFragment[]): number =>
  buildTourLegs(waypoints).reduce((sum, leg) => sum + leg.durationMs, 0);

/**
 * A stop → the mutation's input shape. The counterpart of
 * `platform/model/renderGraph.ts`'s `serializeRenderGraph` for tours.
 *
 * No `order`: the server writes it by enumerating the list, so tour order IS
 * array order on the way out — which is why both mutations take the whole list
 * and never a single stop.
 */
export const serializeWaypoint = (waypoint: {
  name: string;
  durationMs: number;
  easing: Easing;
  camera: CameraStateFragment;
}): AnimationWaypointInput => ({
  name: waypoint.name,
  durationMs: waypoint.durationMs,
  easing: waypoint.easing,
  camera: {
    position: waypoint.camera.position,
    crossSectionOrientation: waypoint.camera.crossSectionOrientation,
    crossSectionScale: waypoint.camera.crossSectionScale,
    projectionOrientation: waypoint.camera.projectionOrientation,
    projectionScale: waypoint.camera.projectionScale,
  },
});

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

/**
 * Zoom interpolates GEOMETRICALLY: scale is world-units-per-pixel, so a
 * linear ramp from 1 to 100 spends most of the tour barely moving and then
 * lunges. Interpolating the logarithm makes a zoom read as constant speed.
 */
const lerpScale = (a: number, b: number, t: number): number =>
  Math.exp(lerp(Math.log(a), Math.log(b), t));

const lerpNullableScale = (
  a: number | null | undefined,
  b: number | null | undefined,
  t: number,
): number | null => {
  if (typeof a !== "number" || a <= 0) return b ?? null;
  if (typeof b !== "number" || b <= 0) return a;
  return lerpScale(a, b, t);
};

const slerpOrientation = (
  a: number[] | null | undefined,
  b: number[] | null | undefined,
  t: number,
): number[] | null => {
  if (a?.length !== 4) return b?.length === 4 ? b : null;
  if (b?.length !== 4) return a;
  const qa = new THREE.Quaternion().fromArray(a);
  const qb = new THREE.Quaternion().fromArray(b);
  return qa.slerp(qb, t).toArray();
};

/**
 * Interpolate the position maps. Keyed by name, so the union is what matters:
 * an axis only one end names is held constant rather than dragged from an
 * imagined zero — the pose that omits it is saying "leave it alone", and
 * lerping toward a value it never stated would invent motion.
 */
const lerpPosition = (
  a: unknown,
  b: unknown,
  t: number,
): Record<string, number> => {
  const from = (a ?? {}) as Record<string, unknown>;
  const to = (b ?? {}) as Record<string, unknown>;
  const out: Record<string, number> = {};
  for (const name of new Set([...Object.keys(from), ...Object.keys(to)])) {
    const start = from[name];
    const end = to[name];
    if (typeof start === "number" && typeof end === "number") {
      out[name] = lerp(start, end, t);
    } else if (typeof end === "number") {
      out[name] = end;
    } else if (typeof start === "number") {
      out[name] = start;
    }
  }
  return out;
};

/** Interpolate two poses. `t` is already eased. */
export const lerpCameraState = (
  a: CameraStateFragment,
  b: CameraStateFragment,
  t: number,
): CameraStateFragment => ({
  position: lerpPosition(a.position, b.position, t),
  crossSectionOrientation: slerpOrientation(
    a.crossSectionOrientation,
    b.crossSectionOrientation,
    t,
  ),
  crossSectionScale: lerpNullableScale(a.crossSectionScale, b.crossSectionScale, t),
  projectionOrientation: slerpOrientation(
    a.projectionOrientation,
    b.projectionOrientation,
    t,
  ),
  projectionScale: lerpNullableScale(a.projectionScale, b.projectionScale, t),
});

/**
 * The pose a tour shows at `elapsedMs`. Clamped at both ends: before the start
 * is the first stop, past the end is the last. Null only for an empty tour.
 *
 * The easing of the leg's DESTINATION applies — `easing` is documented as "how
 * the viewer eases the camera along that travel", and the travel belongs to
 * the waypoint being travelled to.
 */
export const sampleTour = (
  waypoints: readonly AnimationWaypointFragment[],
  elapsedMs: number,
): CameraStateFragment | null => {
  const ordered = sortWaypoints(waypoints);
  if (ordered.length === 0) return null;
  if (ordered.length === 1) return ordered[0].camera;

  const legs = buildTourLegs(ordered);
  for (const leg of legs) {
    const end = leg.startMs + leg.durationMs;
    if (elapsedMs >= end) continue;
    if (leg.durationMs <= 0) return leg.to.camera;
    const raw = Math.max(0, (elapsedMs - leg.startMs) / leg.durationMs);
    return lerpCameraState(leg.from.camera, leg.to.camera, easingFn(leg.to.easing)(raw));
  }
  return ordered[ordered.length - 1].camera;
};
