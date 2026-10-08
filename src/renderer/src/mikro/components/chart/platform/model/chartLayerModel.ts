import { placementToTimeMap, type AffinePlacementLike, type TimeMap } from "@/core/data/plot/coords/timeMap";
import { channelLabelsOf, type ChannelAnchorLike } from "@/core/data/plot/model/channelAnchors";
import { colorForLayerId } from "@/core/data/plot/model/layerColor";
import { placeabilityOf, type Placeability } from "@/core/data/plot/model/placeable";
import {
  buildAxisTraceSource,
  type DataArrayLike,
  type SliceLike,
  type TraceSource,
} from "@/core/data/plot/sources/traceSource";
import type { PlotLayerBase } from "@/core/data/plot/stores/plotStore";
import { markSpaceOf, vectorAxes, type AxisLike, type MarkSpace } from "./chartMarks";

/**
 * A chart layer, normalized into what the renderer and the panel read.
 *
 * Derived ONCE per fold, so placement, the pyramid and the axis lookups are
 * never re-derived per frame or per component. Structural input — no generated
 * types — so normalization is testable in node.
 *
 * ## Placement
 *
 * `asAffine` is the ONLY placement authority: its one row maps the layer's
 * `alongAxis` onto the chart's axis, `position = offset + step · index`. There
 * is no client walk of `pathToWorld`. A layer with no `asAffine`, no
 * `alongAxis`, or a map that does not constrain the chart's axis is NOT drawn,
 * and its card says why.
 */

export type ChartLayerKind = "trace" | "series" | "annotation";

/** How a trace or a series is drawn. A look, not a kind. */
export type ChartMark = "LINE" | "MARKERS" | "LINE_MARKERS" | "STEPS";

/**
 * What the server holds for the fields a user edits — exactly
 * `UpdateChartLayerInput`. Kept verbatim beside the derived ones, so an
 * optimistic patch has one place to land and a refetch one thing to be
 * compared with.
 */
export type PersistedChartLayer = {
  name: string | null;
  visible: boolean;
  order: number;
  opacity: number;
  /** RGBA, each 0..1, or null: "let the viewer choose". */
  color: readonly number[] | null;
  mark: ChartMark;
  /** Screen pixels, or null: the viewer's default. */
  lineWidth: number | null;
  markerSize: number | null;
};

/** A table read as a series: one numeric column against a coordinate column. */
export type SeriesSource = {
  store: { id: string; sizeBytes?: number | null };
  /** The column laid along the chart's axis. */
  coordinateColumn: string;
  valueColumn: string;
  /** Coordinate-column units → the chart's axis: `position = t0 + period · x`. */
  axisMap: TimeMap;
};

/** An annotation collection as a chart layer reads it. */
export type AnnotationSource = {
  collectionId: string;
  /** How many axes its space has: the length of a vector drawn into it. */
  axisCount: number;
  /** Null when nothing of the space runs along the chart's axis: drawn nowhere. */
  space: MarkSpace | null;
};

/** Why a layer's data cannot be read, in words for its card. */
export type ChartSourceFailure = string;

export type ChartLayerState = PlotLayerBase<PersistedChartLayer> & {
  kind: ChartLayerKind;
  label: string;
  opacity: number;
  /** Screen pixels. */
  lineWidth: number;
  markerSize: number;
  mark: ChartMark;
  /** What the tile and table drivers read of `mark`: how samples are joined. */
  lineShape: "linear" | "steps";
  placeability: Placeability;
  /** Traces: the pyramid placed along the chart's axis; null when undrawable. */
  source: TraceSource | null;
  /** Series: the table's columns and their placement. */
  series: SeriesSource | null;
  /** Annotations: the collection drawn, and how its vectors are read. */
  marks: AnnotationSource | null;
  sourceFailure: ChartSourceFailure | null;
  /** What this layer reads, for its card: a dataset, a table and column, a collection. */
  reads: string;
  /** The source axis laid along the chart's (derived by the server, not a setting). */
  alongAxis: string | null;
  /** Traces: the free CHANNEL / INDEX axis drawn as one line per position. */
  seriesAxis: string | null;
  valueUnit: string | null;
  /**
   * Which layers may share a row and a scale. A series is keyed by its unit;
   * a trace has no unit in the schema, so by its dataset — lenses over one
   * array necessarily measure the same thing. Anything else is on its own.
   */
  rowGroup: string;
  /** Lines this layer draws (a trace's positions along `seriesAxis`; else one). */
  channelCount: number;
  /**
   * What each of a trace's several lines is called, in draw order: the name an
   * anchor gives that position, else the position itself. Empty for one line.
   */
  channelLabels: string[];
  /** The scale to draw at before any data lands. None is persisted for a chart. */
  climSeed: { lo: number; hi: number } | null;
};

