/**
 * Named-axis affine algebra: one transformation EDGE as a full `M × (N+1)`
 * matrix over its NAMED axes, and the two products an interactive
 * registration needs to rewrite that edge.
 *
 * Why this exists next to `transformGraph.ts` rather than inside it:
 * `evalTransform` reduces an edge to the SPATIAL 4×4 — exactly right for
 * drawing, and exactly wrong for authoring. A registration over `(t,z,y,x)`
 * rebuilt from its spatial reduction loses its `t` row; a `(c,y,x)` edge loses
 * `c`. Re-saving an edge must preserve every axis it names, so the algebra
 * here never drops to x/y/z: a world-space delta is EMBEDDED into the edge's
 * own axis space by NAME, identity on everything non-spatial.
 *
 * This evaluates ONE edge. It never walks a path — `Layer.asAffine` stays the
 * only placement authority (COORDINATE_SYSTEMS.md §1 R1/R1a).
 *
 * Conventions, all inherited from the schema:
 *  - rows in `outputAxes` order, columns in `inputAxes` order, translation in
 *    the LAST column (index `inputAxes.length`);
 *  - an axis an edge does not name passes through untouched;
 *  - `Mat4` deltas are row-major `[x', y', z', w]` — the spatial-slot order
 *    `spatialAxisTriple` and `affineToMatrix4` share.
 *
 * Pure: imports nothing generated, so its suite runs in `node`.
 */
import { invert4, type TransformLike } from "@/core/data/scene/coords/transformGraph";

export type NamedAffine = {
  inputAxes: readonly string[];
  outputAxes: readonly string[];
  /** `outputAxes.length` rows × `inputAxes.length + 1` columns. */
  matrix: number[][];
};

/** [x, y, z] axis NAMES of one side; null = that side has no such axis. */
export type SpatialTriple = readonly (string | null | undefined)[];

export type NamedAffineResult =
  | { ok: true; affine: NamedAffine; /** Rows/columns had to be added. */ extended: boolean }
  | { ok: false; reason: string };

const EPSILON = 1e-12;

const zeros = (rows: number, cols: number): number[][] =>
  Array.from({ length: rows }, () => new Array<number>(cols).fill(0));

const unique = (names: readonly string[]): string[] => [...new Set(names)];

/* ------------------------------------------------------------------ */
/* One edge → NamedAffine                                              */
/* ------------------------------------------------------------------ */

/**
 * Homogeneous square embedding over an axis universe `U`: the rows an edge
 * names come from the edge, every other axis of `U` passes through.
 */
const embed = (affine: NamedAffine, universe: readonly string[]): number[][] => {
  const n = universe.length;
  const out = zeros(n + 1, n + 1);
  for (let i = 0; i <= n; i++) out[i][i] = 1;
  affine.outputAxes.forEach((name, r) => {
    const row = universe.indexOf(name);
    out[row].fill(0);
    affine.inputAxes.forEach((inName, c) => {
      out[row][universe.indexOf(inName)] = affine.matrix[r][c];
    });
    out[row][n] = affine.matrix[r][affine.inputAxes.length];
  });
  return out;
};

const mulSquare = (a: number[][], b: number[][]): number[][] => {
  const n = a.length;
  const out = zeros(n, n);
  for (let r = 0; r < n; r++)
    for (let c = 0; c < n; c++) {
      let sum = 0;
      for (let k = 0; k < n; k++) sum += a[r][k] * b[k][c];
      out[r][c] = sum;
    }
  return out;
};

/**
 * Cut a universe-square matrix back down to the named rows/columns. Null when
 * a kept row still depends on a DROPPED column: the composite then cannot be
 * said over the axes it claims, and guessing would misplace silently.
 */
const extract = (
  square: number[][],
  universe: readonly string[],
  inputAxes: readonly string[],
  outputAxes: readonly string[],
): NamedAffine | null => {
  const n = universe.length;
  const kept = new Set(inputAxes);
  const matrix: number[][] = [];
  for (const out of outputAxes) {
    const row = square[universe.indexOf(out)];
    if (!row) return null;
    for (let c = 0; c < n; c++) {
      if (!kept.has(universe[c]) && Math.abs(row[c]) > EPSILON) return null;
    }
    matrix.push([...inputAxes.map((name) => row[universe.indexOf(name)]), row[n]]);
  }
  return { inputAxes: [...inputAxes], outputAxes: [...outputAxes], matrix };
};

