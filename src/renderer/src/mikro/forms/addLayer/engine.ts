/**
 * The derivation engine: what a candidate becomes, read off its lineage.
 *
 * Two layers, kept apart on purpose:
 *
 *   the GATE     which kinds the server would accept at all. Structural facts
 *                (`inferLensKinds`) plus the capability sets it answered. The
 *                gate is never widened by lineage: a crop of a segmentation is
 *                a mask to a person and not to `createLabelLayer`, and offering
 *                what the server refuses is a failed mutation, not a smart
 *                default.
 *   the RULES    evidence, each naming a kind, a weight and the node it came
 *                from. Lineage lives here: a CATEGORIZED edge up the primary
 *                chain, an object table keyed by a FIELD edge, a mesh extracted
 *                from it, a PNG it was read out of. Rules ORDER the gated kinds
 *                and explain the order; evidence for a kind outside the gate is
 *                kept as a note, shown but not selectable.
 *
 * The same evidence answers two more questions: which staged layer this
 * candidate relates to (so the picker can float "segmented from dapi.zarr"),
 * and how a new layer should look on its first frame (the next free channel
 * of a multichannel source, the colormap a staged sibling already uses).
 *
 * Pure: no runtime import from the generated api, enum members as wire values.
 */

import {
  ancestors,
  childOfEdge,
  childEdgesOf,
  descendants,
  isDereference,
  nodeOfCandidate,
  primaryChain,
  datasetKey,
  type DerivationGraph,
  type GraphEdge,
  type GraphNode,
  type NodeKey,
  type NodeKind,
} from "./spaceGraph";

// ---------------------------------------------------------------------------
// Vocabulary
// ---------------------------------------------------------------------------

/**
 * The layer kinds a lens can become, named for what you get rather than for
 * the mutation behind them. Which one is *chosen* is never asked: the engine
 * decides, and the alternatives stay behind a disclosure.
 */
export type LayerKind =
  | "LABEL"
  | "VECTOR"
  | "PHASOR"
  | "VOLUME"
  | "INTENSITY"
  | "RGB";

export const LAYER_KIND_INFO: Record<
  LayerKind,
  { title: string; description: string }
> = {
  LABEL: {
    title: "Segmentation",
    description: "Object ids, drawn as coloured regions you can click",
  },
  VECTOR: {
    title: "Vector field",
    description: "Per-voxel vectors, drawn as glyphs coloured by magnitude",
  },
  PHASOR: {
    title: "Phasor",
    description:
      "One axis reduced to a lifetime or spectral phasor, each pixel coloured by it",
  },
  VOLUME: {
    title: "Volume",
    description: "The whole stack rendered at once, projected through z",
  },
  INTENSITY: {
    title: "Image",
    description: "One channel at a time, through a colormap",
  },
  RGB: {
    title: "Colour image",
    description: "Three channels mapped to red, green and blue",
  },
};

/** Ties between equal scores break in this order. */
const PRECEDENCE: readonly LayerKind[] = [
  "LABEL",
  "VECTOR",
  "PHASOR",
  "VOLUME",
  "RGB",
  "INTENSITY",
];

/** How a table's rows are drawn. Same treatment: inferred, overridable. */
export type TableKind = "TRACK" | "POINT";

export const TABLE_KIND_INFO: Record<
  TableKind,
  { title: string; description: string }
> = {
  TRACK: {
    title: "Tracks",
    description: "Rows joined into trajectories by their track id",
  },
  POINT: {
    title: "Points",
    description: "One mark per row, at its coordinates",
  },
};

/**
 * Which lenses the server would accept as a drawable / label layer, as id sets.
 * `null` means the capability query has not answered yet — every lens is offered
 * rather than wrongly hidden, and the server stays the last word either way.
 */
export type Capabilities = {
  drawable: ReadonlySet<string>;
  labels: ReadonlySet<string>;
} | null;

/** The narrowest lens the structural predicates need. */
export type LensLike = {
  id: string;
  axisNames: readonly string[];
  shape: readonly number[];
  renderAxes?: {
    x: string;
    y: string;
    z?: string | null;
    intensity?: string | null;
    vector?: string | null;
    phasor?: string | null;
  } | null;
  dataset?: { id: string } | null;
};

