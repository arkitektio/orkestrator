import type { GenericQuantity } from "@/mikro/api/scalars";
import {
  Blending,
  ColorMap,
  LayerNodeInput,
  LayerRenderGraphFragment,
  PhasorColorMode,
  PhasorCursorInput,
  PhasorCursorKind,
  PhasorTransferInput,
  ProjectionMode,
  TransferFunctionInput,
} from "@/mikro/api/graphql";
import { ImageLayerFragment } from "./layerGuards";

/**
 * A layer's `renderGraph` (`ImageLayer.renderGraph`) is a composable render
 * recipe: a tree rooted at a `BlendNode` whose leaves are `ChannelSourceNode`s
 * (one intensity source + transfer function) and whose inner nodes are further
 * `BlendNode`s or `ProjectionNode`s.
 *
 * The generated `LayerRenderGraphFragment` is a deeply-nested union (the GraphQL
 * fragment is expanded to a fixed depth). This module converts it into a clean
 * recursive domain model that the editor and renderer consume, and back into
 * the `LayerRenderGraphInput` shape for saving.
 */

export const CHANNEL_KIND = "channel";
export const PHASOR_KIND = "phasor";
export const BLEND_KIND = "blend";
export const PROJECTION_KIND = "projection";

/** One stop of a custom COLOR gradient. `color` is RGBA 0-255 like every
 * other color in this model; `position` is the normalized intensity in [0,1]
 * after the scalar transfer — color stops replace the named colormap's ramp,
 * never the scalar transfer itself. SESSION-LOCAL (no server field). */
export type TransferStop = {
  position: number;
  color: number[];
};

/** One control point of the intensity transfer CURVE (the server's
 * `LookupStop`): a raw intensity (`position`, data units) and the normalized
 * 0..1 it maps to. The curve replaces the clim-window + gamma power law when
 * present — gamma is the fallback. */
export type TransferCurveStop = {
  position: number;
  value: number;
};

export type TransferFn = {
  climMin: number | null;
  climMax: number | null;
  colormap: ColorMap | null;
  color: number[] | null;
  /** Session-local color gradient; when ≥2 are present they take precedence
   * over `colormap`/`color` for the LUT row. */
  colorStops: TransferStop[] | null;
  /** The intensity transfer curve (server-persisted `stops`). */
  stops: TransferCurveStop[] | null;
  gamma: number | null;
  opacity: number | null;
  invert: boolean | null;
};

/**
 * The scalar transfer the shader actually runs: with a curve, the window is
 * the curve's DOMAIN and gamma collapses to 1 (the curve itself is baked into
 * the LUT row's x axis — see `buildColormapAtlas`); without one, the stored
 * clim/gamma. The one place the "gamma is a fallback" rule is decided.
 */
export const effectiveScalarTransfer = (
  transfer: Pick<TransferFn, "climMin" | "climMax" | "gamma" | "stops">,
): { climMin: number | null; climMax: number | null; gamma: number } => {
  const stops = transfer.stops;
  if (stops && stops.length >= 2) {
    return { climMin: stops[0].position, climMax: stops[stops.length - 1].position, gamma: 1 };
  }
  return { climMin: transfer.climMin, climMax: transfer.climMax, gamma: transfer.gamma ?? 1 };
};

export type ChannelRenderNode = {
  type: "channel";
  kind: string;
  label: string | null;
  intensityAxis: string | null;
  intensityIndex: number;
  visible: boolean;
  transfer: TransferFn;
};

/** A region of phasor space and the color the pixels inside it are painted. */
export type PhasorCursorDef = {
  kind: PhasorCursorKind;
  label: string | null;
  visible: boolean;
  /** RGB 0-255; null = the colormap's color at the cursor's own phasor value. */
  color: number[] | null;
  /** CIRCLE: centre + radius. */
  g: number | null;
  s: number | null;
  radius: number | null;
  /** POLYGON: ≥3 (g, s) vertices. */
  points: number[][] | null;
};

/**
 * How a phasor becomes a pixel's color. NOT a `TransferFn`: it maps the
 * reduction's output — a (g, s) pair plus a photon count — rather than a
 * sampled scalar. `min`/`max` are `GenericQuantity` strings (e.g. "0.5 ns"),
 * because the value they window is a lifetime over a microtime axis and a
 * wavelength over a spectrum one.
 */
