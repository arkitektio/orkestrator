import {
  buildTraceSource,
  type LensLike,
  type SourceFailure,
  type TraceSource,
} from "../sources/traceSource";
import { channelAxisName, type CoordinateSystemLike } from "../coords/timeAxis";
import { buildEventSource, type EventSource, type EventTableLike } from "../sources/eventSource";
import { buildSpikeSource, type SparseDatasetLike, type SpikeSource } from "../sources/spikeSource";
import { durationToMs } from "../coords/timeUnits";
import type { AffinePlacementLike } from "../coords/timeMap";
import {
  anchorUnitOf,
  channelLabelsOf,
  climSeedOf,
  histogramClimOf,
  siteLabelOf,
  type AnchorLike,
} from "./anchors";
import { placeabilityOf, type Placeability } from "./placeable";

/**
 * A layer, normalized into what the renderer and the panel read.
 *
 * mikro keeps two lists — raw `sceneLayers` and normalized `layers` — and the card
 * registry's `source` field says which one a card may edit. Elektro does the same:
 * `LayerState` is the normalized list, derived here ONCE per fold, so that
 * placement, the pyramid and the axis lookups are never re-derived per frame or
 * per component.
 *
 * Structural input — no generated types — so normalization is testable in node.
 */

export type LayerKind = "trace" | "spikes" | "events" | "annotation";

/**
 * What the server holds for the fields a user edits. Kept verbatim beside the
 * derived ones, so an optimistic patch has exactly one place to land and a
 * refetch has exactly one thing to be compared with.
 */
export type PersistedLayer = {
  name: string | null;
  visible: boolean;
  order: number;
  opacity: number;
  /** RGBA 0–255, or null: "let the viewer choose". */
  color: readonly number[] | null;
  lineWidth: number | null;
  climMin: number | null;
  climMax: number | null;
};

export type LayerState = {
  id: string;
  typename: string;
  kind: LayerKind;
  label: string;
  order: number;
  visible: boolean;
  opacity: number;
  blending: string | null;
  /** The resolved CSS colour: the persisted RGBA, or a stable per-layer hue. */
  color: string;
  /** Screen pixels. */
  lineWidth: number;
  placeability: Placeability;
  /** The pyramid placed on the timeline; traces only, null when undrawable. */
  source: TraceSource | null;
  /** Events only: the table's columns and its time placement. */
  events: EventSource | null;
  /** Spikes only: the unit-indexed layout and its time placement. */
  spikes: SpikeSource | null;
  /** Spikes only: how the raster is drawn. */
  raster: {
    tickHeight: number;
    valueMode: "PRESENCE" | "AMPLITUDE";
    /** `rateBin` in WORLD time units; null draws the raster. */
    rateBin: number | null;
    colormap: string | null;
    rowOrderColumn: string | null;
  } | null;
  /** Why this layer's data cannot be read, whatever its kind. */
  sourceFailure: SourceFailure | string | null;
  valueUnit: string | null;
  valueDimension: string | null;
  /** World-time extent of the data this layer shows. Null when not placed. */
  span: { start: number; end: number } | null;
  /** Rows (traces: drawn channels) this layer stacks into. */
  channelCount: number;
  /** One label per drawn channel, from the lens' anchors (null where unnamed). */
  channelLabels: (string | null)[];
  /** Where it was recorded or stimulated, from the anchors. */
  siteLabel: string | null;
  /** "12 s", or null when the layer is timed by a lookup. */
  duration: string | null;
  /** The scale to draw at before any data lands (see `anchors.climSeedOf`). */
  climSeed: { lo: number; hi: number } | null;
  /** The anchors' measured value range — the seed's fallback when no clim is persisted. */
  histogramClim: { lo: number; hi: number } | null;
  persisted: PersistedLayer;
};

export type LayerCommonLike = {
  __typename?: string;
  id: string;
  name?: string | null;
  order?: number | null;
  visible?: boolean | null;
  opacity?: number | null;
  blending?: string | null;
  placement?: string | null;
  placementInvariance?: string | null;
  asAffine?: AffinePlacementLike | null;
};

