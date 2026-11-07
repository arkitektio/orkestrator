import type { AxisFragment } from "./api/graphql";

/** A grid's rows and columns in words: `cell × c`, or one axis of rows. */
export const gridAxesLabel = (grid: { rowAxis: Pick<AxisFragment, "name">; columnAxis?: Pick<AxisFragment, "name"> | null }) =>
  grid.columnAxis ? `${grid.rowAxis.name} × ${grid.columnAxis.name}` : `${grid.rowAxis.name} (one column)`;