export type TableLike = {
  id: string;
  columns: readonly { role: string }[];
};

// ---------------------------------------------------------------------------
// The gate: structure and capabilities
// ---------------------------------------------------------------------------

export const extentOf = (lens: LensLike, axis: string | null | undefined) => {
  if (!axis) return 0;
  const index = lens.axisNames.indexOf(axis);
  return index < 0 ? 0 : (lens.shape[index] ?? 0);
};

/**
 * Whether this lens is worth rendering as a volume.
 *
 * The z *extent*, not the presence of a z axis: `renderAxes.z` is set for
 * anything volumetric and `spec: VOLUME` "holds whenever a z axis is present,
 * even if it carries a single plane" — so both would call a single-plane stack a
 * volume, and volume-render one slice of data.
 */
export const isVolumetric = (lens: LensLike): boolean =>
  extentOf(lens, lens.renderAxes?.z) > 1;

/**
 * Whether RGB is even offerable: three channels to map to red, green and blue.
 *
 * Offerable, never inferred from shape. A three-long channel axis in microscopy
 * is three fluorescence channels far more often than it is an RGB triplet; only
 * ingest evidence (a PNG source) makes the engine lead with it.
 */
export const isRgbCapable = (lens: LensLike): boolean =>
  extentOf(lens, lens.renderAxes?.intensity) >= 3;

/**
 * Whether this lens IS a vector field a glyph can draw: a DISPLACEMENT value
 * axis of 2 or 3 components, no wider than the spatial axes. The same three
 * conditions `createVectorLayer` refuses on, asked as a predicate — and like
 * LABEL's CATEGORIZED edge, the axis type is something an author STATED, which
 * is why (unlike RGB) it is allowed to decide the inference outright.
 */
export const isVectorField = (lens: LensLike): boolean => {
  const components = extentOf(lens, lens.renderAxes?.vector);
  const spatial = lens.renderAxes?.z != null ? 3 : 2;
  return components >= 2 && components <= 3 && components <= spatial;
};

/**
 * Whether a phasor can be taken: a MICROTIME or SPECTRUM axis, which the server
 * reports as `renderAxes.phasor` — the same fact `asLayer: PHASOR` filters on,
 * so no capability set is asked for it.
 */
export const hasPhasorAxis = (lens: LensLike): boolean =>
  !!lens.renderAxes?.phasor;

/**
 * What a lens may become — the gate. In the fixed structural order the picker
 * used before lineage existed; `suggestLensKinds` reorders within it.
 *
 * A label leads only when the server says the lens is one: `asLayer: LABEL`
 * requires a primary derivation declaring CATEGORIZED, so a lens that qualifies
 * *is* a mask. Unknown capabilities are optimistic about the *set* — better to
 * let the server refuse a creation than to hide a lens the picker was merely
 * unsure about — but never about the choice, so an unconfirmed LABEL is offered
 * last.
 */
export const inferLensKinds = (
  lens: LensLike,
  capabilities: Capabilities,
): LayerKind[] => {
  const answered = capabilities !== null;
  const image = capabilities?.drawable.has(lens.id) ?? true;
  const label = capabilities?.labels.has(lens.id) ?? true;

  const kinds: LayerKind[] = [];
  if (label && answered) kinds.push("LABEL");
  // A vector field wins over every raster reading, and offers them only where
  // there is genuinely a channel axis beside the field: the server REFUSES
  // `createIntensityLayer` with the axis omitted on such a lens.
  if (isVectorField(lens)) {
    kinds.push("VECTOR");
    if (image && lens.renderAxes?.intensity) kinds.push("INTENSITY");
    return kinds;
  }
  if (image) {
    if (hasPhasorAxis(lens)) kinds.push("PHASOR");
    if (isVolumetric(lens)) kinds.push("VOLUME");
    kinds.push("INTENSITY");
    if (isRgbCapable(lens)) kinds.push("RGB");
  }
  if (label && !answered) kinds.push("LABEL");
  return kinds;
};