export type PhasorTransferFn = {
  colormap: ColorMap;
  mode: PhasorColorMode;
  min: GenericQuantity | null;
  max: GenericQuantity | null;
  weightByIntensity: boolean;
  /** The ordinary transfer applied to the photon count. */
  intensity: TransferFn;
  cursors: PhasorCursorDef[];
};

/**
 * Reduces one axis of the lens to a phasor and colors the pixel by it. A leaf,
 * like a channel — it composites into the scene as a raster, not a scatter plot.
 */
export type PhasorRenderNode = {
  type: "phasor";
  kind: string;
  label: string | null;
  /** The axis reduced (a MICROTIME or SPECTRUM axis of the lens). */
  phasorAxis: string;
  harmonic: number;
  /** The channel the photons are counted in (a FLIM cube can be multi-channel). */
  intensityAxis: string | null;
  intensityIndex: number;
  visible: boolean;
  transfer: PhasorTransferFn;
};

export type BlendRenderNode = {
  type: "blend";
  kind: string;
  label: string | null;
  blending: Blending;
  children: RenderNode[];
};

export type ProjectionRenderNode = {
  type: "projection";
  kind: string;
  label: string | null;
  mode: ProjectionMode;
  children: RenderNode[];
};

export type RenderNode =
  | ChannelRenderNode
  | PhasorRenderNode
  | BlendRenderNode
  | ProjectionRenderNode;

/** The leaves that produce pixels: a channel or a phasor. */
export type SourceRenderNode = ChannelRenderNode | PhasorRenderNode;

// Structural shape of a fragment node (any depth). The generated union members
// all carry `__typename` plus the fields selected by RenderNodeCommon.
type FragmentNode = {
  __typename?: string;
  kind?: string;
  label?: string | null;
  blending?: Blending;
  mode?: ProjectionMode;
  intensityAxis?: string | null;
  intensityIndex?: number;
  visible?: boolean;
  transfer?: Partial<TransferFn> | null;
  // Aliased in the fragment: `transfer` on a PhasorNode is a PhasorTransfer,
  // which would otherwise collide with ChannelSourceNode's TransferFunction.
  phasorTransfer?: Partial<FragmentPhasorTransfer> | null;
  phasorAxis?: string;
  harmonic?: number;
  children?: FragmentNode[] | null;
};

type FragmentPhasorTransfer = {
  colormap: ColorMap;
  mode: PhasorColorMode;
  min: GenericQuantity | null;
  max: GenericQuantity | null;
  weightByIntensity: boolean;
  intensity: Partial<TransferFn> | null;
  cursors: Partial<PhasorCursorDef>[] | null;
};

const DEFAULT_TRANSFER: TransferFn = {
  // null clim = "full base-native range", resolved by each consumer against the
  // layer's data range. Clim is stored in absolute base-native value units.
  climMin: null,
  climMax: null,
  colormap: ColorMap.Viridis,
  color: null,
  colorStops: null,
  stops: null,
  gamma: null,
  opacity: null,
  invert: null,
};

/**
 * Normalize the server's `stops` (the LookupStop intensity CURVE): sorted by
 * position (raw data units), values clamped into [0,1], fewer than two = "no
 * curve" (the gamma fallback applies). Structural and defensive.
 */
const parseCurveStops = (raw: unknown): TransferCurveStop[] | null => {
  if (!Array.isArray(raw)) return null;
  const stops = raw
    .filter(
      (stop): stop is { position: number; value: number } =>
        typeof stop === "object" &&
        stop !== null &&
        typeof (stop as { position?: unknown }).position === "number" &&
        typeof (stop as { value?: unknown }).value === "number",
    )
    .map((stop) => ({
      position: stop.position,
      value: Math.min(1, Math.max(0, stop.value)),
    }))
    .sort((a, b) => a.position - b.position);
  return stops.length >= 2 ? stops : null;
};

const parseTransfer = (transfer: Partial<TransferFn> | null | undefined): TransferFn => ({
  climMin: transfer?.climMin ?? null,
  climMax: transfer?.climMax ?? null,
  colormap: transfer?.colormap ?? null,
  color: transfer?.color ?? null,
  // Session-local only — a fragment never carries it, a re-parse of domain
  // state preserves it.
  colorStops: transfer?.colorStops ?? null,
  stops: parseCurveStops(transfer?.stops),
  gamma: transfer?.gamma ?? null,
  opacity: transfer?.opacity ?? null,
  invert: transfer?.invert ?? null,
});

