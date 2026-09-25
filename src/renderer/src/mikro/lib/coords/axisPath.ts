import type { PathStep, PathTransformLike } from "./pathTypes";

/**
 * Named-axis application of a server-resolved transformation path.
 *
 * `transformGraph.evalTransform` folds a path into ONE spatial 4×4 for the
 * renderer — it extracts an [x, y, z] subset and drops everything else. An
 * attribute plan's path moves an arbitrary NAMED tuple instead ({t, y, x}
 * with c passing through untouched, possibly more than three axes), because
 * the plan's `consumes`/`passthrough` are stated by axis name in the plan's
 * own space. So this module evaluates the same edge payloads directly on a
 * `Record<axisName, number>`:
 *
 *  - axes an edge names are mapped `inputAxes[i] → outputAxes[i]`;
 *  - axes an edge does NOT name pass through untouched (the ByDimension
 *    semantics transformGraph documents) — a plan only ever reads the axes it
 *    declared, so surplus keys are harmless;
 *  - anything that cannot be evaluated (a Field edge, an Unmappable, a
 *    singular inverse, a named axis the point does not carry) returns null —
 *    the plan is UNREACHABLE from this point, never looked up with wrong
 *    coordinates.
 */

export type AxisCoords = Record<string, number>;

/** Solve A·x = b by Gaussian elimination (A square). Null when singular. */
const solveLinear = (a: number[][], b: number[]): number[] | null => {
  const n = b.length;
  // Augmented copy.
  const m = a.map((row, r) => [...row, b[r]]);
  for (let col = 0; col < n; col++) {
    let pivot = col;
    for (let r = col + 1; r < n; r++) {
      if (Math.abs(m[r][col]) > Math.abs(m[pivot][col])) pivot = r;
    }
    if (Math.abs(m[pivot][col]) < 1e-12) return null;
    if (pivot !== col) [m[col], m[pivot]] = [m[pivot], m[col]];
    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const factor = m[r][col] / m[col][col];
      if (factor === 0) continue;
      for (let c = col; c <= n; c++) m[r][c] -= factor * m[col][c];
    }
  }
  return m.map((row, r) => row[n] / m[r][r]);
};

const readNamed = (
  coords: AxisCoords,
  axes: readonly string[],
): number[] | null => {
  const values: number[] = [];
  for (const axis of axes) {
    const value = coords[axis];
    if (value === undefined || !Number.isFinite(value)) return null;
    values.push(value);
  }
  return values;
};

/** Replace the axes an edge consumed with the ones it produced. */
const writeNamed = (
  coords: AxisCoords,
  consumed: readonly string[],
  produced: readonly string[],
  values: readonly number[],
): AxisCoords => {
  const out: AxisCoords = { ...coords };
  for (const axis of consumed) delete out[axis];
  produced.forEach((axis, i) => {
    out[axis] = values[i];
  });
  return out;
};

