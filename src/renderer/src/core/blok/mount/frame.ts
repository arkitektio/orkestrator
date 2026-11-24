import { fold, StepError, type NamedAffine } from "./steps";
import { unitFactor } from "./units";

/**
 * What a mount brings into a base: the axes of its own space, their units and
 * the space's `reference` (mikro's word: data of one reference is in one space).
 * And how it is placed, as mikro places one space in another:
 *
 *  - `transform`: mikro steps (`steps.ts`) from the mount's axes (the input) onto
 *    `output` axes, in their units;
 *  - `output`: the axes it lands on, each `{name, type?, unit?}` or a bare name.
 *    Left out, the steps' own outputs, each in the unit of the input axis of its
 *    name (else the input's length unit).
 *
 * The output's SPACE axes then stand on the stage's: x, y, z by name, else by
 * position from the last (mikro's z, y, x order), in meters with z turned to the
 * stage's Y-up. Every reference frame sits at the base's origin; a `Transform`
 * around mounts moves theirs. Pure: no React, no three.
 */

export type MountAxis = { name: string; type: string; unit?: string | null };
export type MountFrame = { axes: readonly MountAxis[]; reference?: string | null };

/** Rows of an affine matrix. */
export type Rows = number[][];

export const multiply = (a: Rows, b: Rows): Rows =>
  a.map((row) => b[0].map((_, j) => row.reduce((sum, cell, k) => sum + cell * b[k][j], 0)));

/** The one length unit of some axes' SPACE axes, or null when they have none or disagree. */
export const spaceUnitOf = (axes: readonly MountAxis[]): string | null => {
  const units = new Set(axes.filter((axis) => axis.type === "SPACE").map((axis) => axis.unit ?? null));
  if (units.size !== 1) return null;
  const [unit] = units;
  return unit ?? null;
};

/** `output` as axes: a bare name is a SPACE axis. Null for a malformed or absent one. */
const outputAxesOf = (output: unknown): MountAxis[] | null => {
  if (!Array.isArray(output) || output.length === 0) return null;
  const axes = output.map((axis) =>
    typeof axis === "string"
      ? { name: axis, type: "SPACE", unit: null }
      : axis && typeof axis === "object" && typeof (axis as MountAxis).name === "string"
        ? { name: (axis as MountAxis).name, type: (axis as MountAxis).type ?? "SPACE", unit: (axis as MountAxis).unit ?? null }
        : null,
  );
  return axes.every(Boolean) ? (axes as MountAxis[]) : null;
};

/** The output axes the steps landed on, typed and with units, from `output` or the input. */
const describeOutputs = (affine: NamedAffine, input: readonly MountAxis[], declared: MountAxis[] | null): MountAxis[] => {
  const fallbackUnit = spaceUnitOf(input);
  return affine.outputs.map((name) => {
    const stated = declared?.find((axis) => axis.name === name);
    const same = input.find((axis) => axis.name === name);
    return {
      name,
      type: stated?.type ?? same?.type ?? "SPACE",
      unit: stated?.unit ?? same?.unit ?? fallbackUnit,
    };
  });
};

/** Which of three's x (0), y (1), z (2) each SPACE axis is: by name, else by position from the last. */
export const spatialSlots = (axes: readonly MountAxis[]): Map<string, number> => {
  const spatial = axes.filter((axis) => axis.type === "SPACE");
  const slots = new Map<string, number>();
  const named = { x: 0, y: 1, z: 2 } as Record<string, number>;
  if (spatial.some((axis) => axis.name.toLowerCase() in named)) {
    for (const axis of spatial) {
      const slot = named[axis.name.toLowerCase()];
      if (slot !== undefined) slots.set(axis.name, slot);
    }
    return slots;
  }
  spatial.slice(-3).reverse().forEach((axis, index) => slots.set(axis.name, index));
  return slots;
};

export type Resolved = { rows: Rows; error: string | null };

const IDENTITY_STEPS: unknown = null;

