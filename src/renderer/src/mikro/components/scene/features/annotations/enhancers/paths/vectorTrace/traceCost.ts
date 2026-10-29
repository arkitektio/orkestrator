/**
 * What makes a voxel cheap to trace through.
 *
 * Three terms, each normalized to [0, 1] where 0 is "ideal" and 1 is "as bad as
 * this box gets", combined with user-set weights:
 *
 * - **intensity** — bright voxels are cheap (or dark ones, inverted). This is
 *   the term that makes a trace follow a filament, vessel or neurite.
 * - **gradient** — voxels with a strong local gradient are cheap. Follows
 *   BOUNDARIES rather than cores; it is what 2D livewire uses.
 * - **straightness** — voxels far from the straight line between the two
 *   waypoints are expensive. The anti-ramble term: without it a path will take
 *   a long detour to save a little intensity cost. When the user DREW the
 *   route (a freehand stroke), the stroke takes the chord's place: the term
 *   measures distance from the stroke, and past the corridor radius a voxel is
 *   impassable — the snap may straighten a wobbly hand, never jump to a
 *   different structure.
 *
 * Normalization is over the extracted box, not over the layer's data range: a
 * trace is a local question, and a box that happens to hold no bright voxels
 * should still prefer its brightest ones. The cost of that choice is that the
 * same weights behave differently in different boxes — worth knowing when
 * tuning.
 *
 * Weights are NOT normalized against each other. Each is "how much cost a
 * maximally bad voxel adds", so raising all three really does tighten the path
 * against `TRACE_BASE_COST` (the shortest-path pull) rather than cancelling out.
 */

/** Unsampled voxels are `NaN` on the way in and impassable on the way out. */
export type TraceWeights = {
  intensity: number;
  gradient: number;
  straightness: number;
  /** Follow DARK structures instead of bright ones. */
  invert: boolean;
};

export const DEFAULT_TRACE_WEIGHTS: TraceWeights = {
  intensity: 1,
  gradient: 0,
  straightness: 0.25,
  invert: false,
};

/** Ceiling on the combined term, so no weighting can make the metric explode. */
export const MAX_TRACE_COST = 4;

export type TraceCostInput = {
  /** Sampled values, x-fastest; `NaN` where nothing was resident. */
  values: Float32Array;
  size: readonly [number, number, number];
  /** World length of one node step per axis — the gradient is per world unit. */
  spacing: readonly [number, number, number];
  weights: TraceWeights;
  /**
   * The hop's endpoints, in node coordinates — the chord the straightness
   * term measures from. Omitted (a live-wire tree, which has no goal yet),
   * the straightness term says nothing.
   */
  start?: readonly [number, number, number];
  goal?: readonly [number, number, number];
  /** A drawn route to keep to instead of the chord; see `TraceGuide`. */
  guide?: TraceGuide;
};

/**
 * A freehand stroke the trace must stay near: its samples in NODE
 * coordinates (continuous, not rounded), and how far from it the path may
 * stray, in world units.
 */
export type TraceGuide = {
  points: readonly (readonly [number, number, number])[];
  radius: number;
  /**
   * Measure the distance in x/y only. A stroke drawn on one slice says where
   * the structure runs ACROSS the slice, nothing about its depth — a "3D"
   * snap may still leave the slice, as far as its box lets it.
   */
  planar?: boolean;
};

/** Finite min/max of the box, or null when nothing was sampled. */
function valueRange(values: Float32Array): { min: number; max: number } | null {
  let min = Infinity;
  let max = -Infinity;
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    if (!Number.isFinite(value)) continue;
    if (value < min) min = value;
    if (value > max) max = value;
  }
  return min === Infinity ? null : { min, max };
}

/**
 * Central-difference gradient magnitude per world unit, one-sided at the box
 * edge and wherever a neighbour was never sampled (a missing neighbour is not
 * evidence of a step change).
 */