export type TraceLayerLike = LayerCommonLike & {
  lens: LensLike & {
    activeAnchors?: readonly AnchorLike[] | null;
    dataset: LensLike["dataset"] & {
      name?: string | null;
      valueUnit?: string | null;
      valueDimension?: string | null;
    };
  };
  channelIndex?: number | null;
  climMin?: number | null;
  climMax?: number | null;
  lineWidth?: number | null;
  color?: readonly number[] | null;
  duration?: string | null;
};

export type SpikesLayerLike = LayerCommonLike & {
  sparseDataset: SparseDatasetLike;
  tickHeight?: number | null;
  rowOrderColumn?: string | null;
  valueMode?: string | null;
  rateBin?: string | null;
  colormap?: string | null;
  climMin?: number | null;
  climMax?: number | null;
  color?: readonly number[] | null;
};

export type EventsLayerLike = LayerCommonLike & {
  tableDataset: EventTableLike;
  timeColumn?: string | null;
  stopColumn?: string | null;
  labelColumn?: string | null;
  laneColumn?: string | null;
  color?: readonly number[] | null;
};

export type AnnotationLayerLike = LayerCommonLike & {
  annotationCollection: { name: string };
};

export const DEFAULT_LINE_WIDTH = 1.25;

const GOLDEN_ANGLE = 137.508;

/** Stable per-layer hue — the walk the legend has always used. */
export const colorForLayerId = (id: string): string => {
  const numeric = Number.parseInt(id, 10);
  const seed = Number.isFinite(numeric)
    ? numeric
    : [...id].reduce((acc, ch) => (acc * 31 + ch.charCodeAt(0)) | 0, 7);
  return `hsl(${Math.abs(seed * GOLDEN_ANGLE) % 360}, 70%, 60%)`;
};

/** An RGBA 0–255 list as CSS; the alpha channel is honoured. */
export const rgbaCss = (color: readonly number[]): string => {
  const [r = 0, g = 0, b = 0, a = 255] = color;
  return `rgba(${r}, ${g}, ${b}, ${Math.max(0, Math.min(1, a / 255))})`;
};

export const kindOfTypename = (typename: string | undefined): LayerKind | null => {
  switch (typename) {
    case "TraceLayer":
      return "trace";
    case "SpikesLayer":
      return "spikes";
    case "EventsLayer":
      return "events";
    case "AnnotationLayer":
      return "annotation";
    default:
      return null;
  }
};

const persistedOf = (
  layer: LayerCommonLike & {
    color?: readonly number[] | null;
    lineWidth?: number | null;
    climMin?: number | null;
    climMax?: number | null;
  },
): PersistedLayer => ({
  name: layer.name ?? null,
  visible: layer.visible ?? true,
  order: layer.order ?? 0,
  opacity: layer.opacity ?? 1,
  color: layer.color ?? null,
  lineWidth: layer.lineWidth ?? null,
  climMin: layer.climMin ?? null,
  climMax: layer.climMax ?? null,
});

/**
 * The fields every kind derives the same way from its persisted state. Re-run
 * after an optimistic patch (`withPersisted`), so a colour edit repaints without
 * a refetch.
 */
const derivedFromPersisted = (id: string, persisted: PersistedLayer) => ({
  order: persisted.order,
  visible: persisted.visible,
  opacity: persisted.opacity,
  color: persisted.color ? rgbaCss(persisted.color) : colorForLayerId(id),
  lineWidth: persisted.lineWidth ?? DEFAULT_LINE_WIDTH,
});

/** A layer with its persisted fields replaced — the optimistic overlay's view. */
export const withPersisted = (layer: LayerState, patch: Partial<PersistedLayer>): LayerState => {
  const persisted = { ...layer.persisted, ...patch };
  const next: LayerState = {
    ...layer,
    persisted,
    ...derivedFromPersisted(layer.id, persisted),
  };
  if ("name" in patch) next.label = patch.name ?? layer.label;
  if ("climMin" in patch || "climMax" in patch) {
    next.climSeed = climSeedOf(persisted, layer.histogramClim);
  }
  return next;
};

