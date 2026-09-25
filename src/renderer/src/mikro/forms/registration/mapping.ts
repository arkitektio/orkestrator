/**
 * Authoring one registration edge: source axes -> target axes -> a
 * `CreateTransformationInput`.
 *
 * The schema states the constraint this module exists to honour, twice, on
 * `Transformation.inputAxes` and again on the input:
 *
 *   "`scale`, `translation` and the columns of `affine` follow this order --
 *    which is the input system's axis order, NOT the reading layer's axis
 *    names, and the two differ often enough that indexing the arrays against
 *    them silently misplaces them."
 *
 * So every array this module emits — `inputAxes`, `outputAxes`, `scale`,
 * `translation`, the affine's columns — comes from ONE pass over ONE list of
 * rows that was built in the source system's `order` and is never reordered.
 * There is no second list to fall out of sync with. That is the whole design:
 * the invariant is structural rather than remembered, which is why the
 * parameters live on the row rather than in a parallel array.
 *
 * The other pole is `mikro/lib/coords/transformGraph.ts` `evalTransform` — the
 * client-side evaluator that reads these edges back and turns them into
 * matrices. It, not the schema, is the tighter constraint on what is worth
 * authoring (see MODES and `renamesAnyAxis`). `mapping.test.ts` round-trips
 * this module's output through it.
 */

/**
 * This module deliberately imports nothing generated: `api/graphql.ts`
 * transitively pulls in Arkitekt -> constants.tsx -> `window`, which would drag
 * this pure suite into jsdom for no benefit (vitest.config.ts: "Pure-logic
 * suites run in `node` for speed"). transformGraph.ts keeps itself pure the
 * same way. The form widens the literals onto the real enums at the mutation
 * boundary.
 */

/**
 * Structural subset of a generated `Axis` fragment — the same approach
 * transformGraph.ts takes, so tests can build axes as plain objects.
 */
export type AxisLike = {
  name: string;
  order: number;
  type: string;
  unit?: string | null;
};

/**
 * One source axis and what the user said about it. `scale`/`translation` are
 * `unknown` because they arrive from `FloatField`, which renders `type="string"`
 * and passes its raw change event through — see `num`.
 */
export type MappingRow = {
  source: AxisLike;
  /** null = not mapped: this edge does not place this axis. */
  target: AxisLike | null;
  scale: unknown;
  translation: unknown;
};

export type MappedRow = MappingRow & { target: AxisLike };

/**
 * The five modes the form offers. Every one is emitted as a BY_DIMENSION
 * edge — the one authorable `TransformInput` kind that carries
 * `inputAxes`/`outputAxes` — because the mapping may cover only a subset of the
 * source's axes and place them into a larger space, which the whole-space kinds
 * (SCALE takes only `scale`, in the FULL input system's axis order; IDENTITY
 * takes nothing) cannot say. The mode decides which parameter the edge carries.
 *
 * `SCALE_TRANSLATE` emits an `affine` rather than `scale` + `translation`
 * together: the schema's BY_DIMENSION member allows either payload but states
 * no composition order for a combined one, and one affine with the scale on the
 * diagonal and the translation in the last column is exactly the same map.
 *
 * Deliberately absent: ROTATION (an affine covers it; there is no authoring UI
 * for "orthonormal matrix" that isn't just typing an affine), MAP_AXIS
 * (`evalTransform`'s `default:` returns null for it — authoring one produces an
 * edge our own renderer silently ignores), FIELD (needs an array whose values
 * are the map), and UNMAPPABLE (a declared NON-correspondence, not a
 * registration).
 */
export type RegistrationMode =
  | "IDENTITY"
  | "SCALE"
  | "TRANSLATION"
  | "SCALE_TRANSLATE"
  | "AFFINE";

/** Axis types for which "this axis is not mapped" is unremarkable rather than a warning. */
const NON_SPATIAL_TYPES = new Set(["CHANNEL", "INDEX"]);

/** Below this, a matrix is singular: `invert4`'s own threshold in transformGraph.ts. */
const SINGULAR_EPSILON = 1e-12;

/**
 * `FloatField` is an `<Input type="string">` that forwards its raw change event,
 * so every numeric field yields a STRING. `AddTransformationViewForm` gets away
 * with passing that straight to the server, which coerces scalars; here the
 * numbers go inside `[[Float!]!]` / `[Float!]`, where a stray "" serializes as
 * null and the server rejects the whole edge with a message naming neither the
 * axis nor the cell. Coerce at the boundary and let `validateRegistration`
 * report the bad cell by name before anything is built.
 */
export const num = (value: unknown): number => {
  if (typeof value === "number") return value;
  const parsed = Number.parseFloat(String(value ?? "").trim());
  if (!Number.isFinite(parsed)) {
    throw new Error(`"${String(value)}" is not a number`);
  }
  return parsed;
};

