/**
 * What a chart IS, structurally — the two signatures its provider keys on.
 *
 * The scene's three-tier contract (`scene/platform/model/sceneStructure.ts`):
 *
 *  1. **Rebuild** on `chartScopeSignature` — the chart's identity and its world.
 *     A chart along another axis is another chart, and nothing built against the
 *     old one is reusable.
 *  2. **Reconcile** on a layer's `layerStructureKey` — what it reads and its path
 *     to the world. A layer arriving, leaving or being re-registered folds into
 *     the live stores WITHOUT a rebuild, and only that layer rereads.
 *  3. **Ignore** everything else. `visible`, `name`, `order`, `opacity`, colour,
 *     mark and widths are content — which is what makes an optimistic restyle
 *     free: it never moves a key, so nothing refetches.
 *
 * No generated imports, so this runs in node.
 */

export type PlacementStepLike = {
  inverted?: boolean | null;
  transformation?: { id?: string | null; version?: number | null } | null;
};

export type ChartLayerStructureLike = {
  __typename?: string;
  id: string;
  order?: number | null;
  alongAxis?: string | null;
  pathToWorld?: readonly PlacementStepLike[] | null;
  // What the layer reads — one of these, per kind.
  lens?: { id: string } | null;
  tableDataset?: { id: string } | null;
  annotationCollection?: { id: string } | null;
  seriesAxis?: string | null;
  valueColumn?: string | null;
  // What a VALUES layer reads: its columns, its grouping, its bins, its filters.
  xColumn?: string | null;
  yColumn?: string | null;
  zColumn?: string | null;
  groupColumn?: string | null;
  bins?: number | null;
  windowFilters?: readonly unknown[] | null;
};

export type ChartScopeLike = {
  id: string;
  worldCoordinateSystem?: { id: string } | null;
  axis?: { name: string } | null;
};

export const chartScopeSignature = (chart: ChartScopeLike): string =>
  JSON.stringify({
    id: chart.id,
    world: chart.worldCoordinateSystem?.id ?? null,
    // Whether there is an axis plot at all, and along what: the one thing that
    // says what the chart's canvas is before any layer does.
    axis: chart.axis?.name ?? null,
  });

/** How a chart's layers share the screen — the server's `ChartLayout`. */
export type ChartLayoutValue = "STACKED" | "SHARED" | "OVERLAY";

/**
 * The layout a chart is drawn in: its own, remembered by the server.
 *
 * CONTENT, not structure — deliberately absent from `chartScopeSignature`: a
 * toggle relays the rows or panels out and never rebuilds. Unknown or missing
 * reads as SHARED (what a chart was before it had one). OVERLAY is kept as the
 * chart says: it puts every along-axis layer in one plot, and value panels —
 * whose scale is their axis — read it as SHARED (`valuesPanels`).
 */
export const chartLayoutOf = (chart: { layout?: string | null }): ChartLayoutValue => {
  if (chart.layout === "STACKED") return "STACKED";
  if (chart.layout === "OVERLAY") return "OVERLAY";
  return "SHARED";
};

/**
 * One layer's structural identity: which layer, of what kind, reading what,
 * along which of its axes, and reached by which path.
 *
 * The path is keyed by edge id AND version, so refining a registration in place
 * moves the key even though the edge id is unchanged. `alongAxis` is in it
 * because it is DERIVED from the registration: re-register the data by another
 * axis and it changes with no write to the layer.
 */
export const layerStructureKey = (l: ChartLayerStructureLike): string =>
  JSON.stringify({
    id: l.id,
    kind: l.__typename ?? null,
    source: l.lens?.id ?? l.tableDataset?.id ?? l.annotationCollection?.id ?? null,
    along: l.alongAxis ?? null,
    series: l.seriesAxis ?? null,
    value: l.valueColumn ?? null,
    columns: [l.xColumn ?? null, l.yColumn ?? null, l.zColumn ?? null, l.groupColumn ?? null, l.bins ?? null],
    filters: l.windowFilters ?? null,
    path:
      l.pathToWorld?.map((step) => [
        step.transformation?.id ?? null,
        step.transformation?.version ?? null,
        step.inverted ?? false,
      ]) ?? null,
  });

const byId = (a: { id: string }, b: { id: string }) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

/**
 * Display order: the layers' own `order`, then id — so server-side array order,
 * which nothing promises to keep stable, never reorders the stack.
 */
export const orderedLayers = <L extends { id: string; order?: number | null }>(
  layers: readonly L[] | null | undefined,
): L[] => [...(layers ?? [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || byId(a, b));