const base = (
  layer: LayerCommonLike,
  kind: LayerKind,
  persisted: PersistedLayer,
  placeability: Placeability,
): Omit<LayerState, "label"> => ({
  id: layer.id,
  typename: layer.__typename ?? "",
  kind,
  blending: layer.blending ?? null,
  ...derivedFromPersisted(layer.id, persisted),
  placeability,
  source: null,
  events: null,
  spikes: null,
  raster: null,
  sourceFailure: null,
  valueUnit: null,
  valueDimension: null,
  span: null,
  channelCount: 0,
  channelLabels: [],
  siteLabel: null,
  duration: null,
  climSeed: null,
  histogramClim: null,
  persisted,
});

/** The world-time extent of the FINEST level, which is the whole of what the layer shows. */
const spanOfSource = (source: TraceSource): { start: number; end: number } | null => {
  const finest = source.levels[0];
  if (!finest || finest.sampleCount <= 0) return null;
  const a = finest.t0;
  const b = finest.t0 + finest.period * finest.sampleCount;
  return a <= b ? { start: a, end: b } : { start: b, end: a };
};

export const normalizeTraceLayer = (
  layer: TraceLayerLike,
  world: CoordinateSystemLike | null | undefined,
  asAffineError?: string | null,
  /**
   * The pyramid a previous fold built for the SAME structure (the fold's memo).
   * Given, it is reused as is — building a source walks every level's
   * transforms, and a content-only fold (an edit, a refetch) must not pay that.
   */
  keptSource?: TraceSource | null,
): LayerState => {
  const placeability = placeabilityOf(layer, asAffineError);

  let source: TraceSource | null = keptSource ?? null;
  let sourceFailure: SourceFailure | null = null;
  if (!source && placeability.drawable && placeability.timeSource === "AFFINE") {
    const result = buildTraceSource({
      lens: layer.lens,
      asAffine: layer.asAffine ?? null,
      world,
      // A pyramid whose edges are missing is better drawn from its shapes than not
      // at all — the invariant `scale · shape == const` makes the ratio exact for a
      // well-formed pyramid.
      shapeRatioFallback: true,
      channelIndex: layer.channelIndex ?? null,
    });
    if (result.ok) source = result.source;
    else sourceFailure = result.reason;
  }

  const anchors = layer.lens.activeAnchors ?? [];
  const channelAxis = channelAxisName(layer.lens.dataset.intrinsicSystem);
  const channelIndices = source?.channelIndices ?? [];
  const siteLabel = siteLabelOf(anchors);
  const dataset = layer.lens.dataset;
  const persisted = persistedOf(layer);
  const histogramClim = histogramClimOf(anchors, channelAxis, channelIndices);

  return {
    ...base(layer, "trace", persisted, placeability),
    label: layer.name ?? siteLabel ?? dataset.name ?? `Trace ${layer.id}`,
    source,
    sourceFailure,
    valueUnit: dataset.valueUnit ?? anchorUnitOf(anchors),
    valueDimension: dataset.valueDimension ?? null,
    span: source ? spanOfSource(source) : null,
    channelCount: source?.channelCount ?? 1,
    channelLabels: channelLabelsOf(anchors, channelAxis, channelIndices),
    siteLabel,
    duration: layer.duration ?? null,
    climSeed: climSeedOf(persisted, histogramClim),
    histogramClim,
  };
};

/**
 * A `Duration` ("5 ms") in world time units, given the world's time unit.
 * Null when either is unreadable.
 */
export const durationInWorldUnits = (
  duration: string | null | undefined,
  worldUnitMs: number | null,
): number | null => {
  if (!duration || worldUnitMs == null || worldUnitMs <= 0) return null;
  const ms = durationToMs(duration);
  return ms == null ? null : ms / worldUnitMs;
};