/**
 * A stage mount's matrix: its local three-space (its input SPACE axes as x, y, z,
 * in its own unit) through the steps onto its output axes, then into the stage's
 * meters with Y up. A transform that does not fold is drawn untransformed, and
 * says why.
 */
export const stageMatrix = (frame: MountFrame, transform?: unknown, output?: unknown): Resolved => {
  const input = frame.axes;
  const declared = outputAxesOf(output);
  let affine: NamedAffine;
  let error: string | null = null;
  try {
    affine = fold(transform, input.map((axis) => axis.name), declared?.map((axis) => axis.name) ?? null);
  } catch (caught) {
    if (!(caught instanceof StepError)) throw caught;
    error = `Its transform does not apply: ${caught.message}. Drawn untransformed.`;
    affine = fold(IDENTITY_STEPS, input.map((axis) => axis.name));
  }
  const outputs = describeOutputs(affine, input, declared);
  const inSlots = spatialSlots(input);
  const outSlots = spatialSlots(outputs);

  // Local (x, y, z) → output axes → the slot each output SPACE axis stands on.
  const local: Rows = [0, 1, 2].map((slot) => {
    const index = outputs.findIndex((axis) => outSlots.get(axis.name) === slot);
    if (index < 0) return [0, 0, 0, 0];
    const row = affine.m[index];
    const out = [0, 0, 0, row[input.length]];
    input.forEach((axis, k) => {
      const from = inSlots.get(axis.name);
      if (from !== undefined) out[from] += row[k];
    });
    return out;
  });
  local.push([0, 0, 0, 1]);

  const unit = spaceUnitOf(outputs);
  const factor = unitFactor(unit, "m");
  if (factor === null && !error) error = `Its space has no length unit a stage knows (${unit ?? "none"}): drawn as if in meters.`;
  const s = factor ?? 1;
  // z up → Y up: (x, y, z) → (x, z, −y), a quarter turn about x.
  const conversion: Rows = [
    [s, 0, 0, 0],
    [0, 0, s, 0],
    [0, -s, 0, 0],
    [0, 0, 0, 1],
  ];
  return { rows: multiply(conversion, local), error };
};

/**
 * A plot mount's map along the base axis, `base = scale · local + offset`: the
 * steps from its one axis (in `unit`) onto one output axis, then that axis' unit
 * converted into the plot's. With a reason, and unconverted, when it does not go.
 */
export const plotMap = (
  axis: MountAxis,
  baseAxis: { name: string; unit: string | null },
  transform?: unknown,
  output?: unknown,
): { scale: number; offset: number; error: string | null } => {
  const declared = outputAxesOf(output);
  let affine: NamedAffine;
  try {
    affine = fold(transform, [axis.name], declared?.map((a) => a.name) ?? null);
  } catch (caught) {
    if (!(caught instanceof StepError)) throw caught;
    return { scale: 1, offset: 0, error: `Its transform does not apply: ${caught.message}. Drawn untransformed.` };
  }
  const row =
    affine.outputs.length === 1 ? 0 : affine.outputs.indexOf(baseAxis.name);
  if (row < 0) {
    return { scale: 1, offset: 0, error: `Its transform gives ${affine.outputs.join(", ")}: name one "${baseAxis.name}".` };
  }
  const [out] = describeOutputs({ ...affine, outputs: [affine.outputs[row]] }, [axis], declared);
  const [scale, offset] = affine.m[row];
  const factor = unitFactor(out.unit, baseAxis.unit) ?? (!out.unit && !baseAxis.unit ? 1 : null);
  if (factor === null) {
    return {
      scale,
      offset,
      error: `${out.unit ?? "no unit"} does not convert to the plot's ${baseAxis.unit ?? "no unit"}: drawn unconverted.`,
    };
  }
  return { scale: factor * scale, offset: factor * offset, error: null };
};

/** References in a base that are not the same space: a mount of each sits at the origin of its own. */
export const strayReferences = (references: readonly (string | null | undefined)[]): string[] => {
  const named = [...new Set(references.filter((reference): reference is string => Boolean(reference)))];
  return named.length > 1 ? named : [];
};
