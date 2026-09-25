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
 *   a long detour to save a little intensity cost.
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
  /** The hop's endpoints, in node coordinates. */
  start: readonly [number, number, number];
  goal: readonly [number, number, number];
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
 * The cost field the search consumes: [0, MAX_TRACE_COST] per node, `Infinity`
 * where nothing was resident.
 */
export function buildTraceCost(input: TraceCostInput): Float32Array {
  const { values, size, spacing, weights, start, goal } = input;
  const cost = new Float32Array(values.length);

  const range = valueRange(values);
  // A box with no data at all, or one flat value: nothing to prefer, so the
  // intensity term says nothing rather than saying "all equally bad".
  const span = range && range.max > range.min ? range.max - range.min : 0;

  const wantsGradient = weights.gradient !== 0;
  const gradient = wantsGradient
    ? gradientField(values, size, spacing)
    : { field: new Float32Array(0), max: 0 };

  const wantsChord = weights.straightness !== 0;
  const chord = wantsChord
    ? chordDistances(size, spacing, start, goal)
    : new Float32Array(0);

  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    if (!Number.isFinite(value)) {
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