const TRACK_ID = "TRACK_ID";

/** Tracks when the rows can be joined into them, points otherwise. */
export const inferTableKinds = (table: TableLike): TableKind[] =>
  table.columns.some((column) => column.role === TRACK_ID)
    ? ["TRACK", "POINT"]
    : ["POINT"];

// ---------------------------------------------------------------------------
// Evidence
// ---------------------------------------------------------------------------

export type RuleId =
  | "server-label"
  | "vector-axis"
  | "phasor-axis"
  | "upstream-categorized"
  | "keyed-by-table"
  | "measured-into-table"
  | "meshed-from"
  | "rgb-source-file"
  | "z-extent"
  | "segmented-into"
  | "upstream-transformed"
  | "drawable"
  | "label-unconfirmed"
  | "parent-unresolved"
  | "measured-from"
  | "track-column";

export type EvidenceVia = { key: NodeKey; name: string; kind: NodeKind };

export type Evidence = {
  rule: RuleId;
  kind: LayerKind | TableKind | null;
  weight: number;
  summary: string;
  via?: EvidenceVia;
};

export type Suggestion = {
  kind: LayerKind;
  score: number;
  evidence: Evidence[];
};

export type IntensityDefaults = {
  intensityIndex: number;
  colormap: string;
  blending: string;
  climMin?: number | null;
  climMax?: number | null;
  gamma?: number | null;
  /** The staged layer the styling was copied from, when it was. */
  inheritedFrom?: string;
};

export type PhasorDefaults = {
  phasorAxis: string;
  harmonic: number;
  intensityAxis: string | null;
  intensityIndex: number;
  colormap: string;
  mode: string;
  weightByIntensity: boolean;
  blending: string;
};

export type LayerDefaults = {
  intensity?: IntensityDefaults;
  rgb?: { redIndex: number; greenIndex: number; blueIndex: number };
  phasor?: PhasorDefaults;
};

export type LensSuggestion = {
  /** The gated kinds, best first — what `InferredKind` offers. */
  kinds: LayerKind[];
  suggestions: Suggestion[];
  /** Evidence the gate would not let lead, and unresolved lineage. */
  notes: Evidence[];
  defaults: LayerDefaults;
  /** False while a parent lies beyond what the graph knows. */
  resolved: boolean;
};

const via = (node: GraphNode): EvidenceVia => ({
  key: node.key,
  name: node.name,
  kind: node.kind,
});

// ---------------------------------------------------------------------------
// The scene
// ---------------------------------------------------------------------------

export type StagedLayer = {
  id: string;
  name: string;
  typename: string;
  nodeKey: NodeKey;
  spaceId: string | null;
  intensityIndex?: number | null;
  colormap?: string | null;
  climMin?: number | null;
  climMax?: number | null;
  gamma?: number | null;
  blending?: string | null;
};

export type StagedScene = {
  layers: StagedLayer[];
  nodes: Set<NodeKey>;
  spaces: Set<string>;
};

/** One staged layer as `AddLayerStagedLayer` selects it. */
export type StagedLayerLike = {
  __typename: string;
  id: string;
  name?: string | null;
  blending?: string | null;
  lens?: {
    coordinateSystem?: { id: string } | null;
    dataset: { id: string; intrinsicSystem?: { id: string } | null };
  } | null;
  intensityIndex?: number | null;
  colormap?: string | null;
  climMin?: number | null;
  climMax?: number | null;
  gamma?: number | null;
  annotationCollection?: { id: string; coordinateSystem?: { id: string } | null } | null;
  tableDataset?: { id: string; coordinateSystem?: { id: string } | null } | null;
  collection?: { id: string; coordinateSystem?: { id: string } | null } | null;
};

export const emptyStaged = (): StagedScene => ({
  layers: [],
  nodes: new Set(),
  spaces: new Set(),
});