function gradientField(
  values: Float32Array,
  size: readonly [number, number, number],
  spacing: readonly [number, number, number],
): { field: Float32Array; max: number } {
  const field = new Float32Array(values.length);
  const [sx, sy] = [size[0], size[1]];
  const plane = sx * sy;
  let max = 0;

  const valueAt = (index: number, fallback: number): number => {
    const value = values[index];
    return Number.isFinite(value) ? value : fallback;
  };

  for (let z = 0; z < size[2]; z += 1) {
    for (let y = 0; y < size[1]; y += 1) {
      for (let x = 0; x < size[0]; x += 1) {
        const index = x + y * sx + z * plane;
        const center = values[index];
        if (!Number.isFinite(center)) continue;

        const low = [
          x > 0 ? valueAt(index - 1, center) : center,
          y > 0 ? valueAt(index - sx, center) : center,
          z > 0 ? valueAt(index - plane, center) : center,
        ];
        const high = [
          x < size[0] - 1 ? valueAt(index + 1, center) : center,
          y < size[1] - 1 ? valueAt(index + sx, center) : center,
          z < size[2] - 1 ? valueAt(index + plane, center) : center,
        ];
        // Span is 2 steps for a central difference, 1 at a one-sided edge.
        const span = [
          (x > 0 ? 1 : 0) + (x < size[0] - 1 ? 1 : 0),
          (y > 0 ? 1 : 0) + (y < size[1] - 1 ? 1 : 0),
          (z > 0 ? 1 : 0) + (z < size[2] - 1 ? 1 : 0),
        ];

        let sum = 0;
        for (let axis = 0; axis < 3; axis += 1) {
          if (span[axis] === 0) continue;
          const derivative =
            (high[axis] - low[axis]) / (span[axis] * (spacing[axis] || 1));
          sum += derivative * derivative;
        }
        const magnitude = Math.sqrt(sum);
        field[index] = magnitude;
        if (magnitude > max) max = magnitude;
      }
    }
  }

  return { field, max };
}

/**
 * Perpendicular world distance from a node to the chord between the waypoints,
 * normalized so that 1 means "half the hop's length away from it". A hop is
 * allowed to bow in proportion to its own length — an obstacle 5 voxels wide
 * matters differently on a 10-voxel hop than on a 500-voxel one.
 */
function chordDistances(
  size: readonly [number, number, number],
  spacing: readonly [number, number, number],
  start: readonly [number, number, number],
  goal: readonly [number, number, number],
): Float32Array {
  const field = new Float32Array(size[0] * size[1] * size[2]);
  const axis = [
    (goal[0] - start[0]) * spacing[0],
    (goal[1] - start[1]) * spacing[1],
    (goal[2] - start[2]) * spacing[2],
  ];
  const length = Math.hypot(axis[0], axis[1], axis[2]);
  // Coincident waypoints have no chord to be far from.
  if (length === 0) return field;

  const unit = [axis[0] / length, axis[1] / length, axis[2] / length];
  const tolerance = length / 2;
  const plane = size[0] * size[1];

  for (let z = 0; z < size[2]; z += 1) {
    for (let y = 0; y < size[1]; y += 1) {
      for (let x = 0; x < size[0]; x += 1) {
        const relative = [
          (x - start[0]) * spacing[0],
          (y - start[1]) * spacing[1],
          (z - start[2]) * spacing[2],
        ];
        const along =
          relative[0] * unit[0] + relative[1] * unit[1] + relative[2] * unit[2];
        const perpendicular = Math.hypot(
          relative[0] - along * unit[0],
          relative[1] - along * unit[1],
          relative[2] - along * unit[2],
        );
        field[x + y * size[0] + z * plane] = Math.min(
          1,
          perpendicular / tolerance,
        );
      }
    }
  }

  return field;
}

/**
 * World distance from every node to the guide polyline, divided by the
 * guide's radius — so 1 is the corridor wall, and anything past it is
 * `Infinity`. Rasterized one segment at a time over only the nodes that
 * segment can reach, so the work is the corridor's area, not the box's
 * area times the stroke's length.
 */
