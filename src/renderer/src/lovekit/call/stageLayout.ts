/**
 * How a call's tiles share the stage: the rows and columns that make them
 * largest for the room there is, so the grid follows the pane's shape and not
 * only the head count. Four people are one row in a short strip (a call
 * opened to the side), a column in a narrow pane, 2 x 2 in between.
 */
export type StageLayout = {
  columns: number;
  rows: number;
  /** Whole pixels: a tile rounded up would push the last one of its row to the next. */
  tileWidth: number;
  tileHeight: number;
};

/** The gap between tiles, in pixels: Tailwind's `gap-2`. */
export const STAGE_GAP = 8;

/**
 * The layout of `count` tiles in a `width` x `height` stage, or `null` when
 * there is nothing to lay out or nowhere to (not measured yet).
 */
export const stageLayout = (
  count: number,
  width: number,
  height: number,
  { gap = STAGE_GAP, aspect = 16 / 9 }: { gap?: number; aspect?: number } = {},
): StageLayout | null => {
  if (count <= 0 || width <= 0 || height <= 0) return null;

  let best: (StageLayout & { empty: number }) | null = null;
  for (let columns = 1; columns <= count; columns++) {
    const rows = Math.ceil(count / columns);
    const byWidth = (width - gap * (columns - 1)) / columns;
    const byHeight = ((height - gap * (rows - 1)) / rows) * aspect;
    const tileWidth = Math.floor(Math.min(byWidth, byHeight));
    const empty = columns * rows - count;
    // Larger tiles win; between equals, the fuller grid, then the flatter one.
    const better =
      !best ||
      tileWidth > best.tileWidth ||
      (tileWidth === best.tileWidth && (empty < best.empty || (empty === best.empty && rows < best.rows)));
    if (better) best = { columns, rows, tileWidth, tileHeight: Math.floor(tileWidth / aspect), empty };
  }

  if (!best || best.tileWidth <= 0) return null;
  const { empty: _empty, ...layout } = best;
  return layout;
};

/** The width `columns` tiles and the gaps between them take: what a row is held to. */
export const stageRowWidth = (layout: StageLayout, gap = STAGE_GAP) =>
  layout.columns * layout.tileWidth + gap * (layout.columns - 1);