/** Which containers and spaces the scene's layers already draw. */
export const stagedFromLayers = (
  layers: readonly StagedLayerLike[],
): StagedScene => {
  const staged = emptyStaged();
  for (const layer of layers) {
    const source = stagedSourceOf(layer);
    if (!source) continue;
    staged.layers.push({
      id: layer.id,
      name: layer.name ?? "",
      typename: layer.__typename,
      nodeKey: source.nodeKey,
      spaceId: source.spaceId,
      intensityIndex: layer.intensityIndex,
      colormap: layer.colormap,
      climMin: layer.climMin,
      climMax: layer.climMax,
      gamma: layer.gamma,
      blending: layer.blending,
    });
    staged.nodes.add(source.nodeKey);
    if (source.spaceId) staged.spaces.add(source.spaceId);
  }
  return staged;
};

const stagedSourceOf = (
  layer: StagedLayerLike,
): { nodeKey: NodeKey; spaceId: string | null } | null => {
  if (layer.lens) {
    return {
      nodeKey: datasetKey(layer.lens.dataset.id),
      spaceId:
        layer.lens.coordinateSystem?.id ??
        layer.lens.dataset.intrinsicSystem?.id ??
        null,
    };
  }
  if (layer.annotationCollection) {
    return {
      nodeKey: `AnnotationCollection:${layer.annotationCollection.id}`,
      spaceId: layer.annotationCollection.coordinateSystem?.id ?? null,
    };
  }
  if (layer.tableDataset) {
    return {
      nodeKey: `TableDataset:${layer.tableDataset.id}`,
      spaceId: layer.tableDataset.coordinateSystem?.id ?? null,
    };
  }
  if (layer.collection) {
    const typename =
      layer.__typename === "NetworkLayer" ? "NetworkCollection" : "MeshCollection";
    return {
      nodeKey: `${typename}:${layer.collection.id}`,
      spaceId: layer.collection.coordinateSystem?.id ?? null,
    };
  }
  return null;
};

// ---------------------------------------------------------------------------
// Rules over a lens
// ---------------------------------------------------------------------------

const RGB_CONTENT = /^image\/(png|jpe?g)$/i;

/** How much an unstated value relation trusts what lies above it. */
const UNSTATED_DECAY = 0.6;

/** How much a witness further down the tree still says about this node. */
const WITNESS_DECAY = 0.6;

const verbOfEdge = (edge: GraphEdge): string => {
  switch (edge.valueRelation) {
    case "CATEGORIZED":
      return "segmented from";
    case "TRANSFORMED":
      return "computed from";
    case "IDENTICAL":
      return edge.kind === "IDENTITY" ? "a copy of" : "a crop of";
    default:
      return edge.kind === "UNMAPPABLE" ? "measured from" : "derived from";
  }
};

/**
 * Evidence read up the primary chain: the value domain the candidate inherited.
 *
 * CATEGORIZED makes labels and TRANSFORMED makes an intensity, and both end the
 * walk — whatever lies above a threshold is not what this data's values are.
 * IDENTICAL passes through at full weight (a crop of a mask is a mask),
 * an unstated relation passes at reduced trust, and an UNMAPPABLE edge ends
 * the walk after being read (a reconstruction from a table still declares what
 * it did to the values, but nothing above it is a picture of this one).
 */
const upstreamEvidence = (
  graph: DerivationGraph,
  node: GraphNode,
): { evidence: Evidence[]; identicalRoots: GraphNode[]; resolved: boolean } => {
  const evidence: Evidence[] = [];
  // Every node the candidate's values ARE (itself and its IDENTICAL parents):
  // where an ingest fact like a PNG source is looked for.
  const identicalRoots: GraphNode[] = [node];
  let resolved = true;
  let trust = 1;
  const through: string[] = [];

  for (const step of primaryChain(graph, node)) {
    const { edge, parent } = step;
    const suffix = through.length ? ` (through ${through.join(", ")})` : "";

    if (!parent) {
      if (graph.depth === "tree") {
        resolved = false;
        evidence.push({
          rule: "parent-unresolved",
          kind: null,
          weight: 0,
          summary: `Derived from a space this scene cannot reach — looking further up its lineage`,
        });
      }
      break;
    }

    switch (edge.valueRelation) {
      case "CATEGORIZED":
        evidence.push({
          rule: "upstream-categorized",
          kind: "LABEL",
          weight: 0.6 * trust,
          summary: `Segmented from ${parent.name}${suffix}`,
          via: via(parent),
        });
        return { evidence, identicalRoots, resolved };
      case "TRANSFORMED":
        evidence.push({
          rule: "upstream-transformed",
          kind: "INTENSITY",
          weight: 0.2 * trust,
          summary: `Computed from ${parent.name}, with new values${suffix}`,
          via: via(parent),
        });
        return { evidence, identicalRoots, resolved };
      case "IDENTICAL":
        identicalRoots.push(parent);
        through.push(`${verbOfEdge(edge)} ${parent.name}`);
        break;
      default:
        trust *= UNSTATED_DECAY;
        through.push(`derived from ${parent.name}`);
        break;
    }
    if (edge.kind === "UNMAPPABLE") break;
  }
  return { evidence, identicalRoots, resolved };
};

