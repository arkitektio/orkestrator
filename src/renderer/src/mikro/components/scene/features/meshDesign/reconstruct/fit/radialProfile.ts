import type { Vec3 } from "../../field/stamps";
import { median, smoothPolyline, smoothScalars } from "./polyline";
import { createTimeSlicer } from "./timeSlice";

/**
 * The TUBE fit: given a centerline, measure how wide the structure is at
 * every station by reading the intensity falloff around it.
 *
 * At each station a fan of rays leaves the centerline perpendicular to its
 * tangent. Along a ray the intensity drops from the structure's core to the
 * background; the edge is where it crosses `background + edge·(peak −
 * background)` — `edge = 0.5` is the half-maximum, the usual definition of a
 * blurred object's boundary. The station's radius is the median over its
 * rays (robust against a neighbour touching on one side), and the mean of
 * the edge points recentres the station on the structure's axis, which the
 * geodesic centerline only follows to within a voxel.
 *
 * Pure: the data arrives as `sample(x, y, z)` (WORLD coordinates → an
 * intensity, or null where nothing is loaded), so the fit is testable against
 * analytic volumes and knows nothing about bricks.
 */

export type IntensitySampler = (x: number, y: number, z: number) => number | null;

export type TubeFitOptions = {
  /** Rays never look further than this from the centerline (world units). */
  maxRadius: number;
  /** Distance between samples along a ray (world units) — about half a voxel. */
  step: number;
  /** Fraction of the core-to-background drop that counts as the edge. */
  edge: number;
  /** Smoothing passes along the tube, applied to radii and centers. */
  smooth: number;
  /** Multiplier on the measured radii. */
  scale: number;
  /** Radii never go below this (world units). */
  minRadius: number;
  /** Rays per station; even, so they come in opposite pairs. Default 12. */
  rays?: number;
};

export type TubeFit = {
  centers: Vec3[];
  radii: number[];
  /** Stations where no edge could be measured (their radius is borrowed). */
  unresolved: number;
};

type Frame = { u: Vec3; v: Vec3 };

const normalize = (v: Vec3): Vec3 => {
  const length = Math.hypot(v[0], v[1], v[2]);
  return length > 0 ? [v[0] / length, v[1] / length, v[2] / length] : [0, 0, 1];
};

const cross = (a: Vec3, b: Vec3): Vec3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];

/** Two unit vectors spanning the plane perpendicular to `tangent`. */
const frameFor = (tangent: Vec3): Frame => {
  const t = normalize(tangent);
  // The world axis least aligned with the tangent never degenerates the cross.
  const ax = Math.abs(t[0]);
  const ay = Math.abs(t[1]);
  const az = Math.abs(t[2]);
  const helper: Vec3 = ax <= ay && ax <= az ? [1, 0, 0] : ay <= az ? [0, 1, 0] : [0, 0, 1];
  const u = normalize(cross(t, helper));
  return { u, v: cross(t, u) };
};

