/**
 * Reading a calibration's pixel size off the edge that defines it.
 *
 * A calibrated physical space is reached from its dataset's pixel grid by
 * exactly one edge, and that edge's parameters ARE the pixel size. Displaying
 * them means pairing three things that are each ordered differently, which is
 * the same trap the schema warns about for authoring:
 *
 *   - `scale[i]` is ordered by the edge's `inputAxes` (the pixel axis names)
 *   - `outputAxes[i]` is the physical axis that entry lands on
 *   - the UNIT lives on the physical system's axis, i.e. on `outputAxes[i]`
 *
 * So the label comes from the output axis and the number from the input-ordered
 * array, paired by POSITION through the edge — never by looking an input axis
 * name up among the output system's axes, which silently finds nothing the
 * moment a calibration renames an axis (and finds the WRONG axis if a rename is
 * a swap).
 */

export type PixelSizeLeaf = {
  inputAxes?: readonly string[] | null;
  outputAxes?: readonly string[] | null;
  scale?: readonly number[] | null;
  affine?: readonly (readonly number[])[] | null;
};

export type PixelSizeEdge =
  | (PixelSizeLeaf & {
      /**
       * A wrapper's children (BY_DIMENSION, SEQUENCE, BIJECTION). The wrapper
       * itself carries no parameters — see `pixelSizeEntries`.
       */
      transformations?: readonly PixelSizeLeaf[] | null;
    })
  | null;

/**
 * `type` is the raw `AxisType` string (`"SPACE"`, `"TIME"`, …) rather than the
 * generated enum, so this module and its suite stay free of generated imports
 * and keep running under `node`.
 */
export type UnitAxis = { name: string; unit?: string | null; type?: string | null };

export type PixelSizeEntry = {
  /** The physical axis this size is expressed on. */
  axis: string;
  value: number;
  unit: string | null;
  /** The axis' kind, when the output system named it. */
  type: string | null;
};

/**
 * Only the SPACE axes — the ones a "pixel size" is a statement about.
 *
 * A calibration edge scales every axis it maps, so its parameters include the
 * time step of a timelapse and the bin width of a spectrum. Those are real
 * numbers with real units, but they are sampling intervals: the physical extent
 * of one voxel is a spatial idea, and printing "t 0.5 s" under "Pixel size"
 * claims something about geometry that is not true. An axis whose type the
 * system did not name is dropped too — an unlabelled axis is not evidence of a
 * spatial one.
 */
export const spatialPixelSizes = (
  entries: readonly PixelSizeEntry[],
): PixelSizeEntry[] => entries.filter((entry) => entry.type === "SPACE");

type AxisLookup = (axisName: string) => { unit: string | null; type: string | null };

/** One parameter-carrying edge's entries. See the header for the pairing rule. */
const leafEntries = (
  leaf: PixelSizeLeaf,
  axisInfo: AxisLookup,
): PixelSizeEntry[] => {
  const inputAxes = leaf.inputAxes ?? [];
  const outputAxes = leaf.outputAxes ?? [];

  const valueAt = (index: number): number | undefined => {
    if (leaf.scale) return leaf.scale[index];
    // Rows are output axes, columns input axes; index i is the same axis
    // pairing on both, so the scale factor is the diagonal entry.
    if (leaf.affine) return leaf.affine[index]?.[index];
    return undefined;
  };

  return inputAxes.flatMap((_, index) => {
    const value = valueAt(index);
    if (value === undefined) return [];
    // The physical axis the entry lands on. Fall back to the input name only
    // when the edge does not name its outputs (an older payload that predates
    // self-description) — never look the input name up among output axes.
    const axis = outputAxes[index] ?? inputAxes[index];
    if (axis === undefined) return [];
    return [{ axis, value, ...axisInfo(axis) }];
  });
};

/**
 * The per-axis pixel size an edge encodes, or [] if it encodes none.
 *
 * Handles the two shapes a calibration's parameters take: a SCALE (its `scale`
 * array) and an AFFINE (the diagonal of its M x (N+1) matrix — rows are output
 * axes, columns input axes, so entry i is `affine[i][i]`). Any other kind — a
 * displacement field, a rotation — has no per-axis "pixel size" to state, and
 * returning [] lets the caller say so rather than invent one.
 *
 * A calibration authored through `CalibrateForm` is a BY_DIMENSION edge, and a
 * BY_DIMENSION carries NO parameters of its own — it has only `transformations`,
 * each child naming the axes it acts on. So a wrapper is unwrapped and its
 * children merged: first writer per axis wins, and the result is ordered by the
 * wrapper's own `outputAxes` so the reading order is the physical space's rather
 * than whatever order the children arrive in.
 */
export const pixelSizeEntries = (
  edge: PixelSizeEdge,
  outputSystemAxes: readonly UnitAxis[],
): PixelSizeEntry[] => {
  if (!edge) return [];

  const axisInfo: AxisLookup = (axisName) => {
    const axis = outputSystemAxes.find((candidate) => candidate.name === axisName);
    return { unit: axis?.unit ?? null, type: axis?.type ?? null };
  };

  const direct = leafEntries(edge, axisInfo);
  if (direct.length > 0) return direct;

  const children = edge.transformations ?? [];
  if (children.length === 0) return [];

  const byAxis = new Map<string, PixelSizeEntry>();
  for (const child of children) {
    for (const entry of leafEntries(child, axisInfo)) {
      if (!byAxis.has(entry.axis)) byAxis.set(entry.axis, entry);
    }
  }

  const order = edge.outputAxes ?? [];
  const rank = (axis: string) => {
    const index = order.indexOf(axis);
    // An axis the wrapper does not name still gets shown, after the ones it does.
    return index === -1 ? Number.MAX_SAFE_INTEGER : index;
  };

  return [...byAxis.values()].sort((a, b) => rank(a.axis) - rank(b.axis));
};

/** "x 0.325 µm" — one entry, formatted. */
export const formatPixelSize = (entry: PixelSizeEntry): string =>
  `${entry.axis} ${entry.value}${entry.unit ? ` ${entry.unit}` : ""}`;