/** True when `value` parses to a finite number. */
const isNumeric = (value: unknown): boolean => {
  try {
    num(value);
    return true;
  } catch {
    return false;
  }
};

/**
 * The source system's axes in `order`. That order IS the array's dimension
 * order and therefore IS `inputAxes` order — `AxesTable` states the same rule
 * for rendering. Sorting a COPY matters: the fragment's array is Apollo-owned
 * and frozen.
 */
export const sourceAxesInOrder = (axes: readonly AxisLike[]): AxisLike[] =>
  [...axes].sort((a, b) => a.order - b.order);

/**
 * Name match -> unique type match -> unset.
 *
 * There is deliberately NO positional fallback. Matching axes by position is
 * precisely the silent misplacement the `inputAxes` docstring warns about, and
 * a wrong prefill the user accepts is worse than an empty one they must fill:
 * the first is invisible, the second is a blocked submit.
 */
export const prefillMapping = (
  sourceAxes: readonly AxisLike[],
  targetAxes: readonly AxisLike[],
): MappingRow[] => {
  const rows: MappingRow[] = sourceAxesInOrder(sourceAxes).map((source) => ({
    source,
    target: null,
    scale: 1,
    translation: 0,
  }));
  const taken = new Set<string>();

  // 1. Exact name match. Axis names identify an axis within a system, so this
  //    is a fact rather than a guess — the only pass that is.
  const byName = new Map(targetAxes.map((axis) => [axis.name, axis]));
  for (const row of rows) {
    const hit = byName.get(row.source.name);
    if (hit && !taken.has(hit.name)) {
      row.target = hit;
      taken.add(hit.name);
    }
  }

  // 2. Type match, but ONLY where exactly one unclaimed target axis has that
  //    type — i.e. only where the guess is the sole possible answer. Two
  //    unclaimed SPACE candidates for one SPACE source is a coin flip, and the
  //    honest output there is "I don't know", not a 50/50 bet the user rubber-stamps.
  for (const row of rows) {
    if (row.target) continue;
    const candidates = targetAxes.filter(
      (axis) => axis.type === row.source.type && !taken.has(axis.name),
    );
    if (candidates.length === 1) {
      row.target = candidates[0];
      taken.add(candidates[0].name);
    }
  }

  return rows;
};

export const mappedRows = (rows: readonly MappingRow[]): MappedRow[] =>
  rows.filter((row): row is MappedRow => row.target !== null);

/**
 * True when any mapped row changes the axis's NAME.
 *
 * This is the load-bearing check behind the rename rule. `evalTransform`'s
 * Scale and Translation cases index their parameters by input-axis position
 * (`inPos`) and NEVER consult `outputAxes` — so an edge mapping `y` -> `row`
 * would be authored perfectly and then read back by our own renderer as a
 * no-op, drawing the layer in the wrong frame with nothing logged. A renaming
 * mapping must therefore be an AFFINE, whose row order (`outputAxes`) and
 * column order (`inputAxes`) are both explicit in the matrix.
 */
export const renamesAnyAxis = (rows: readonly MappingRow[]): boolean =>
  mappedRows(rows).some((row) => row.source.name !== row.target.name);

/** Modes whose parameters `evalTransform` reads by input-axis name only. */
const NAME_PRESERVING_MODES: readonly RegistrationMode[] = [
  "IDENTITY",
  "SCALE",
  "TRANSLATION",
];

/** Whether a mode can be offered for this mapping. See `renamesAnyAxis`. */
export const isModeAvailable = (
  mode: RegistrationMode,
  rows: readonly MappingRow[],
): boolean =>
  !NAME_PRESERVING_MODES.includes(mode) || !renamesAnyAxis(rows);

/**
 * M x (N+1): one row per output axis in `outputAxes` order, one column per
 * input axis in `inputAxes` order, translation in the final column at index N.
 * That is the exact shape `evalTransform`'s Affine case reads
 * (`rows[outPos][inPos]`, translation at `rows[r][axesIn.length]`), and M and N
 * are independent — the BY_DIMENSION edge's named axes are exactly the mapped
 * rows, so a rank-changing registration is just a non-square matrix.
 *
 * Because both orders are `mapped`'s order, row i and column i are the same
 * axis pairing and the matrix is diagonal by construction.
 *
 * NOT `toAffineMatrix` from AddTransformationViewForm: that builds a fixed 4x4
 * xyz matrix for the legacy `FourByFourMatrix` scalar. Here the rank is
 * whatever the mapping is — 2x3 for a (y,x) registration, 4x5 for a (t,z,y,x)
 * one. Don't generalize that one in place either; its caller depends on the 4x4.
 */