const tangentAt = (points: readonly Vec3[], index: number): Vec3 => {
  const a = points[Math.max(0, index - 1)];
  const b = points[Math.min(points.length - 1, index + 1)];
  return [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
};

type Station = { radius: number; offset: Vec3 | null };

function measureStation(
  center: Vec3,
  frame: Frame,
  sample: IntensitySampler,
  opts: TubeFitOptions,
  rayCount: number,
): Station {
  const steps = Math.max(2, Math.ceil(opts.maxRadius / opts.step));
  const profiles: (number | null)[][] = [];
  const directions: Vec3[] = [];
  let peak = sample(center[0], center[1], center[2]) ?? Number.NEGATIVE_INFINITY;
  const floors: number[] = [];

  for (let ray = 0; ray < rayCount; ray++) {
    const angle = (ray / rayCount) * Math.PI * 2;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const direction: Vec3 = [
      frame.u[0] * cos + frame.v[0] * sin,
      frame.u[1] * cos + frame.v[1] * sin,
      frame.u[2] * cos + frame.v[2] * sin,
    ];
    directions.push(direction);
    const profile: (number | null)[] = [];
    let floor = Number.POSITIVE_INFINITY;
    for (let s = 1; s <= steps; s++) {
      const d = s * opts.step;
      const value = sample(center[0] + direction[0] * d, center[1] + direction[1] * d, center[2] + direction[2] * d);
      profile.push(value);
      if (value === null) continue;
      if (value < floor) floor = value;
      // The centerline may sit a step off the axis: the core is the brightest
      // thing within reach of it, not necessarily the station itself.
      if (s <= 2 && value > peak) peak = value;
    }
    profiles.push(profile);
    if (Number.isFinite(floor)) floors.push(floor);
  }
  if (!Number.isFinite(peak) || floors.length === 0) return { radius: Number.NaN, offset: null };
  const background = median(floors);
  if (!(peak > background)) return { radius: Number.NaN, offset: null };
  const threshold = background + opts.edge * (peak - background);

  const reaches: number[] = [];
  const bounded: boolean[] = [];
  for (const profile of profiles) {
    let previous = peak;
    let reach = Number.NaN;
    for (let s = 0; s < profile.length; s++) {
      const value = profile[s];
      if (value === null) break; // unloaded: this ray cannot answer
      if (value < threshold) {
        // Linear crossing between the last sample above and this one below.
        const t = previous > value ? (previous - threshold) / (previous - value) : 0;
        reach = (s + Math.min(1, Math.max(0, t))) * opts.step;
        break;
      }
      previous = value;
    }
    reaches.push(reach);
    bounded.push(Number.isFinite(reach));
  }
  const measured = reaches.filter((reach) => Number.isFinite(reach));
  // A structure wider than the search, or one fused with a neighbour on most
  // sides, has no honest radius here — let the neighbours along the tube say.
  if (measured.length < Math.ceil(rayCount / 3)) return { radius: Number.NaN, offset: null };

  // For a circle of radius R whose axis sits `d` off the station, a ray
  // reaches R + d·dir; averaged over the fan, Σ reach·dir = (N/2)·d.
  let offset: Vec3 | null = null;
  if (bounded.every(Boolean)) {
    let ox = 0;
    let oy = 0;
    let oz = 0;
    for (let ray = 0; ray < rayCount; ray++) {
      ox += reaches[ray] * directions[ray][0];
      oy += reaches[ray] * directions[ray][1];
      oz += reaches[ray] * directions[ray][2];
    }
    offset = [(2 * ox) / rayCount, (2 * oy) / rayCount, (2 * oz) / rayCount];
  }
  return { radius: median(measured), offset };
}

/** Fill NaN runs by linear interpolation between their measured neighbours. */
function fillUnresolved(radii: number[]): number {
  let unresolved = 0;
  let last = -1;
  for (let i = 0; i < radii.length; i++) {
    if (!Number.isFinite(radii[i])) {
      unresolved += 1;
      continue;
    }
    for (let gap = last + 1; gap < i; gap++) {
      radii[gap] = last < 0 ? radii[i] : radii[last] + ((radii[i] - radii[last]) * (gap - last)) / (i - last);
    }
    last = i;
  }
  if (last >= 0) for (let gap = last + 1; gap < radii.length; gap++) radii[gap] = radii[last];
  return unresolved;
}

/** A ray never takes more samples than this, however far it may look. */
export const MAX_RAY_STEPS = 48;

/**
 * Measure a radius per station of `points` and recentre the stations. Null
 * when not a single station found an edge (nothing bright, or nothing
 * loaded) — or when `stale` said a newer run took over.
 *
 * Async because it is main-thread work (see `timeSlice.ts`): it yields
 * between stations, so a long tube never holds a frame.
 */
export async function fitTube(
  points: readonly Vec3[],
  sample: IntensitySampler,
  options: TubeFitOptions,
  stale: () => boolean = () => false,
): Promise<TubeFit | null> {
  if (points.length === 0) return null;
  // Coarsen the ray rather than let a large search radius multiply the reads.
  const opts = { ...options, step: Math.max(options.step, options.maxRadius / MAX_RAY_STEPS) };
  const rayCount = Math.max(4, (opts.rays ?? 12) & ~1);
  const slicer = createTimeSlicer();
  const centers: Vec3[] = [];
  const radii: number[] = [];
  for (let i = 0; i < points.length; i++) {
    await slicer.tick();
    if (stale()) return null;
    const station = measureStation(points[i], frameFor(tangentAt(points, i)), sample, opts, rayCount);
    radii.push(station.radius);
    const offset = station.offset;
    centers.push(
      offset ? [points[i][0] + offset[0], points[i][1] + offset[1], points[i][2] + offset[2]] : points[i],
    );
  }
  const unresolved = fillUnresolved(radii);
  if (unresolved === radii.length) return null;

  // A 3-wide median first: one station that caught a branch or a bright
  // speck must not bulge the tube before the smoothing spreads it around.
  const despiked = radii.map((radius, i) =>
    median([radii[Math.max(0, i - 1)], radius, radii[Math.min(radii.length - 1, i + 1)]]),
  );
  const passes = Math.max(0, Math.round(opts.smooth));
  const smoothed = smoothScalars(despiked, passes);
  return {
    centers: smoothPolyline(centers, passes),
    radii: smoothed.map((radius) => Math.max(opts.minRadius, radius * opts.scale)),
    unresolved,
  };
}
