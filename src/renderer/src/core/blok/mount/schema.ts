import * as z from "zod";

/**
 * The props every mount shares, typed so the catalog publishes their ports: mikro's
 * transformation steps (`steps.ts`) and the output axes. zod only: the catalog is exported
 * offline. Axis lists take both spellings, camel (a blok) and snake (a Python model's dump).
 */

const numbers = z.array(z.number());
const names = z.array(z.string());
const axes = {
  inputAxes: names.optional(),
  outputAxes: names.optional(),
  input_axes: names.optional(),
  output_axes: names.optional(),
};

const part = z.object({
  kind: z.enum(["IDENTITY", "SCALE", "TRANSLATION", "AFFINE", "ROTATION", "MAP_AXIS"]),
  ...axes,
  scale: numbers.optional(),
  translation: numbers.optional(),
  affine: z.array(numbers).optional(),
});

const single = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("IDENTITY") }),
  z.object({ kind: z.literal("SCALE"), scale: numbers }),
  z.object({ kind: z.literal("TRANSLATION"), translation: numbers }),
  z.object({ kind: z.enum(["AFFINE", "ROTATION"]), affine: z.array(numbers) }),
  z.object({ kind: z.literal("MAP_AXIS"), ...axes }),
  z.object({ kind: z.literal("BY_DIMENSION"), parts: z.array(part) }),
]);

const step = z.union([single, z.object({ kind: z.literal("SEQUENCE"), steps: z.array(single) })]);

export const transformSchema = z
  .union([step, z.array(step)])
  .optional()
  .describe(
    "How it is placed, as mikro writes a transformation: one step or a list of them, from the mount's own axes onto the output axes. " +
      "SCALE / TRANSLATION take one number per axis, in order; AFFINE / ROTATION rows of N+1; MAP_AXIS inputAxes onto outputAxes; " +
      'BY_DIMENSION parts on their own axes. E.g. [{"kind": "TRANSLATION", "translation": [120, 40]}]. The identity when absent.',
  );

const axis = z.object({
  name: z.string(),
  type: z.string().optional(),
  unit: z.string().nullable().optional(),
});

export const outputSchema = z
  .array(z.union([z.string(), axis]))
  .optional()
  .describe(
    'The axes the transform lands on, as {"name", "type", "unit"} or bare names. Left out, the steps\' own outputs in the units of the input axes of their names.',
  );