const parseCursor = (cursor: Partial<PhasorCursorDef>): PhasorCursorDef => ({
  kind: cursor.kind ?? PhasorCursorKind.Circle,
  label: cursor.label ?? null,
  visible: cursor.visible ?? true,
  color: cursor.color ?? null,
  g: cursor.g ?? null,
  s: cursor.s ?? null,
  radius: cursor.radius ?? null,
  points: cursor.points ?? null,
});

/**
 * Exported for `normalizePhasorLayer`: a `PhasorLayer` carries the identical
 * `PhasorTransfer` as a FIELD rather than under a graph node, so it parses the
 * same way. Sharing the parser is what keeps the two arms from drifting on
 * defaults (`weightByIntensity`, the null min/max convention).
 */
export const parsePhasorTransfer = (
  transfer: Partial<FragmentPhasorTransfer> | null | undefined,
): PhasorTransferFn => ({
  colormap: transfer?.colormap ?? ColorMap.Viridis,
  mode: transfer?.mode ?? PhasorColorMode.Phase,
  // null min/max = "range the colormap over the data's own phasor extent",
  // resolved by the consumer against the phasor histogram (or, absent one, the
  // full turn / unit modulation).
  min: transfer?.min ?? null,
  max: transfer?.max ?? null,
  weightByIntensity: transfer?.weightByIntensity ?? true,
  intensity: parseTransfer(transfer?.intensity),
  cursors: (transfer?.cursors ?? []).map(parseCursor),
});

/** Recursively convert a fragment node into the domain model. */
export const parseRenderNode = (node: FragmentNode): RenderNode => {
  if (node.__typename === "PhasorNode") {
    return {
      type: "phasor",
      kind: node.kind ?? PHASOR_KIND,
      label: node.label ?? null,
      phasorAxis: node.phasorAxis ?? "",
      harmonic: node.harmonic ?? 1,
      intensityAxis: node.intensityAxis ?? null,
      intensityIndex: node.intensityIndex ?? 0,
      visible: node.visible ?? true,
      transfer: parsePhasorTransfer(node.phasorTransfer),
    };
  }
  if (node.__typename === "ChannelSourceNode") {
    return {
      type: "channel",
      kind: node.kind ?? CHANNEL_KIND,
      label: node.label ?? null,
      intensityAxis: node.intensityAxis ?? null,
      intensityIndex: node.intensityIndex ?? 0,
      visible: node.visible ?? true,
      transfer: parseTransfer(node.transfer),
    };
  }
  if (node.__typename === "ProjectionNode") {
    return {
      type: "projection",
      kind: node.kind ?? PROJECTION_KIND,
      label: node.label ?? null,
      mode: node.mode ?? ProjectionMode.Mip,
      children: (node.children ?? []).map(parseRenderNode),
    };
  }
  // BlendNode (and unknown kinds default to blend containers).
  return {
    type: "blend",
    kind: node.kind ?? BLEND_KIND,
    label: node.label ?? null,
    blending: node.blending ?? Blending.Additive,
    children: (node.children ?? []).map(parseRenderNode),
  };
};

/** Parse a full `renderGraph` fragment; returns null when absent. */
export const parseRenderGraph = (
  graph: LayerRenderGraphFragment | null | undefined,
): BlendRenderNode | null => {
  if (!graph?.root) return null;
  const root = parseRenderNode(graph.root as FragmentNode);
  return root.type === "blend" ? root : { type: "blend", kind: BLEND_KIND, label: null, blending: Blending.Additive, children: [root] };
};

/** All channel leaves in tree order (what a multi-channel renderer composites). */
export const flattenChannels = (node: RenderNode | null): ChannelRenderNode[] => {
  if (!node) return [];
  if (node.type === "channel") return [node];
  if (node.type === "phasor") return [];
  return node.children.flatMap(flattenChannels);
};

/** All phasor leaves in tree order. */
export const flattenPhasors = (node: RenderNode | null): PhasorRenderNode[] => {
  if (!node) return [];
  if (node.type === "phasor") return [node];
  if (node.type === "channel") return [];
  return node.children.flatMap(flattenPhasors);
};

/**
 * Every pixel-producing leaf in tree order — channels AND phasors. This is what
 * the compositor iterates: both kinds occupy a source slot and are blended by
 * the same blend mode, they just tap a different number of atlas slabs (1 for a
 * channel, 3 for a phasor: g, s and the photon count).
 */