export function guideDistances(
  size: readonly [number, number, number],
  spacing: readonly [number, number, number],
  guide: TraceGuide,
): Float32Array {
  const field = new Float32Array(size[0] * size[1] * size[2]).fill(Infinity);
  const { points, radius, planar = false } = guide;
  if (points.length === 0 || radius <= 0) return field;

  const plane = size[0] * size[1];
  const scale: [number, number, number] = [
    spacing[0] || 1,
    spacing[1] || 1,
    planar ? 0 : spacing[2] || 1,
  ];
  // A one-sample stroke is a disc around its only point.
  const segments =
    points.length === 1 ? [[points[0], points[0]] as const] : points.slice(1).map((b, i) => [points[i], b] as const);

  for (const [a, b] of segments) {
    const from = [0, 0, 0];
    const to = [0, 0, 0];
    for (let axis = 0; axis < 3; axis += 1) {
      // Planar: every slice is within reach — distance ignores z.
      const reach = scale[axis] === 0 ? size[axis] : Math.ceil(radius / scale[axis]);
      from[axis] = Math.max(0, Math.floor(Math.min(a[axis], b[axis]) - reach));
      to[axis] = Math.min(size[axis] - 1, Math.ceil(Math.max(a[axis], b[axis]) + reach));
    }
    const bx = (b[0] - a[0]) * scale[0];
    const by = (b[1] - a[1]) * scale[1];
    const bz = (b[2] - a[2]) * scale[2];
    const lengthSq = bx * bx + by * by + bz * bz;

    for (let z = from[2]; z <= to[2]; z += 1) {
      for (let y = from[1]; y <= to[1]; y += 1) {
        for (let x = from[0]; x <= to[0]; x += 1) {
          const px = (x - a[0]) * scale[0];
          const py = (y - a[1]) * scale[1];
          const pz = (z - a[2]) * scale[2];
          const t =
            lengthSq > 0
              ? Math.min(1, Math.max(0, (px * bx + py * by + pz * bz) / lengthSq))
              : 0;
          const distance =
            Math.hypot(px - t * bx, py - t * by, pz - t * bz) / radius;
          if (distance > 1) continue;
          const index = x + y * size[0] + z * plane;
          if (distance < field[index]) field[index] = distance;
        }
      }
    }
  }

  return field;
}

/**
 * The cost field the search consumes: [0, MAX_TRACE_COST] per node, `Infinity`
 * where nothing was resident.
 */
export function buildTraceCost(input: TraceCostInput): Float32Array {
  const { values, size, spacing, weights, start, goal, guide } = input;
  const cost = new Float32Array(values.length);

  const range = valueRange(values);
  // A box with no data at all, or one flat value: nothing to prefer, so the
  // intensity term says nothing rather than saying "all equally bad".
  const span = range && range.max > range.min ? range.max - range.min : 0;

  const wantsGradient = weights.gradient !== 0;
  const gradient = wantsGradient
    ? gradientField(values, size, spacing)
    : { field: new Float32Array(0), max: 0 };

  // The guide replaces the chord: a drawn route is a better "straight" than
  // the line between its ends. It also walls the corridor off, so it is built
  // whatever the straightness weight says.
  const corridor = guide ? guideDistances(size, spacing, guide) : null;
  const wantsChord =
    weights.straightness !== 0 && (corridor !== null || (start !== undefined && goal !== undefined));
  const chord = !wantsChord
    ? new Float32Array(0)
    : (corridor ?? chordDistances(size, spacing, start!, goal!));

  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    if (!Number.isFinite(value) || (corridor && !Number.isFinite(corridor[index]))) {
      cost[index] = Infinity;
      continue;
    }

    let total = 0;

    if (weights.intensity !== 0 && span > 0 && range) {
      const normalized = (value - range.min) / span;
      // Bright is cheap: resistance falls as intensity rises.
      total += weights.intensity * (weights.invert ? normalized : 1 - normalized);
    }

    if (wantsGradient && gradient.max > 0) {
      total += weights.gradient * (1 - gradient.field[index] / gradient.max);
    }

    if (wantsChord) {
      total += weights.straightness * chord[index];
    }

    cost[index] = Math.min(MAX_TRACE_COST, Math.max(0, total));
  }

  return cost;
}
