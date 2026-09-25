/**
 * Splice arithmetic for the vector enhancer: how the points of one traced hop
 * (`features/annotations/enhancers/paths/vectorTrace/useTraceHop.ts`) merge into a vertex chain the drawer is
 * building. Kept pure so the off-by-one at each joint — the only real bug
 * surface — is testable without a scene.
 *
 * A hop's points always include both endpoints, and `useTraceHop` overwrites
 * those endpoints with the clicks' own world positions, so joints are exact.
 */

/**
 * Points a successful hop adds to a chain that already ends at the hop's
 * start: drop the duplicated start.
 */
export const hopExtension = <T>(hopPoints: readonly T[]): T[] =>
  hopPoints.slice(1);

/**
 * Points a POLYGON's closing hop (last anchor → first anchor) inserts: both
 * endpoints already exist in the chain (the first vertex opens it, the last
 * ends it, and the Polygon kind closes implicitly), so drop both. A 2-point
 * hop — a straight closing edge — inserts nothing, which is exactly the
 * straight-closure fallback.
 */
export const closingInsert = <T>(hopPoints: readonly T[]): T[] =>
  hopPoints.slice(1, -1);