// --- structural inputs -----------------------------------------------------

export type ChartLayerCommonLike = {
  __typename?: string;
  id: string;
  name?: string | null;
  order?: number | null;
  visible?: boolean | null;
  opacity?: number | null;
  color?: readonly number[] | null;
  placement?: string | null;
  placementInvariance?: string | null;
  alongAxis?: string | null;
  asAffine?: AffinePlacementLike | null;
};

type MarkedLike = { mark?: string | null; lineWidth?: number | null; markerSize?: number | null };

export type ChartLensLike = {
  id: string;
  axisNames?: readonly string[] | null;
  shape?: readonly number[] | null;
  slices?: readonly SliceLike[] | null;
  activeAnchors?: readonly ChannelAnchorLike[] | null;
  dataset: {
    id: string;
    name?: string | null;
    axisNames?: readonly string[] | null;
    shape?: readonly number[] | null;
    dataArrays?: readonly DataArrayLike[] | null;
  };
};

export type TraceChartLayerLike = ChartLayerCommonLike &
  MarkedLike & { lens: ChartLensLike; seriesAxis?: string | null };

export type SeriesChartLayerLike = ChartLayerCommonLike &
  MarkedLike & {
    tableDataset: { id: string; name?: string | null; store: { id: string; sizeBytes?: number | null } };
    valueColumn: string;
    coordinateColumn?: string | null;
    valueUnit?: string | null;
  };

export type AnnotationChartLayerLike = ChartLayerCommonLike & {
  annotationCollection: {
    id: string;
    name?: string | null;
    coordinateSystem?: { axes?: readonly AxisLike[] | null } | null;
  };
};

// --- derivation ------------------------------------------------------------

export const DEFAULT_LINE_WIDTH = 1.25;
export const DEFAULT_MARKER_SIZE = 5;

export const kindOfTypename = (typename: string | undefined): ChartLayerKind | null => {
  switch (typename) {
    case "TraceChartLayer":
      return "trace";
    case "SeriesChartLayer":
      return "series";
    case "AnnotationChartLayer":
      return "annotation";
    default:
      return null;
  }
};

/** Reads a server mark leniently: anything unknown (or absent) is a line. */
export const markOf = (value: string | null | undefined): ChartMark =>
  value === "MARKERS" || value === "LINE_MARKERS" || value === "STEPS" ? value : "LINE";

export const drawsLine = (mark: ChartMark): boolean => mark !== "MARKERS";
export const drawsMarkers = (mark: ChartMark): boolean => mark === "MARKERS" || mark === "LINE_MARKERS";

const channel = (value: number | undefined, fallback: number) =>
  Math.round(Math.max(0, Math.min(1, value ?? fallback)) * 255);

/**
 * A persisted RGBA (each 0..1) as the CSS a line is drawn in, at this opacity.
 *
 * The opacity is folded INTO the colour, against the canvas' black: a
 * transparent `Line2NodeMaterial` takes the renderer's viewport-copy path, and
 * a chart of thirty lines must not pay that per line. On black the result is
 * what alpha blending would have drawn; where lines cross it is not, which is
 * the stated limit of this pass.
 */
export const cssOf = (color: readonly number[], opacity: number): string => {
  const a = Math.max(0, Math.min(1, opacity)) * Math.max(0, Math.min(1, color[3] ?? 1));
  const [r, g, b] = [0, 1, 2].map((i) => Math.round(channel(color[i], 0) * a));
  return `rgb(${r}, ${g}, ${b})`;
};

/** A generated `hsl(h, s%, l%)` dimmed toward black by an opacity. */
const dimmed = (hsl: string, opacity: number): string => {
  const a = Math.max(0, Math.min(1, opacity));
  if (a >= 1) return hsl;
  return hsl.replace(/,\s*([\d.]+)%\)$/, (_, l: string) => `, ${(Number(l) * a).toFixed(1)}%)`);
};

const persistedOf = (layer: ChartLayerCommonLike & MarkedLike): PersistedChartLayer => ({
  name: layer.name ?? null,
  visible: layer.visible ?? true,
  order: layer.order ?? 0,
  opacity: layer.opacity ?? 1,
  color: layer.color ?? null,
  mark: markOf(layer.mark),
  lineWidth: layer.lineWidth ?? null,
  markerSize: layer.markerSize ?? null,
});

/**
 * The fields every kind derives the same way from its persisted state. Re-run
 * after an optimistic patch (`withPersisted`), so a restyle repaints without a
 * refetch.
 */
