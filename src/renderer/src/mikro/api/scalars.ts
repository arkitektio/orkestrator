// Named TypeScript types for mikro's pint-like quantity scalars.
//
// These are referenced from `mikro.yml` (the `scalars:` codegen config) so the
// generated `graphql.ts` types each field with a meaningful name — `Duration`,
// `Length` — instead of `any`. They are string-based: the wire format carries the
// magnitude *and* unit together, e.g. "100 ms", "1 µm".
//
// Parse / format / unit-convert these via `@/lib/quantities` (`parseQuantity`,
// `formatQuantity`, `toBase`, `formatDisplay`) — never do arithmetic on them
// directly. This mirrors elektro's `elektro/api/scalars.ts`.

/** A quantity of time, e.g. "5 ms", "2 s" (e.g. TimepointView.timeSinceStart). */
export type Duration = string;

/** A length, e.g. "1 µm", "500 nm" (e.g. pixel sizes, emission/excitation wavelengths). */
export type Length = string;

/** A frequency, e.g. "50 Hz", "1 kHz" (e.g. LaserElement.repetitionRate). */
export type Frequency = string;

/** A power, e.g. "5 mW", "2 W" (e.g. LaserElement.power, BeamState.power). */
export type Power = string;

/**
 * A quantity of ANY dimension, e.g. "0.098 ns", "5 nm" (PhasorContext.binWidth /
 * .window, PhasorTransfer.min / .max). Unlike the scalars above, its dimension
 * is not fixed by the field — it follows the data: a MICROTIME axis' bin width
 * is a time, a SPECTRUM axis' is a length. Resolve the dimension from the
 * phasor's `axisType` and parse via `parseGenericQuantity` (`@/lib/quantities`).
 */
export type GenericQuantity = string;
