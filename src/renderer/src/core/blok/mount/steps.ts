/**
 * Mikro's transformation steps, folded into one affine between named axes. Pure.
 *
 * A step is spelled as mikro's `TransformInput` (camelCase or snake_case):
 *
 *  - `IDENTITY`; `SCALE` / `TRANSLATION`, one number per current axis, in order;
 *  - `AFFINE` / `ROTATION`, M x (N+1) rows: square keeps the axes, otherwise only as
 *    the last step, onto the output axes;
 *  - `MAP_AXIS`, `inputAxes` onto `outputAxes` by position (a rename, a reorder, a drop);
 *  - `BY_DIMENSION`, `parts`, each one of the above on its own axes; an axis no part
 *    names is dropped; `FIELD` parts are refused (no array is read here);
 *  - `SEQUENCE`, `steps` in order; a bare list is one too.
 *
 * Each step reads the axes the one before it produced, starting from the mount's
 * input axes, so a later step may name an axis an earlier one renamed.
 */

/** `m` has one row per output axis: a coefficient per input axis, then the offset. */
export type NamedAffine = { inputs: string[]; outputs: string[]; m: number[][] };

export class StepError extends Error {}

type Step = Record<string, unknown>;

const read = (step: Step, camel: string, snake: string): unknown => step[camel] ?? step[snake];

const numbers = (value: unknown, what: string): number[] => {
  if (!Array.isArray(value) || !value.every((n) => typeof n === "number" && Number.isFinite(n))) {
    throw new StepError(`${what} must be a list of numbers`);
  }
  return value as number[];
};

const names = (value: unknown, what: string): string[] => {
  if (!Array.isArray(value) || !value.every((n) => typeof n === "string")) throw new StepError(`${what} must be a list of axis names`);
  return value as string[];
};

const matrix = (value: unknown, what: string): number[][] => {
  if (!Array.isArray(value)) throw new StepError(`${what} must be rows of numbers`);
  return value.map((row, index) => numbers(row, `${what} row ${index}`));
};

export const identityOn = (axes: readonly string[]): NamedAffine => ({
  inputs: [...axes],
  outputs: [...axes],
  m: axes.map((_, row) => [...axes.map((__, column) => (row === column ? 1 : 0)), 0]),
});

/** `second` after `first`: every input `second` reads must be an output of `first`. */
export const compose = (first: NamedAffine, second: NamedAffine): NamedAffine => {
  const rowOf = (axis: string) => {
    const index = first.outputs.indexOf(axis);
    if (index < 0) throw new StepError(`a step reads axis "${axis}", which the steps before it do not give (${first.outputs.join(", ")})`);
    return first.m[index];
  };
  const width = first.inputs.length + 1;
  const m = second.m.map((row) => {
    const out = new Array<number>(width).fill(0);
    second.inputs.forEach((axis, k) => {
      if (row[k] === 0) return;
      const source = rowOf(axis);
      for (let c = 0; c < width; c++) out[c] += row[k] * source[c];
    });
    out[width - 1] += row[second.inputs.length];
    return out;
  });
  return { inputs: first.inputs, outputs: second.outputs, m };
};