const diagonalLeaf = (
  transform: NonNullable<TransformLike>,
  values: readonly number[] | null | undefined,
  place: (row: number[], index: number, value: number, width: number) => void,
): NamedAffine | null => {
  const inputAxes = transform.inputAxes;
  if (!inputAxes?.length || !values || values.length !== inputAxes.length) return null;
  // A scale/translation is name-preserving by construction (its parameters are
  // read by input-axis position and never consult `outputAxes` — see
  // `renamesAnyAxis` in forms/registration/mapping.ts), so a differing
  // `outputAxes` is honoured only when it pairs one-to-one.
  const outputAxes =
    transform.outputAxes?.length === inputAxes.length ? transform.outputAxes : inputAxes;
  const width = inputAxes.length + 1;
  const matrix = inputAxes.map((_, i) => {
    const row = new Array<number>(width).fill(0);
    row[i] = 1;
    place(row, i, values[i], width);
    return row;
  });
  return { inputAxes: [...inputAxes], outputAxes: [...outputAxes], matrix };
};

/**
 * One edge as a NamedAffine, or null when it is not affine-expressible (FIELD,
 * MAP_AXIS, UNMAPPABLE, bijections) or violates the arity contract. Strict on
 * purpose: `evalTransform` TOLERATES mis-sized payloads because drawing
 * approximately beats drawing nothing, but re-saving a mis-read edge would
 * launder the misreading into the stored data.
 */
export const namedAffineOf = (transform: TransformLike): NamedAffine | null => {
  if (!transform) return null;
  switch (transform.__typename) {
    case "IdentityTransformation": {
      const inputAxes = transform.inputAxes ?? [];
      const outputAxes = transform.outputAxes ?? inputAxes;
      if (outputAxes.length !== inputAxes.length) return null;
      const width = inputAxes.length + 1;
      return {
        inputAxes: [...inputAxes],
        outputAxes: [...outputAxes],
        matrix: inputAxes.map((_, i) => {
          const row = new Array<number>(width).fill(0);
          row[i] = 1;
          return row;
        }),
      };
    }
    case "ScaleTransformation":
      return diagonalLeaf(transform, transform.scale, (row, i, value) => {
        row[i] = value;
      });
    case "TranslationTransformation":
      return diagonalLeaf(transform, transform.translation, (row, _i, value, width) => {
        row[width - 1] = value;
      });
    case "AffineTransformation":
    case "RotationTransformation": {
      const { inputAxes, outputAxes, affine } = transform;
      if (!inputAxes?.length || !outputAxes?.length || !affine) return null;
      if (affine.length !== outputAxes.length) return null;
      const width = inputAxes.length + 1;
      if (affine.some((row) => row.length !== width)) return null;
      return {
        inputAxes: [...inputAxes],
        outputAxes: [...outputAxes],
        matrix: affine.map((row) => [...row]),
      };
    }
    case "SequenceTransformation":
    case "ByDimensionTransformation": {
      const children: NamedAffine[] = [];
      for (const child of transform.transformations ?? []) {
        const evaluated = namedAffineOf(child);
        if (!evaluated) return null;
        children.push(evaluated);
      }
      const inputAxes = transform.inputAxes ?? children[0]?.inputAxes ?? [];
      const outputAxes = transform.outputAxes ?? children.at(-1)?.outputAxes ?? [];
      const universe = unique([
        ...inputAxes,
        ...outputAxes,
        ...children.flatMap((child) => [...child.inputAxes, ...child.outputAxes]),
      ]);

      if (transform.__typename === "SequenceTransformation") {
        // First to last, each applied to the result of the previous.
        let square = embed({ inputAxes: [], outputAxes: [], matrix: [] }, universe);
        for (const child of children) square = mulSquare(embed(child, universe), square);
        return extract(square, universe, inputAxes, outputAxes);
      }

      // BY_DIMENSION children act IN PARALLEL on disjoint axis subsets: each
      // reads the ORIGINAL input, never a sibling's output. Multiplying them in
      // sequence is the same thing only while nobody renames an axis — a
      // `y→x` / `x→y` pair would read its sibling's result — so the rows are
      // laid side by side instead.
      const claimed = new Set<string>();
      const n = universe.length;
      const square = embed({ inputAxes: [], outputAxes: [], matrix: [] }, universe);
      for (const child of children) {
        const childSquare = embed(child, universe);
        for (const name of child.outputAxes) {
          if (claimed.has(name)) return null;
          claimed.add(name);
          const row = universe.indexOf(name);
          square[row] = childSquare[row].slice(0, n + 1);
        }
      }
      return extract(square, universe, inputAxes, outputAxes);
    }
    default:
      return null;
  }
};