export const flattenSources = (node: RenderNode | null): SourceRenderNode[] => {
  if (!node) return [];
  if (node.type === "channel" || node.type === "phasor") return [node];
  return node.children.flatMap(flattenSources);
};

/** The first projection mode found in the tree, or MIP by default. */
export const resolveProjectionMode = (node: RenderNode | null): ProjectionMode => {
  if (!node) return ProjectionMode.Mip;
  if (node.type === "projection") return node.mode;
  if (node.type === "blend") {
    for (const child of node.children) {
      const found = findProjectionMode(child);
      if (found) return found;
    }
  }
  return ProjectionMode.Mip;
};

const findProjectionMode = (node: RenderNode): ProjectionMode | null => {
  if (node.type === "projection") return node.mode;
  if (node.type === "blend") {
    for (const child of node.children) {
      const found = findProjectionMode(child);
      if (found) return found;
    }
  }
  return null;
};

/**
 * What the graph builders below actually read off a layer: its stored graph, its
 * blending, its visibility and the lens' axis mapping.
 *
 * Typed structurally rather than as `ImageLayerFragment` so a normalized
 * `LayerState` — whose `__typename` is now the wider `"ImageLayer" | "LabelLayer"`
 * superset — satisfies it without a cast. These are only ever CALLED for an
 * image (the render-graph editor never mounts for a label, and
 * `normalizeLabelLayer` builds its degenerate fields directly), so widening the
 * parameter admits no new behaviour; it just stops the superset from needing a
 * narrowing that would mean nothing.
 */
type GraphSourceLayer = {
  renderGraph?: ImageLayerFragment["renderGraph"];
  blending?: ImageLayerFragment["blending"] | null;
  visible?: boolean | null;
  lens: { renderAxes?: ImageLayerFragment["lens"]["renderAxes"] };
};

/**
 * Build a default single-channel render graph for a layer that has no
 * `renderGraph` (e.g. legacy layers), so the renderer/editor always has a graph
 * to work with. The transfer uses defaults — the server no longer carries flat
 * clim/colormap/color/gamma fields; the render graph is the only source.
 */
export const defaultLayerGraph = (layer: GraphSourceLayer): BlendRenderNode => ({
  type: "blend",
  kind: BLEND_KIND,
  label: null,
  blending: layer.blending ?? Blending.Additive,
  children: [
    {
      type: "channel",
      kind: CHANNEL_KIND,
      label: null,
      intensityAxis: layer.lens.renderAxes?.intensity ?? null,
      intensityIndex: 0,
      visible: layer.visible ?? true,
      transfer: { ...DEFAULT_TRANSFER },
    },
  ],
});

/** The render graph for a layer: its own graph, or the default fallback. */
export const resolveLayerGraph = (layer: GraphSourceLayer): BlendRenderNode =>
  parseRenderGraph(layer.renderGraph) ?? defaultLayerGraph(layer);

/** A fresh channel source, for the editor's "add node" menu. */
export const newChannelNode = (layer: GraphSourceLayer): ChannelRenderNode => ({
  type: "channel",
  kind: CHANNEL_KIND,
  label: null,
  intensityAxis: layer.lens.renderAxes?.intensity ?? null,
  intensityIndex: 0,
  visible: true,
  transfer: { ...DEFAULT_TRANSFER },
});

/**
 * A fresh phasor source over the lens' phasor axis (`renderAxes.phasor` — the
 * server names the MICROTIME/SPECTRUM axis, if the data has one). Harmonic 1 is
 * the fundamental, and the one the lens' default `PhasorContext` resolves.
 */
export const newPhasorNode = (layer: GraphSourceLayer): PhasorRenderNode => ({
  type: "phasor",
  kind: PHASOR_KIND,
  label: null,
  phasorAxis: layer.lens.renderAxes?.phasor ?? "",
  harmonic: 1,
  intensityAxis: layer.lens.renderAxes?.intensity ?? null,
  intensityIndex: 0,
  visible: true,
  transfer: {
    // Lifetime overlays are read as a continuous hue ramp, not a luminance one.
    colormap: ColorMap.Rainbow,
    mode: PhasorColorMode.Phase,
    min: null,
    max: null,
    weightByIntensity: true,
    intensity: { ...DEFAULT_TRANSFER },
    cursors: [],
  },
});