const applyTransform = (
  transform: PathTransformLike | null,
  inverted: boolean,
  coords: AxisCoords,
): AxisCoords | null => {
  if (!transform) return coords;
  const typename = transform.__typename ?? "";
  // Walking inverted swaps which side of the edge we read/write.
  const axesIn = (inverted ? transform.outputAxes : transform.inputAxes) ?? [];
  const axesOut = (inverted ? transform.inputAxes : transform.outputAxes) ?? [];

  switch (typename) {
    case "IdentityTransformation":
    case "MapAxisTransformation": {
      const values = readNamed(coords, axesIn);
      if (values === null) return null;
      return writeNamed(coords, axesIn, axesOut, values);
    }
    case "ScaleTransformation": {
      const values = readNamed(coords, axesIn);
      if (values === null) return null;
      // Scale entries follow the edge's own inputAxes order regardless of
      // walk direction.
      const paramAxes = transform.inputAxes ?? axesIn;
      const scaled = values.map((v, i) => {
        const p = paramAxes.indexOf(axesIn[i]);
        const factor = (p !== -1 ? transform.scale?.[p] : undefined) ?? 1;
        if (inverted && factor === 0) return NaN;
        return inverted ? v / factor : v * factor;
      });
      if (scaled.some((v) => !Number.isFinite(v))) return null;
      return writeNamed(coords, axesIn, axesOut, scaled);
    }
    case "TranslationTransformation": {
      const values = readNamed(coords, axesIn);
      if (values === null) return null;
      const paramAxes = transform.inputAxes ?? axesIn;
      const moved = values.map((v, i) => {
        const p = paramAxes.indexOf(axesIn[i]);
        const offset = (p !== -1 ? transform.translation?.[p] : undefined) ?? 0;
        return inverted ? v - offset : v + offset;
      });
      return writeNamed(coords, axesIn, axesOut, moved);
    }
    case "AffineTransformation":
    case "RotationTransformation": {
      // Rows in output axis order, columns in input axis order, last column
      // the translation — the transformGraph reading of the payload.
      const rows = transform.affine;
      const edgeIn = transform.inputAxes ?? [];
      const edgeOut = transform.outputAxes ?? [];
      if (!rows?.length) return null;
      if (!inverted) {
        const values = readNamed(coords, edgeIn);
        if (values === null) return null;
        const out = edgeOut.map((_, r) => {
          const row = rows[r];
          if (!row) return NaN;
          let acc = row[edgeIn.length] ?? 0;
          for (let c = 0; c < edgeIn.length; c++) acc += (row[c] ?? 0) * values[c];
          return acc;
        });
        if (out.some((v) => !Number.isFinite(v))) return null;
        return writeNamed(coords, edgeIn, edgeOut, out);
      }
      // Inverted: we hold output-space values and solve for input-space ones.
      if (edgeIn.length !== edgeOut.length) return null;
      const values = readNamed(coords, edgeOut);
      if (values === null) return null;
      const n = edgeIn.length;
      const linear = edgeOut.map((_, r) =>
        Array.from({ length: n }, (_, c) => rows[r]?.[c] ?? 0),
      );
      const rhs = values.map((v, r) => v - (rows[r]?.[n] ?? 0));
      const solved = solveLinear(linear, rhs);
      if (solved === null) return null;
      return writeNamed(coords, edgeOut, edgeIn, solved);
    }
    case "SequenceTransformation": {
      const children = transform.transformations ?? [];
      const ordered = inverted ? [...children].reverse() : children;
      let current: AxisCoords | null = coords;
      for (const child of ordered) {
        current = applyTransform(
          child as PathTransformLike,
          inverted,
          current,
        );
        if (current === null) return null;
      }
      return current;
    }
    case "ByDimensionTransformation": {
      // Children act on DISJOINT axis subsets; order is immaterial but we
      // keep it, and inverting the composite just inverts every child.
      let current: AxisCoords | null = coords;
      for (const child of transform.transformations ?? []) {
        current = applyTransform(
          child as PathTransformLike,
          inverted,
          current,
        );
        if (current === null) return null;
      }
      return current;
    }
    default:
      // Field, Unmappable, Bijection, future kinds: no pointwise evaluation.
      return null;
  }
};

export const applyStepToCoords = (
  step: PathStep,
  coords: AxisCoords,
): AxisCoords | null => applyTransform(step.transformation, step.inverted, coords);

/**
 * Compose a plan's `path` over a probed point: steps first-to-last, inverting
 * the flagged ones — the `pathToWorld` contract. Null = the plan is not
 * reachable from this point.
 */
export function applyPathToCoords(
  path: readonly PathStep[],
  coords: AxisCoords,
): AxisCoords | null {
  let current: AxisCoords | null = coords;
  for (const step of path) {
    current = applyStepToCoords(step, current);
    if (current === null) return null;
  }
  return current;
}