/* ------------------------------------------------------------------ */
/* World delta × edge                                                  */
/* ------------------------------------------------------------------ */

type Mat4 = readonly (readonly number[])[];

/**
 * Which spatial slots a delta actually moves: slot i is touched when row i or
 * column i of the linear block differs from identity, or it translates along
 * i. Untouched slots are left exactly as the edge has them — including ABSENT,
 * which is what keeps a partial registration partial.
 */
export const touchedSlots = (delta: Mat4): [boolean, boolean, boolean] => {
  const touched: [boolean, boolean, boolean] = [false, false, false];
  for (let i = 0; i < 3; i++) {
    if (Math.abs(delta[i][3]) > EPSILON) touched[i] = true;
    for (let j = 0; j < 3; j++) {
      if (Math.abs(delta[i][j] - (i === j ? 1 : 0)) > EPSILON) {
        touched[i] = true;
        touched[j] = true;
      }
    }
  }
  return touched;
};

export const isIdentityDelta = (delta: Mat4): boolean =>
  touchedSlots(delta).every((touched) => !touched);

const SLOT_LABEL = ["x", "y", "z"] as const;

const addColumn = (affine: { inputAxes: string[]; matrix: number[][] }, name: string): number => {
  const at = affine.inputAxes.length;
  affine.inputAxes.push(name);
  // Before the translation column, which stays last.
  for (const row of affine.matrix) row.splice(at, 0, 0);
  return at;
};

const addRow = (
  affine: { inputAxes: string[]; outputAxes: string[]; matrix: number[][] },
  name: string,
): number[] => {
  const row = new Array<number>(affine.inputAxes.length + 1).fill(0);
  affine.outputAxes.push(name);
  affine.matrix.push(row);
  return row;
};

const mutableCopy = (affine: NamedAffine) => ({
  inputAxes: [...affine.inputAxes],
  outputAxes: [...affine.outputAxes],
  matrix: affine.matrix.map((row) => [...row]),
});

/**
 * `E′ = embed(D) · E` — the edge's OUTPUT side is the world the delta is
 * written in (a forward final step).
 *
 * `dataSpatial` is the [x, y, z] triple on the edge's INPUT side. It is only
 * consulted when the delta touches a world axis the edge does not write: that
 * axis currently passes through from the data's axis in the same slot, so the
 * pass-through is made explicit (row of the world axis, 1 at the data axis)
 * before the delta mixes it. Data with no axis in that slot — a 2D image tilted
 * out of plane — gets a zero row: it sits at 0 there, which is what a plane is.
 */
export const leftMultiplyWorldDelta = (
  edge: NamedAffine,
  delta: Mat4,
  axes: { worldSpatial: SpatialTriple; dataSpatial: SpatialTriple },
): NamedAffineResult => {
  const touched = touchedSlots(delta);
  const next = mutableCopy(edge);
  let extended = false;

  for (let slot = 0; slot < 3; slot++) {
    if (!touched[slot]) continue;
    const worldName = axes.worldSpatial[slot];
    if (!worldName) {
      return {
        ok: false,
        reason: `The adjustment moves along ${SLOT_LABEL[slot]}, but the world has no ${SLOT_LABEL[slot]} axis to store it on.`,
      };
    }
    if (next.outputAxes.includes(worldName)) continue;
    extended = true;
    const dataName = axes.dataSpatial[slot];
    if (dataName && !next.inputAxes.includes(dataName)) addColumn(next, dataName);
    const row = addRow(next, worldName);
    if (dataName) row[next.inputAxes.indexOf(dataName)] = 1;
  }

  const rowOf = [0, 1, 2].map((slot) => {
    const name = axes.worldSpatial[slot];
    return name ? next.outputAxes.indexOf(name) : -1;
  });
  const width = next.inputAxes.length + 1;
  const before = next.matrix.map((row) => [...row]);

  for (let i = 0; i < 3; i++) {
    if (!touched[i]) continue;
    const row = new Array<number>(width).fill(0);
    for (let k = 0; k < 3; k++) {
      const source = rowOf[k];
      // An absent row k is an untouched slot, so delta[i][k] is 0 there.
      if (source === -1 || delta[i][k] === 0) continue;
      for (let c = 0; c < width; c++) row[c] += delta[i][k] * before[source][c];
    }
    row[width - 1] += delta[i][3];
    next.matrix[rowOf[i]] = row;
  }

  return { ok: true, affine: next, extended };
};