/** One step over `axes`; `last` says whether it may land on `output` (a non-square affine). */
const stepOn = (step: Step, axes: readonly string[], output: readonly string[] | null, last: boolean): NamedAffine => {
  const kind = String(step.kind ?? "").toUpperCase();
  const n = axes.length;
  switch (kind) {
    case "IDENTITY":
      return identityOn(axes);
    case "SCALE":
    case "TRANSLATION": {
      const values = numbers(step[kind.toLowerCase()], kind);
      if (values.length !== n) throw new StepError(`${kind} has ${values.length} values for ${n} axes (${axes.join(", ")})`);
      const affine = identityOn(axes);
      values.forEach((value, i) => {
        if (kind === "SCALE") affine.m[i][i] = value;
        else affine.m[i][n] = value;
      });
      return affine;
    }
    case "AFFINE":
    case "ROTATION": {
      const rows = matrix(step.affine, kind);
      if (rows.some((row) => row.length !== n + 1)) throw new StepError(`${kind} rows need ${n + 1} entries (${axes.join(", ")}, offset)`);
      const outputs = rows.length === n ? [...axes] : last && output && rows.length === output.length ? [...output] : null;
      if (!outputs) throw new StepError(`${kind} with ${rows.length} rows over ${n} axes must be the last step, onto as many output axes`);
      return { inputs: [...axes], outputs, m: rows };
    }
    case "MAP_AXIS": {
      const from = names(read(step, "inputAxes", "input_axes"), "MAP_AXIS inputAxes");
      const to = names(read(step, "outputAxes", "output_axes"), "MAP_AXIS outputAxes");
      if (from.length !== to.length) throw new StepError("MAP_AXIS maps as many input axes as output axes");
      return { inputs: [...axes], outputs: to, m: from.map((axis) => {
        const index = axes.indexOf(axis);
        if (index < 0) throw new StepError(`MAP_AXIS reads axis "${axis}", which is not one of ${axes.join(", ")}`);
        return [...axes.map((_, column) => (column === index ? 1 : 0)), 0];
      }) };
    }
    case "BY_DIMENSION": {
      const parts = step.parts;
      if (!Array.isArray(parts) || parts.length === 0) throw new StepError("BY_DIMENSION needs parts");
      const outputs: string[] = [];
      const m: number[][] = [];
      for (const part of parts as Step[]) {
        if (String(part.kind ?? "").toUpperCase() === "FIELD") throw new StepError("a FIELD part reads an array, which a mount cannot");
        const from = names(read(part, "inputAxes", "input_axes"), "a part's inputAxes");
        const to = names(read(part, "outputAxes", "output_axes"), "a part's outputAxes");
        // The part on its own axes, its outputs then named as it says.
        let own = stepOn(part, from, to, true);
        if (own.outputs.length !== to.length) throw new StepError("a part gives as many output axes as it names");
        if (String(part.kind).toUpperCase() !== "MAP_AXIS") own = { ...own, outputs: to };
        for (const [row, axis] of own.m.map((r, i) => [r, own.outputs[i]] as const)) {
          if (outputs.includes(axis)) throw new StepError(`two parts give axis "${axis}"`);
          outputs.push(axis);
          const full = new Array<number>(n + 1).fill(0);
          from.forEach((input, k) => {
            const index = axes.indexOf(input);
            if (index < 0) throw new StepError(`a part reads axis "${input}", which is not one of ${axes.join(", ")}`);
            full[index] = row[k];
          });
          full[n] = row[from.length];
          m.push(full);
        }
      }
      return { inputs: [...axes], outputs, m };
    }
    case "SEQUENCE":
      return fold(step.steps, axes, output);
    default:
      throw new StepError(`"${kind || "?"}" is no transformation kind a mount takes`);
  }
};

/**
 * The steps from `inputs` as one affine; onto `output` (reordered, a missing axis
 * refused) when it is given, else onto whatever the steps give. No steps is the identity.
 */
export const fold = (transform: unknown, inputs: readonly string[], output: readonly string[] | null = null): NamedAffine => {
  const steps: Step[] =
    transform == null ? [] : Array.isArray(transform) ? (transform as Step[]) : [transform as Step];
  let affine = identityOn(inputs);
  steps.forEach((step, index) => {
    if (typeof step !== "object" || step === null) throw new StepError(`step ${index + 1} is not a transformation`);
    affine = compose(affine, stepOn(step, affine.outputs, output, index === steps.length - 1));
  });
  if (!output) return affine;
  const m = output.map((axis) => {
    const index = affine.outputs.indexOf(axis);
    if (index < 0) throw new StepError(`the steps give no axis "${axis}" (they give ${affine.outputs.join(", ") || "none"})`);
    return affine.m[index];
  });
  return { inputs: affine.inputs, outputs: [...output], m };
};
