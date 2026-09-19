/**
 * A shape as it gets read aloud: `1024x 1024y 5z` — each extent glued to the
 * axis it runs along. Two parallel lists (`x × y × z` over `1024, 1024, 5`) say
 * the same thing but make the reader pair them up by counting, which is exactly
 * the work a label should have already done.
 *
 * Driven by `shape`, so a dataset whose axis names are short of its rank still
 * shows every extent (with `?` for the axis nobody named).
 */
export const formatShape = (
  axisNames: readonly string[],
  shape: readonly number[]
): string => shape.map((extent, index) => `${extent}${axisNames[index] ?? '?'}`).join(' ')