/**
 * `E′ = E · embed(D⁻¹)` — the edge's INPUT side is the world (an INVERTED
 * final step: the path walks this edge output→input, so the step matrix is
 * `E⁻¹` and `D·E⁻¹ = (E·D⁻¹)⁻¹`). Direction-preserving: the edge keeps saying
 * what it said, world→data.
 *
 * `dataSpatial` is the triple on the edge's OUTPUT side. Extension here needs
 * a data axis to pass the new world column through to; without one the edge
 * would stop being invertible and the path could no longer walk it backwards,
 * so that case is refused rather than stored.
 */
export const rightMultiplyInverseDelta = (
  edge: NamedAffine,
  delta: Mat4,
  axes: { worldSpatial: SpatialTriple; dataSpatial: SpatialTriple },
): NamedAffineResult => {
  const inverse = invert4(delta.map((row) => [...row]));
  if (!inverse) return { ok: false, reason: "The adjustment is singular and cannot be inverted." };

  const touched = touchedSlots(delta);
  const next = mutableCopy(edge);
  let extended = false;

  for (let slot = 0; slot < 3; slot++) {
    if (!touched[slot]) continue;
    const worldName = axes.worldSpatial[slot];
    if (!worldName) {
      return {
        ok: false,
        reason: `The adjustment moves along ${SLOT_LABEL[slot]}, but the world has no ${SLOT_LABEL[slot]} axis to store it on.`,
      };
    }
    if (next.inputAxes.includes(worldName)) continue;
    const dataName = axes.dataSpatial[slot];
    if (!dataName) {
      return {
        ok: false,
        reason: `The adjustment moves along ${SLOT_LABEL[slot]}, which this data has no axis for; an edge stored world→data cannot hold that and stay invertible.`,
      };
    }
    extended = true;
    const column = addColumn(next, worldName);
    if (!next.outputAxes.includes(dataName)) addRow(next, dataName)[column] = 1;
  }

  const colOf = [0, 1, 2].map((slot) => {
    const name = axes.worldSpatial[slot];
    return name ? next.inputAxes.indexOf(name) : -1;
  });
  const last = next.inputAxes.length;
  const before = next.matrix.map((row) => [...row]);

  next.matrix.forEach((row, r) => {
    for (let j = 0; j < 3; j++) {
      if (!touched[j]) continue;
      let sum = 0;
      for (let k = 0; k < 3; k++) {
        if (colOf[k] !== -1) sum += before[r][colOf[k]] * inverse[k][j];
      }
      row[colOf[j]] = sum;
    }
    let shift = 0;
    for (let k = 0; k < 3; k++) {
      if (colOf[k] !== -1) shift += before[r][colOf[k]] * inverse[k][3];
    }
    row[last] = before[r][last] + shift;
  });

  return { ok: true, affine: next, extended };
};

/**
 * Permute rows/columns into the owning systems' axis order. The schema's
 * contract is that `inputAxes` follows the INPUT SYSTEM's order; extension
 * appends, so a saved edge is re-ordered through here first. Names the order
 * does not list keep their relative position at the end.
 */
export const reorderAxes = (
  affine: NamedAffine,
  order: { input?: readonly string[] | null; output?: readonly string[] | null },
): NamedAffine => {
  const rank = (names: readonly string[], reference?: readonly string[] | null) =>
    names
      .map((name, index) => ({ name, index, key: reference?.indexOf(name) ?? -1 }))
      .sort((a, b) => {
        const ka = a.key === -1 ? Number.MAX_SAFE_INTEGER : a.key;
        const kb = b.key === -1 ? Number.MAX_SAFE_INTEGER : b.key;
        return ka - kb || a.index - b.index;
      });
  const columns = rank(affine.inputAxes, order.input);
  const rows = rank(affine.outputAxes, order.output);
  const last = affine.inputAxes.length;
  return {
    inputAxes: columns.map((entry) => entry.name),
    outputAxes: rows.map((entry) => entry.name),
    matrix: rows.map((row) => [
      ...columns.map((column) => affine.matrix[row.index][column.index]),
      affine.matrix[row.index][last],
    ]),
  };
};

export const sameAxes = (a: NamedAffine, b: NamedAffine): boolean =>
  a.inputAxes.length === b.inputAxes.length &&
  a.outputAxes.length === b.outputAxes.length &&
  a.inputAxes.every((name, i) => name === b.inputAxes[i]) &&
  a.outputAxes.every((name, i) => name === b.outputAxes[i]);
