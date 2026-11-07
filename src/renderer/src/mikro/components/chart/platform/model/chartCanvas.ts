/**
 * What a chart's viewport is made of. A chart has no kind: its layers' kinds say
 * where their positions come from (`isValuesKind`), and one chart may hold both —
 * traces of `t` and a scatter of the same table's rows.
 *
 * - `axis`: the axis plot alone. The world is one measured axis and nothing is
 *   drawn by its values.
 * - `values`: the value panels alone. There is no axis (the world is a table's
 *   rows), so along-axis layers could not be drawn here anyway. This is also
 *   what an empty chart without an axis shows (its notice).
 * - `both`: the axis plot across the top, the value panels beneath.
 *
 * Read off the chart's `axis` — which says whether an axis plot exists before
 * any layer does — and whether any layer is drawn by its values.
 */
export type ChartCanvas = "axis" | "values" | "both";

export const chartCanvasOf = ({
  hasAxis,
  hasValueLayers,
}: {
  hasAxis: boolean;
  hasValueLayers: boolean;
}): ChartCanvas => (!hasAxis ? "values" : hasValueLayers ? "both" : "axis");