export const buildAffineDiagonal = (mapped: readonly MappedRow[]): number[][] =>
  mapped.map((row, i) => [
    ...mapped.map((_, j) => (i === j ? num(row.scale) : 0)),
    num(row.translation),
  ]);

export type RegistrationDraft = {
  sourceSystemId: string;
  targetSystemId: string;
  rows: readonly MappingRow[];
  mode: RegistrationMode;
  name?: string | null;
  /** Raw grid for mode "AFFINE": M rows x (N+1) columns, same orders as above. */
  matrix?: readonly (readonly unknown[])[];
};

/**
 * Structurally the `TransformInput` this module emits: always BY_DIMENSION —
 * see the note on `RegistrationMode` — with the mode's parameter arrays
 * ordered by the named axes.
 */
export type ByDimensionTransformVariables = {
  kind: "BY_DIMENSION";
  inputAxes: string[];
  outputAxes: string[];
  scale?: number[];
  translation?: number[];
  affine?: number[][];
};

/**
 * Structurally a `CreateTransformationInput`, minus the generated enum types.
 * The form widens `transform.kind`/`validity` onto the real enums when it
 * builds the mutation variables.
 */
export type CreateTransformationVariables = {
  input: string;
  output: string;
  name?: string | null;
  transform: ByDimensionTransformVariables;
  validity: "MANUAL";
};

/**
 * The draft -> `CreateTransformationInput`. Call `validateRegistration` first:
 * this throws on a non-numeric cell rather than emitting a null into a
 * `[Float!]` array.
 */
export const buildRegistrationInput = (
  draft: RegistrationDraft,
): CreateTransformationVariables => {
  // `rows` was built by `prefillMapping` from the source axes sorted by `order`
  // and is never reordered, so this filter preserves the source system's axis
  // order — which is what `inputAxes` must be and what `scale`, `translation`
  // and the affine's columns must follow. Every array below is one pass over
  // this one list, so they cannot disagree with each other.
  const mapped = mappedRows(draft.rows);

  const axes = {
    kind: "BY_DIMENSION" as const,
    inputAxes: mapped.map((row) => row.source.name),
    // Paired positionally with inputAxes: inputAxes[i] -> outputAxes[i]. The
    // rename rule forces these two equal for every non-affine mode, so the
    // pairing only bites AFFINE, where it decides row order.
    outputAxes: mapped.map((row) => row.target.name),
  };

  const base = {
    input: draft.sourceSystemId,
    output: draft.targetSystemId,
    name: draft.name?.trim() ? draft.name.trim() : null,
    // "Someone authored this map -- a registration pipeline, a human with a
    // matrix. It exists on purpose, but nothing has checked it against the
    // data." That is this form, exactly.
    validity: "MANUAL" as const,
    // valueRelation is deliberately unset: "never present on a registration --
    // values do not cross a claim between spaces".
  };

  switch (draft.mode) {
    case "IDENTITY":
      // A bare BY_DIMENSION: the named axes correspond one-to-one and the
      // unnamed ones are untouched.
      return { ...base, transform: axes };
    case "SCALE":
      return {
        ...base,
        transform: { ...axes, scale: mapped.map((row) => num(row.scale)) },
      };
    case "TRANSLATION":
      return {
        ...base,
        transform: {
          ...axes,
          translation: mapped.map((row) => num(row.translation)),
        },
      };
    case "SCALE_TRANSLATE":
      return { ...base, transform: { ...axes, affine: buildAffineDiagonal(mapped) } };
    case "AFFINE":
      return {
        ...base,
        transform: {
          ...axes,
          affine: (draft.matrix ?? []).map((row) => row.map(num)),
        },
      };
  }
};

export type RegistrationIssue = {
  level: "error" | "warning";
  message: string;
  /** Index into `draft.rows`, when the issue belongs to one row. */
  row?: number;
};

/**
 * Everything that must hold before submit, plus the things that are legal but
 * almost certainly mistakes.
 *
 * Errors block. Warnings are shown and submittable — the difference matters:
 * an unmapped CHANNEL axis is normal (a channel has no place in a world) while
 * an unmapped SPACE axis usually means the user is not finished, and treating
 * both the same is how a form becomes noise people click through.
 */