export const normalizeSpikesLayer = (
  layer: SpikesLayerLike,
  world: CoordinateSystemLike | null | undefined,
  asAffineError?: string | null,
  worldUnitMs: number | null = null,
): LayerState => {
  const persisted = persistedOf(layer);
  const placeability = placeabilityOf(layer, asAffineError);
  let spikes: SpikeSource | null = null;
  let sourceFailure: string | null = null;
  if (placeability.drawable && placeability.timeSource === "AFFINE") {
    const result = buildSpikeSource({ dataset: layer.sparseDataset, asAffine: layer.asAffine, world });
    if (result.ok) spikes = result.source;
    else sourceFailure = result.reason;
  }
  const span =
    spikes && spikes.timeCount > 0
      ? (() => {
          const a = spikes.timeMap.t0;
          const b = spikes.timeMap.t0 + spikes.timeMap.period * spikes.timeCount;
          return { start: Math.min(a, b), end: Math.max(a, b) };
        })()
      : null;
  return {
    ...base(layer, "spikes", persisted, placeability),
    label: layer.name ?? layer.sparseDataset.name,
    spikes,
    span,
    raster: {
      tickHeight: layer.tickHeight ?? 0.8,
      valueMode: layer.valueMode === "AMPLITUDE" ? "AMPLITUDE" : "PRESENCE",
      rateBin: durationInWorldUnits(layer.rateBin, worldUnitMs),
      colormap: layer.colormap ?? null,
      rowOrderColumn: layer.rowOrderColumn ?? null,
    },
    climSeed: climSeedOf(persisted, null),
    sourceFailure,
    channelCount: 1,
  };
};

export const normalizeEventsLayer = (
  layer: EventsLayerLike,
  world: CoordinateSystemLike | null | undefined,
  asAffineError?: string | null,
): LayerState => {
  const persisted = persistedOf(layer);
  const placeability = placeabilityOf(layer, asAffineError);
  let events: EventSource | null = null;
  let sourceFailure: string | null = null;
  if (placeability.drawable && placeability.timeSource === "AFFINE") {
    const result = buildEventSource({
      table: layer.tableDataset,
      timeColumn: layer.timeColumn,
      stopColumn: layer.stopColumn,
      labelColumn: layer.labelColumn,
      laneColumn: layer.laneColumn,
      asAffine: layer.asAffine,
      world,
    });
    if (result.ok) events = result.source;
    else sourceFailure = result.reason;
  }
  return {
    ...base(layer, "events", persisted, placeability),
    label: layer.name ?? layer.tableDataset.name,
    events,
    sourceFailure,
    channelCount: 1,
  };
};

export const normalizeAnnotationLayer = (
  layer: AnnotationLayerLike,
  asAffineError?: string | null,
): LayerState => ({
  ...base(layer, "annotation", persistedOf(layer), placeabilityOf(layer, asAffineError)),
  label: layer.name ?? layer.annotationCollection.name,
});

/**
 * The world extent every placed layer covers together, and the origin the GPU
 * works relative to.
 *
 * `timeOrigin` is subtracted from every world time BEFORE it is cast to float32.
 * A world anchored at a Unix epoch in seconds puts times near 1.8e9, where
 * float32's resolution is ~128 — every trace would collapse to a staircase. Taking
 * the origin at the data's own start keeps the float32 values small. It is fixed
 * per scope build and never moves mid-session, so nothing GPU-resident needs
 * rewriting when a layer arrives.
 */
export const worldExtentOf = (
  layers: readonly LayerState[],
): { span: { start: number; end: number } | null; timeOrigin: number } => {
  let start = Infinity;
  let end = -Infinity;
  for (const layer of layers) {
    if (!layer.span) continue;
    if (layer.span.start < start) start = layer.span.start;
    if (layer.span.end > end) end = layer.span.end;
  }
  if (!(end > start)) return { span: null, timeOrigin: 0 };
  return { span: { start, end }, timeOrigin: start };
};