/** Evidence read off what was computed FROM the candidate. */
const downstreamEvidence = (
  graph: DerivationGraph,
  node: GraphNode,
): Evidence[] => {
  const evidence: Evidence[] = [];
  for (const { node: child, edge, depth } of descendants(graph, node, 3)) {
    const decay = Math.pow(WITNESS_DECAY, depth - 1);
    if (isDereference(edge, graph)) {
      evidence.push({
        rule: "keyed-by-table",
        kind: "LABEL",
        weight: 0.5 * decay,
        summary: `Its ids key a table of objects, ${child.name}`,
        via: via(child),
      });
      continue;
    }
    if (edge.kind === "UNMAPPABLE" && child.kind === "table") {
      evidence.push({
        rule: "measured-into-table",
        kind: "LABEL",
        weight: 0.3 * decay,
        summary: `Measured into ${child.name}, a table with no place for its rows`,
        via: via(child),
      });
      continue;
    }
    if (child.kind === "mesh" || child.kind === "network") {
      evidence.push({
        rule: "meshed-from",
        kind: "LABEL",
        weight: 0.15 * decay,
        summary: `${child.kind === "mesh" ? "Surfaces" : "A network"} were extracted from it: ${child.name}`,
        via: via(child),
      });
      continue;
    }
    if (edge.valueRelation === "CATEGORIZED") {
      evidence.push({
        rule: "segmented-into",
        kind: "INTENSITY",
        weight: 0.2 * decay,
        summary: `${child.name} was segmented from it, so this is the picture underneath`,
        via: via(child),
      });
    }
  }
  return evidence;
};

const structuralEvidence = (
  lens: LensLike,
  capabilities: Capabilities,
  identicalRoots: readonly GraphNode[],
): Evidence[] => {
  const evidence: Evidence[] = [];
  const answered = capabilities !== null;
  const drawable = capabilities?.drawable.has(lens.id) ?? true;

  if (answered && capabilities.labels.has(lens.id)) {
    evidence.push({
      rule: "server-label",
      kind: "LABEL",
      weight: 1,
      summary: "The server draws it as a segmentation: its values are object ids",
    });
  } else if (!answered) {
    evidence.push({
      rule: "label-unconfirmed",
      kind: "LABEL",
      weight: 0,
      summary: "Whether it is a segmentation has not been answered yet",
    });
  }
  if (isVectorField(lens)) {
    evidence.push({
      rule: "vector-axis",
      kind: "VECTOR",
      weight: 0.95,
      summary: `Its ${lens.renderAxes?.vector} axis holds displacement components`,
    });
  }
  if (hasPhasorAxis(lens)) {
    evidence.push({
      rule: "phasor-axis",
      kind: "PHASOR",
      weight: 0.9,
      summary: `Its ${lens.renderAxes?.phasor} axis can be reduced to a phasor`,
    });
  }
  const photographic = identicalRoots.find((root) =>
    root.sourceContentTypes?.some((type) => RGB_CONTENT.test(type)),
  );
  if (photographic) {
    evidence.push({
      rule: "rgb-source-file",
      kind: "RGB",
      weight: 0.7,
      summary: `Read out of a ${photographic.sourceContentTypes!.find((type) => RGB_CONTENT.test(type))!.replace("image/", "").toUpperCase()} file${photographic.key !== identicalRoots[0].key ? `, via ${photographic.name}` : ""}`,
      via: photographic.key !== identicalRoots[0].key ? via(photographic) : undefined,
    });
  }
  if (isVolumetric(lens)) {
    evidence.push({
      rule: "z-extent",
      kind: "VOLUME",
      weight: 0.5,
      summary: `${extentOf(lens, lens.renderAxes?.z)} planes along ${lens.renderAxes?.z}`,
    });
  }
  if (drawable) {
    evidence.push({
      rule: "drawable",
      kind: "INTENSITY",
      weight: 0.1,
      summary: "A picture with an x and a y axis",
    });
  }
  return evidence;
};