export const validateRegistration = (
  draft: RegistrationDraft,
): RegistrationIssue[] => {
  const issues: RegistrationIssue[] = [];
  const mapped = mappedRows(draft.rows);

  if (draft.sourceSystemId === draft.targetSystemId) {
    issues.push({
      level: "error",
      message: "A system cannot be registered into itself.",
    });
  }

  if (mapped.length === 0) {
    issues.push({
      level: "error",
      message: "Map at least one axis: an edge with no axes places nothing.",
    });
  }

  // The picker disables target axes that are already claimed, but that is only
  // a UI affordance and react-hook-form state is settable programmatically.
  // Re-check here: a non-injective mapping emits a duplicate in `outputAxes`.
  const seen = new Map<string, number>();
  mapped.forEach((row) => {
    const previous = seen.get(row.target.name);
    if (previous !== undefined) {
      issues.push({
        level: "error",
        message: `Target axis "${row.target.name}" is mapped from both "${draft.rows[previous].source.name}" and "${row.source.name}".`,
      });
    }
    seen.set(row.target.name, draft.rows.indexOf(row));
  });

  if (!isModeAvailable(draft.mode, draft.rows)) {
    issues.push({
      level: "error",
      message:
        "This mapping renames an axis, which an identity/scale/translation edge cannot express — our renderer reads their parameters by input-axis name and would treat the edge as a no-op. Use an affine.",
    });
  }

  draft.rows.forEach((row, index) => {
    if (!row.target) {
      if (!NON_SPATIAL_TYPES.has(row.source.type)) {
        issues.push({
          level: "warning",
          row: index,
          message: `"${row.source.name}" (${row.source.type}) is not mapped — this edge will not place it.`,
        });
      }
      return;
    }

    if (row.target.type !== row.source.type) {
      issues.push({
        level: "warning",
        row: index,
        message: `"${row.source.name}" is ${row.source.type} but maps onto "${row.target.name}", which is ${row.target.type}.`,
      });
    }

    if (draft.mode === "SCALE" || draft.mode === "SCALE_TRANSLATE") {
      if (!isNumeric(row.scale)) {
        issues.push({
          level: "error",
          row: index,
          message: `Scale for "${row.source.name}" is not a number.`,
        });
      } else if (num(row.scale) === 0) {
        // A zero scale makes the matrix singular, so `invert4` returns null and
        // any path walking this edge backwards degrades to identity — the layer
        // draws in the wrong frame and only a console warning says so.
        issues.push({
          level: "error",
          row: index,
          message: `Scale for "${row.source.name}" cannot be zero: it would collapse the axis and make the edge non-invertible.`,
        });
      }
    }

    if (
      (draft.mode === "TRANSLATION" || draft.mode === "SCALE_TRANSLATE") &&
      !isNumeric(row.translation)
    ) {
      issues.push({
        level: "error",
        row: index,
        message: `Translation for "${row.source.name}" is not a number.`,
      });
    }
  });

  if (draft.mode === "AFFINE") {
    issues.push(...validateAffineGrid(draft, mapped));
  }

  return issues;
};

const validateAffineGrid = (
  draft: RegistrationDraft,
  mapped: readonly MappedRow[],
): RegistrationIssue[] => {
  const issues: RegistrationIssue[] = [];
  const grid = draft.matrix ?? [];
  const rowCount = mapped.length;
  const columnCount = mapped.length + 1;

  if (grid.length !== rowCount) {
    issues.push({
      level: "error",
      message: `The affine needs one row per mapped output axis: expected ${rowCount}, got ${grid.length}.`,
    });
    return issues;
  }

  const badShape = grid.some((row) => row.length !== columnCount);
  if (badShape) {
    issues.push({
      level: "error",
      message: `Every affine row needs one column per mapped input axis plus a translation: expected ${columnCount}.`,
    });
    return issues;
  }

  if (grid.some((row) => row.some((cell) => !isNumeric(cell)))) {
    issues.push({ level: "error", message: "The affine has a non-numeric cell." });
    return issues;
  }

  // Only square maps have a determinant to speak of. A rank-deficient
  // projection is a legitimate thing to author, so this warns rather than blocks.
  if (rowCount > 0 && rowCount === mapped.length) {
    const square = grid.map((row) => row.slice(0, rowCount).map(num));
    const det = determinant(square);
    if (Math.abs(det) < SINGULAR_EPSILON) {
      issues.push({
        level: "warning",
        message:
          "This affine is singular (determinant ~ 0), so it cannot be inverted: anything that walks this edge backwards will fall back to identity.",
      });
    }
  }

  return issues;
};

/** Laplace expansion. Ranks here are 1-5, so the cubic-vs-naive cost is moot. */
const determinant = (m: readonly (readonly number[])[]): number => {
  const n = m.length;
  if (n === 0) return 1;
  if (n === 1) return m[0][0];
  if (n === 2) return m[0][0] * m[1][1] - m[0][1] * m[1][0];
  let sum = 0;
  for (let column = 0; column < n; column++) {
    const minor = m.slice(1).map((row) => row.filter((_, j) => j !== column));
    sum += (column % 2 === 0 ? 1 : -1) * m[0][column] * determinant(minor);
  }
  return sum;
};

export const hasBlockingIssue = (issues: readonly RegistrationIssue[]): boolean =>
  issues.some((issue) => issue.level === "error");