const derivedFromPersisted = (id: string, persisted: PersistedChartLayer) => ({
  order: persisted.order,
  visible: persisted.visible,
  opacity: persisted.opacity,
  color: persisted.color
    ? cssOf(persisted.color, persisted.opacity)
    : dimmed(colorForLayerId(id), persisted.opacity),
  lineWidth: persisted.lineWidth ?? DEFAULT_LINE_WIDTH,
  markerSize: persisted.markerSize ?? DEFAULT_MARKER_SIZE,
  mark: persisted.mark,
  lineShape: persisted.mark === "STEPS" ? ("steps" as const) : ("linear" as const),
});

/** A layer with its persisted fields replaced — the optimistic overlay's view. */
export const withPersisted = (
  layer: ChartLayerState,
  patch: Partial<PersistedChartLayer>,
): ChartLayerState => {
  const persisted = { ...layer.persisted, ...patch };
  const next: ChartLayerState = { ...layer, persisted, ...derivedFromPersisted(layer.id, persisted) };
  if ("name" in patch) next.label = patch.name ?? layer.label;
  return next;
};

const base = (
  layer: ChartLayerCommonLike,
  kind: ChartLayerKind,
  persisted: PersistedChartLayer,
  placeability: Placeability,
): Omit<ChartLayerState, "label" | "reads" | "rowGroup"> => ({
  id: layer.id,
  typename: layer.__typename ?? "",
  kind,
  ...derivedFromPersisted(layer.id, persisted),
  placeability,
  source: null,
  series: null,
  marks: null,
  sourceFailure: null,
  alongAxis: layer.alongAxis ?? null,
  seriesAxis: null,
  valueUnit: null,
  span: null,
  channelCount: 1,
  channelLabels: [],
  climSeed: null,
  persisted,
});

/** Draw only from a composed map: a chart has no lookup-timed read path. */
const affineDrawable = (p: Placeability): boolean => p.drawable && p.timeSource === "AFFINE";

/** The dataset's name for the axis the lens calls `lensAxis` (same position). */
const datasetAxisOf = (lens: ChartLensLike, lensAxis: string): string => {
  const index = lens.axisNames?.indexOf(lensAxis) ?? -1;
  return (index >= 0 ? lens.dataset.axisNames?.[index] : null) ?? lensAxis;
};

const spanOfSource = (source: TraceSource): { start: number; end: number } | null => {
  const finest = source.levels[0];
  if (!finest || finest.sampleCount <= 0) return null;
  const a = finest.t0;
  const b = finest.t0 + finest.period * finest.sampleCount;
  return a <= b ? { start: a, end: b } : { start: b, end: a };
};

/**
 * A name per line of a trace that draws several. Anchors pin DATASET indices
 * along the dataset's own axis name, which is not the line's index once the
 * lens slices or strides that axis.
 */
const lineLabelsOf = (lens: ChartLensLike, seriesAxis: string | null, source: TraceSource | null): string[] => {
  if (!seriesAxis || !source || source.channelCount <= 1) return [];
  const named = channelLabelsOf(lens.activeAnchors ?? [], datasetAxisOf(lens, seriesAxis), source.channelIndices);
  return source.channelIndices.map((index, line) => named[line] ?? `${seriesAxis} ${index}`);
};

const SOURCE_FAILURES: Record<string, string> = {
  "no-placement": "its placement says nothing about the chart's axis",
  "no-time-axis": "the axis laid along the chart is not one of the array's",
  "no-levels": "the array's pyramid could not be read",
  "no-arrays": "the dataset has no array to read",
  "no-channel": "the lens selects no position to draw a line for",
};