/**
 * What a lens becomes, ranked and explained.
 *
 * The gate (`inferLensKinds`) fixes the set; every rule that fires scores a
 * kind, the gated kinds sort by score and then by precedence, and an
 * unconfirmed LABEL keeps its place at the end whatever the lineage says —
 * leading with "mask" for the length of one round trip is a wrong default, not
 * a generous one.
 */
export const suggestLensKinds = (
  graph: DerivationGraph,
  lens: LensLike,
  capabilities: Capabilities,
  staged: StagedScene = emptyStaged(),
): LensSuggestion => {
  const gate = inferLensKinds(lens, capabilities);
  const node = lens.dataset ? nodeOfCandidate(graph, { __typename: "Lens", id: lens.id, dataset: lens.dataset }) : undefined;

  const upstream = node
    ? upstreamEvidence(graph, node)
    : { evidence: [], identicalRoots: [], resolved: true };
  const evidence: Evidence[] = [
    ...structuralEvidence(lens, capabilities, upstream.identicalRoots),
    ...upstream.evidence,
    ...(node ? downstreamEvidence(graph, node) : []),
  ];

  const answered = capabilities !== null;
  const allowed = new Set<LayerKind>(gate);
  const scored = new Map<LayerKind, Suggestion>();
  const notes: Evidence[] = [];
  for (const item of evidence) {
    if (item.kind === null || !isLayerKind(item.kind) || !allowed.has(item.kind)) {
      notes.push(item);
      continue;
    }
    const entry = scored.get(item.kind) ?? { kind: item.kind, score: 0, evidence: [] };
    entry.score += item.weight;
    entry.evidence.push(item);
    scored.set(item.kind, entry);
  }
  for (const kind of gate) {
    if (!scored.has(kind)) scored.set(kind, { kind, score: 0, evidence: [] });
  }

  const suggestions = [...scored.values()].sort((a, b) => {
    // An unconfirmed label sits last, whatever it scored.
    const aPinned = !answered && a.kind === "LABEL";
    const bPinned = !answered && b.kind === "LABEL";
    if (aPinned !== bPinned) return aPinned ? 1 : -1;
    return (
      b.score - a.score ||
      PRECEDENCE.indexOf(a.kind) - PRECEDENCE.indexOf(b.kind)
    );
  });

  return {
    kinds: suggestions.map((suggestion) => suggestion.kind),
    suggestions,
    notes,
    defaults: lensDefaults(graph, lens, node, staged),
    resolved: upstream.resolved,
  };
};

const isLayerKind = (kind: string): kind is LayerKind => kind in LAYER_KIND_INFO;

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

/**
 * One colormap per channel of a multichannel source, in the order a
 * fluorescence composite is usually read. Additive blending makes them a
 * composite rather than a stack of opaque pictures.
 */
export const CHANNEL_CYCLE: readonly string[] = [
  "CYAN",
  "MAGENTA",
  "GREEN",
  "RED",
  "BLUE",
  "ORANGE",
  "PURPLE",
  "WHITE",
];

const stagedIntensityLayers = (staged: StagedScene, key: NodeKey) =>
  staged.layers.filter(
    (layer) => layer.nodeKey === key && layer.intensityIndex != null,
  );

