import {z} from 'zod';

/**
 * Argument schemas shared by the catalog functions.
 *
 * Blok arguments arrive from JSON and from data-model paths, so a "number" is
 * routinely a numeric string. These schemas accept the tolerant input a payload
 * actually carries while still rejecting genuine nonsense with a message that
 * names the offending value — `z.coerce.number()` would quietly turn `"abc"`
 * into `NaN` and poison everything downstream.
 */

export const numericSchema = z
  .union([z.number(), z.string()])
  .transform((value, ctx) => {
    const parsed = typeof value === 'number' ? value : Number(value.trim());

    if (!Number.isFinite(parsed)) {
      ctx.addIssue({
        code: 'custom',
        message: `Expected a number, received ${JSON.stringify(value)}.`,
      });
      return z.NEVER;
    }

    return parsed;
  });

export const integerSchema = numericSchema.refine(Number.isInteger, {
  message: 'Expected a whole number.',
});

/** Anything renderable as text. */
export const textSchema = z
  .union([z.string(), z.number(), z.boolean()])
  .transform(value => String(value));

/** Any value, judged by JavaScript truthiness — what a UI condition wants. */
export const truthySchema = z.unknown();

export const listSchema = z.array(z.unknown());

export const recordSchema = z.record(z.string(), z.unknown());