/**
 * Normalize a color to the server's RGBA scalar: exactly 4 components. The
 * color picker (and legacy data) produce RGB triples, which the API rejects
 * with "takes exactly 4 components, but got 3" on save — append an opaque
 * alpha. Client consumers only ever read indices 0–2, so RGBA is safe
 * everywhere in-memory too.
 */
export const toRgba = (color: number[] | null): number[] | null => {
  if (!color) return null;
  if (color.length === 3) return [...color, 255];
  return color.length > 4 ? color.slice(0, 4) : color;
};

const serializeTransfer = (transfer: TransferFn): TransferFunctionInput => ({
  climMin: transfer.climMin,
  climMax: transfer.climMax,
  colormap: transfer.colormap,
  color: toRgba(transfer.color),
  gamma: transfer.gamma,
  opacity: transfer.opacity,
  invert: transfer.invert,
  // The intensity CURVE persists; `colorStops` (the session-local color
  // gradient) deliberately does not — the server has no field for it.
  stops:
    transfer.stops && transfer.stops.length >= 2
      ? transfer.stops.map((stop) => ({ position: stop.position, value: stop.value }))
      : null,
});

const serializeCursor = (cursor: PhasorCursorDef): PhasorCursorInput => ({
  kind: cursor.kind,
  label: cursor.label,
  visible: cursor.visible,
  color: toRgba(cursor.color),
  g: cursor.g,
  s: cursor.s,
  radius: cursor.radius,
  points: cursor.points,
});

/** Exported for the `PhasorLayer` card, which persists the identical transfer
 * through `updatePhasorLayer` rather than inside a serialized graph. */
export const serializePhasorTransfer = (transfer: PhasorTransferFn): PhasorTransferInput => ({
  colormap: transfer.colormap,
  mode: transfer.mode,
  min: transfer.min,
  max: transfer.max,
  weightByIntensity: transfer.weightByIntensity,
  intensity: serializeTransfer(transfer.intensity),
  cursors: transfer.cursors.map(serializeCursor),
});

/** Convert a domain node back into the `LayerNodeInput` shape for `updateLayer`. */
export const serializeRenderNode = (node: RenderNode): LayerNodeInput => {
  if (node.type === "phasor") {
    return {
      kind: node.kind || PHASOR_KIND,
      label: node.label,
      phasorAxis: node.phasorAxis,
      harmonic: node.harmonic,
      intensityAxis: node.intensityAxis,
      intensityIndex: node.intensityIndex,
      visible: node.visible,
      phasorTransfer: serializePhasorTransfer(node.transfer),
    };
  }
  if (node.type === "channel") {
    return {
      kind: node.kind || CHANNEL_KIND,
      label: node.label,
      intensityAxis: node.intensityAxis,
      intensityIndex: node.intensityIndex,
      visible: node.visible,
      transfer: serializeTransfer(node.transfer),
    };
  }
  if (node.type === "projection") {
    return {
      kind: node.kind || PROJECTION_KIND,
      label: node.label,
      mode: node.mode,
      children: node.children.map(serializeRenderNode),
    };
  }
  return {
    kind: node.kind || BLEND_KIND,
    label: node.label,
    blending: node.blending,
    children: node.children.map(serializeRenderNode),
  };
};

export const serializeRenderGraph = (root: BlendRenderNode) => ({
  root: serializeRenderNode(root),
});

/**
 * Render fields (clim / colormap / color / gamma / intensity source) derived
 * from a render graph's primary (first) channel. The current single-channel
 * renderer consumes these flat fields, so this lets the render graph drive the
 * viewer for single-channel graphs. Returns null when the layer has no graph
 * (the flat fields remain authoritative). Multi-channel compositing +
 * projection modes still require the dedicated multi-channel shader path.
 */
export const primaryChannelRenderFields = (
  graph: LayerRenderGraphFragment | null | undefined,
): {
  climMin: number | null;
  climMax: number | null;
  colormap: ColorMap | null;
  color: number[] | null;
  gamma: number | null;
  intensityAxis: string | null;
} | null => {
  const parsed = parseRenderGraph(graph);
  const primary = flattenChannels(parsed)[0];
  if (!primary) return null;
  return {
    climMin: primary.transfer.climMin,
    climMax: primary.transfer.climMax,
    colormap: primary.transfer.colormap,
    color: primary.transfer.color,
    gamma: primary.transfer.gamma,
    intensityAxis: primary.intensityAxis,
  };
};