/** The channels of this dataset the scene already draws one at a time. */
const stagedChannelsOf = (staged: StagedScene, key: NodeKey): Set<number> =>
  new Set(
    stagedIntensityLayers(staged, key).map((layer) => layer.intensityIndex!),
  );

const lensDefaults = (
  graph: DerivationGraph,
  lens: LensLike,
  node: GraphNode | undefined,
  staged: StagedScene,
): LayerDefaults => {
  const defaults: LayerDefaults = {};
  const channels = extentOf(lens, lens.renderAxes?.intensity);

  // The next channel nobody has staged yet, styled for a composite.
  const used = node ? stagedChannelsOf(staged, node.key) : new Set<number>();
  let index = 0;
  while (channels > 1 && index < channels - 1 && used.has(index)) index += 1;
  const intensity: IntensityDefaults =
    channels > 1
      ? { intensityIndex: index, colormap: CHANNEL_CYCLE[index % CHANNEL_CYCLE.length], blending: "ADDITIVE" }
      : { intensityIndex: 0, colormap: "GREY", blending: "NORMAL" };

  // A staged layer over the same values already has a look: IDENTICAL means
  // "value statistics transfer across the edge", so contrast limits come with
  // the colormap; TRANSFORMED keeps only the colour.
  if (node) {
    let statistics = true;
    for (const step of primaryChain(graph, node)) {
      if (!step.parent) break;
      if (step.edge.valueRelation === "CATEGORIZED") break;
      if (step.edge.valueRelation === "TRANSFORMED") statistics = false;
      if (step.edge.valueRelation == null && step.edge.kind !== "IDENTITY") break;
      const sibling = stagedIntensityLayers(staged, step.parent.key).find(
        (layer) => layer.intensityIndex === intensity.intensityIndex && layer.colormap,
      );
      if (sibling) {
        intensity.colormap = sibling.colormap!;
        intensity.inheritedFrom = sibling.name || step.parent.name;
        if (sibling.blending) intensity.blending = sibling.blending;
        if (statistics) {
          intensity.climMin = sibling.climMin;
          intensity.climMax = sibling.climMax;
          intensity.gamma = sibling.gamma;
        }
        break;
      }
      if (!statistics) break;
    }
  }
  defaults.intensity = intensity;

  if (isRgbCapable(lens)) defaults.rgb = { redIndex: 0, greenIndex: 1, blueIndex: 2 };

  if (hasPhasorAxis(lens)) {
    // The same first look `newPhasorNode` gives a phasor render node: a hue
    // ramp over phase, weighted by intensity.
    defaults.phasor = {
      phasorAxis: lens.renderAxes!.phasor!,
      harmonic: 1,
      intensityAxis: lens.renderAxes?.intensity ?? null,
      intensityIndex: 0,
      colormap: "RAINBOW",
      mode: "PHASE",
      weightByIntensity: true,
      blending: "NORMAL",
    };
  }
  return defaults;
};

// ---------------------------------------------------------------------------
// Tables
// ---------------------------------------------------------------------------

/** Roles whose values are a quantity, coloured through a continuous ramp. */
const MEASURE_ROLES = new Set(["COORDINATE", "ATTRIBUTE"]);

export type TableSuggestion = {
  kinds: TableKind[];
  evidence: Evidence[];
  defaults: { colormap?: string };
};

/**
 * How a table's rows are drawn. The kind comes from the declared columns
 * (tracks need a TRACK_ID); lineage only explains where the rows came from,
 * and the colormap follows the colour column's role — a measure gets a ramp,
 * a category gets the server's qualitative default.
 */
export const suggestTableKinds = (
  graph: DerivationGraph,
  table: TableLike,
  colorColumnRole: string | null = null,
): TableSuggestion => {
  const kinds = inferTableKinds(table);
  const evidence: Evidence[] = [];
  if (kinds[0] === "TRACK") {
    evidence.push({
      rule: "track-column",
      kind: "TRACK",
      weight: 1,
      summary: "A track id column joins the rows into trajectories",
    });
  }
  const node = graph.nodes.get(`TableDataset:${table.id}`);
  if (node) {
    for (const { node: parent, edge } of ancestors(graph, node, 1)) {
      evidence.push({
        rule: "measured-from",
        kind: kinds[0],
        weight: 0,
        summary: `${capitalize(verbOfEdge(edge))} ${parent.name}`,
        via: via(parent),
      });
    }
  }
  return {
    kinds,
    evidence,
    defaults:
      colorColumnRole && MEASURE_ROLES.has(colorColumnRole)
        ? { colormap: "VIRIDIS" }
        : {},
  };
};

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

