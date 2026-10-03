import type { PortSize } from "@/core/ports/engine/portPresentation";

/**
 * The port grid. Columns are a fixed unit that the container decides the
 * count of (2, 4, 6, 8); each port spans as many as its control wants
 * (`portSize`). `grid-flow-row-dense` lets a small field fill the gap a wide
 * one left behind. Tailwind only emits classes it can see verbatim, so every
 * string here is complete and static.
 */
export const PORT_GRID =
  "grid grid-flow-row-dense grid-cols-2 gap-x-5 gap-y-4 @2xl:grid-cols-4 @5xl:grid-cols-6 @7xl:grid-cols-8";

const SPAN: Record<PortSize, string> = {
  narrow: "col-span-1",
  medium: "col-span-2",
  wide: "col-span-2 @2xl:col-span-4",
  full: "col-span-full",
};

/**
 * `min-w-0`: a grid item may shrink below its content, or a long value widens
 * the track. `self-start`: a cell is as tall as its own field, so a neighbour
 * whose hint wraps does not stretch the gaps inside it; every field then
 * reads label, control, hint from the same top edge.
 */
export const portSpanClass = (size: PortSize): string => `${SPAN[size]} min-w-0 self-start`;

/** The hint under a port (its description): small and quiet. */
export const PORT_HINT = "text-[11px] leading-snug text-muted-foreground/70";

/**
 * Returned values are not laid out by size: equal columns by how many there
 * are, capped at six.
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

export const portGridClass = (count: number): string =>
  COLUMN_CLASSES[Math.max(0, Math.min(count, COLUMN_CLASSES.length - 1))];

/**
 * One port per row, each the full width: the cells' spans do nothing in a
 * column, and their `self-start` would shrink them to their content.
 */
export const PORT_STACK = "flex flex-col gap-4 [&>*]:w-full";