export const normalizeTraceLayer = (
  layer: TraceChartLayerLike,
  /** The chart's axis name: the output side of every layer's placement. */
  chartAxis: string,
  /** What the lens of this dataset is called on a card (`lensLabel`). */
  lensText: string,
  asAffineError?: string | null,
  /**
   * The pyramid a previous fold built for the SAME structure (the fold's memo).
   * Given, it is reused as is — building a source walks every level's
   * transforms, and a content-only fold (an edit, a refetch) must not pay that.
   */
  keptSource?: TraceSource | null,
): ChartLayerState => {
  const placeability = placeabilityOf(layer, asAffineError);
  const persisted = persistedOf(layer);
  const lens = layer.lens;
  const along = layer.alongAxis ?? null;
  const seriesAxis = layer.seriesAxis ?? null;

  let source: TraceSource | null = keptSource ?? null;
  let sourceFailure: string | null = null;
  if (!source && affineDrawable(placeability)) {
    if (!along) {
      sourceFailure = "no axis of it runs along the chart's";
    } else {
      const result = buildAxisTraceSource({
        lens,
        asAffine: layer.asAffine ?? null,
        datasetAxisNames: lens.dataset.axisNames ?? lens.axisNames ?? [],
        along: { lens: along, dataset: datasetAxisOf(lens, along), world: chartAxis },
        series: seriesAxis ? { lens: seriesAxis, dataset: datasetAxisOf(lens, seriesAxis) } : null,
        // A pyramid whose edges are missing is better drawn from its shapes than
        // not at all — `scale · shape == const` makes the ratio exact.
        shapeRatioFallback: true,
        // One sample of a trace through an image stack can cost a whole plane.
        decodeCost: "chunks",
      });
      if (result.ok) source = result.source;
      else sourceFailure = SOURCE_FAILURES[result.reason] ?? result.reason;
    }
  }

  const datasetName = lens.dataset.name ?? `Array ${lens.dataset.id}`;
  return {
    ...base(layer, "trace", persisted, placeability),
    label: layer.name ?? datasetName,
    reads: lensText ? `${datasetName} · ${lensText}` : datasetName,
    source,
    sourceFailure,
    seriesAxis,
    span: source ? spanOfSource(source) : null,
    channelCount: source?.channelCount ?? 1,
    channelLabels: lineLabelsOf(lens, seriesAxis, source),
    rowGroup: `dataset:${lens.dataset.id}`,
  };
};

export const normalizeSeriesLayer = (
  layer: SeriesChartLayerLike,
  chartAxis: string,
  asAffineError?: string | null,
): ChartLayerState => {
  const placeability = placeabilityOf(layer, asAffineError);
  const persisted = persistedOf(layer);
  const coordinateColumn = layer.coordinateColumn ?? layer.alongAxis ?? null;

  let series: SeriesSource | null = null;
  let sourceFailure: string | null = null;
  if (affineDrawable(placeability)) {
    const axisMap = coordinateColumn
      ? placementToTimeMap(layer.asAffine ?? null, coordinateColumn, chartAxis)
      : null;
    if (!coordinateColumn) sourceFailure = "no coordinate column of it runs along the chart's axis";
    else if (!axisMap) sourceFailure = SOURCE_FAILURES["no-placement"];
    else {
      series = {
        store: layer.tableDataset.store,
        coordinateColumn,
        valueColumn: layer.valueColumn,
        axisMap,
      };
    }
  }

  const tableName = layer.tableDataset.name ?? `Table ${layer.tableDataset.id}`;
  const unit = layer.valueUnit ?? null;
  return {
    ...base(layer, "series", persisted, placeability),
    label: layer.name ?? `${tableName} · ${layer.valueColumn}`,
    reads: `${tableName} · ${layer.valueColumn}`,
    series,
    sourceFailure,
    valueUnit: unit,
    // The extent is known only once the table is read; the driver reports it.
    span: null,
    rowGroup: unit ? `unit:${unit}` : `layer:${layer.id}`,
  };
};

export const normalizeAnnotationLayer = (
  layer: AnnotationChartLayerLike,
  chartAxis: string,
  asAffineError?: string | null,
): ChartLayerState => {
  const collection = layer.annotationCollection;
  const name = collection.name ?? `Collection ${collection.id}`;
  const placeability = placeabilityOf(layer, asAffineError);
  const axes = collection.coordinateSystem?.axes ?? [];
  const along = layer.alongAxis ?? null;
  // The same one row of `asAffine` every layer is placed by: the collection's
  // own axis onto the chart's.
  const axisMap =
    affineDrawable(placeability) && along
      ? placementToTimeMap(layer.asAffine ?? null, along, chartAxis)
      : null;
  return {
    ...base(layer, "annotation", persistedOf(layer), placeability),
    label: layer.name ?? name,
    reads: name,
    marks: {
      collectionId: collection.id,
      axisCount: vectorAxes(axes).length,
      space: markSpaceOf(axes, along, axisMap),
    },
    rowGroup: `layer:${layer.id}`,
  };
};

/** The line a card shows under an undrawn chart layer. */
export const unplacedMessage = (p: Placeability): string | null => {
  if (p.drawable) {
    return p.timeSource === "LOOKUP" ? "Placed by a map with no closed form — not drawn" : null;
  }
  switch (p.reason) {
    case "conditional":
      return "Placed per index — not drawn yet";
    case "unregistered":
      return "Not registered into this chart's space yet";
    case "unmappable":
      return "Cannot be placed along this chart's axis";
    case "uncondensable":
      return "Placement could not be resolved";
    default:
      return "Placement unknown";
  }
};