// ---------------------------------------------------------------------------
// Relation to the scene
// ---------------------------------------------------------------------------

export type RelationKind = "derived" | "source" | "sibling" | "partial" | "staged";

export type Relation = {
  kind: RelationKind;
  depth: number;
  via: { key: NodeKey; name: string };
  summary: string;
  /** Higher sorts earlier. */
  rank: number;
};

const stagedNameOf = (staged: StagedScene, key: NodeKey, fallback: string) =>
  staged.layers.find((layer) => layer.nodeKey === key)?.name || fallback;

/**
 * How a candidate relates to what the scene already draws, nearest first:
 * derived from a staged layer's source ("segmented from dapi.zarr"), the
 * source of one, a sibling under the same parent, the same dataset with
 * channels still unstaged, or simply already there — which ranks below no
 * relation at all, so a fully staged source sinks rather than floats.
 */
export const relationToScene = (
  graph: DerivationGraph,
  node: GraphNode,
  staged: StagedScene,
  channels = 1,
): Relation | null => {
  const found: Relation[] = [];

  if (staged.nodes.has(node.key)) {
    const shown = stagedChannelsOf(staged, node.key).size;
    if (channels > 1 && shown > 0 && shown < channels) {
      found.push({
        kind: "partial",
        depth: 0,
        via: { key: node.key, name: node.name },
        summary: `${shown} of ${channels} channels shown`,
        rank: 50,
      });
    } else {
      found.push({
        kind: "staged",
        depth: 0,
        via: { key: node.key, name: node.name },
        summary: "already in this scene",
        // Below the unrelated (0): what is already there sinks to the bottom.
        rank: -10,
      });
    }
  }

  const up = ancestors(graph, node, 4).find((reached) => staged.nodes.has(reached.node.key));
  if (up) {
    const name = stagedNameOf(staged, up.node.key, up.node.name);
    found.push({
      kind: "derived",
      depth: up.depth,
      via: { key: up.node.key, name },
      summary:
        up.depth === 1
          ? `${verbOfEdge(up.edge)} ${name}`
          : `derived from ${name}, ${up.depth} steps up`,
      rank: 100 - 10 * (up.depth - 1),
    });
  }

  const down = descendants(graph, node, 4).find((reached) => staged.nodes.has(reached.node.key));
  if (down) {
    const name = stagedNameOf(staged, down.node.key, down.node.name);
    found.push({
      kind: "source",
      depth: down.depth,
      via: { key: down.node.key, name },
      summary:
        down.depth === 1 ? `the source of ${name}` : `the source of ${name}, ${down.depth} steps down`,
      rank: 90 - 10 * (down.depth - 1),
    });
  }

  const parent = primaryChain(graph, node, 1)[0]?.parent;
  if (parent) {
    const sibling = [...staged.nodes]
      .filter((key) => key !== node.key)
      .map((key) => graph.nodes.get(key))
      .find(
        (other) => other && primaryChain(graph, other, 1)[0]?.parent?.key === parent.key,
      );
    if (sibling) {
      const name = stagedNameOf(staged, sibling.key, sibling.name);
      found.push({
        kind: "sibling",
        depth: 1,
        via: { key: sibling.key, name },
        summary: `shares its source, ${parent.name}, with ${name}`,
        rank: 70,
      });
    }
  }

  return found.sort((a, b) => b.rank - a.rank)[0] ?? null;
};

/** How many child edges a node has — the picker's "N things derived" caption. */
export const childCountOf = (graph: DerivationGraph, node: GraphNode): number =>
  childEdgesOf(graph, node).filter((edge) => childOfEdge(graph, edge)).length;
