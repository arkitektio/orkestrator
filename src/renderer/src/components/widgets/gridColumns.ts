/**
 * Responsive column classes for port grids. Tailwind only emits classes it can
 * see verbatim in the source, so `grid-cols-${n}` never worked; these strings
 * are complete and static.
 */
const COLUMN_CLASSES = [
  "grid gap-5",
  "grid gap-5 @lg:grid-cols-1",
  "grid gap-5 @lg:grid-cols-2",
  "grid gap-5 @lg:grid-cols-2 @xl:grid-cols-3",
  "grid gap-5 @lg:grid-cols-2 @xl:grid-cols-3 @2xl:grid-cols-4",
  "grid gap-5 @lg:grid-cols-2 @xl:grid-cols-3 @2xl:grid-cols-4 @3xl:grid-cols-5",
  "grid gap-5 @lg:grid-cols-2 @xl:grid-cols-3 @2xl:grid-cols-4 @3xl:grid-cols-5 @5xl:grid-cols-6",
] as const;

/** Grid class for `count` items, capped at six responsive columns. */
export const portGridClass = (count: number): string =>
  COLUMN_CLASSES[Math.max(0, Math.min(count, COLUMN_CLASSES.length - 1))];
