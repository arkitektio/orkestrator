import { Blending, ColorMap, ProjectionMode } from "@/mikro-next/api/graphql";
import {
  ImageLayerFragment,
  IntensityLayerFragment,
  LabelLayerFragment,
  PhasorLayerFragment,
  RgbLayerFragment,
  isIntensityLayer,
  isLabelLayer,
  isPhasorLayer,
  isRgbLayer,
  type BrickLayerFragment,
} from "./layerGuards";
import { resolveLayerDataRange } from "./dataRange";
import {
  CHANNEL_KIND,
  ChannelRenderNode,
  PHASOR_KIND,
  PhasorRenderNode,
  SourceRenderNode,
  flattenChannels,
  flattenPhasors,
  flattenSources,
  parsePhasorTransfer,
  resolveLayerGraph,
  resolveProjectionMode,
} from "./renderGraph";
import { resolveIntensityAxis, resolvePhasorAxis } from "./dims";
import { composeLayerAffine, type SceneTransformContext } from "@/mikro-next/lib/coords/transformGraph";

export type { SceneTransformContext };

/**
 * The scene renderer's per-layer view-model. Extracted from `platform/stores/sceneStore.ts`
 * so the store holds state, and this module owns the pure derivation from the
 * server fragment into render-ready state.
 *
 * BRICK-BACKED layers are tracked here — images and label masks. Both are a Lens
 * over an array, so both want the same zarr stores, octree planning, residency
 * and probe; they differ only in how a sampled value becomes colour. The other
 * layer types (Annotation/Point/Track/Mesh) render through separate paths and
 * are consumed straight off their fragments.
 *
 * A structural SUPERSET with a `__typename` discriminant, deliberately not a
 * discriminated union: ~30 modules read `.channels` / `.climMin` / `.projection`
 * off a `LayerState`, and every one of them would have to narrow first for the
 * sake of fields it will only ever meet on an image. The superset works because
 * `renderGraph` is already optional on the image fragment and the label
 * selection spreads the identical `SceneLens` — the label arm is a subset of the
 * image arm plus `labelRender`.
 *
 * The price is that a label carries the render-graph-derived fields as
 * degenerate values. `normalizeLabelLayer` picks them to be HONEST rather than
 * plausible — `channels: []` above all, so a label that ever reached the image
 * compositor by mistake draws nothing instead of something wrong.
 */
/**
 * The recipe shapes a specialised material can compile against.
 *
 *  - `"intensity"` — ONE channel source, plain window+gamma. The material can
 *    drop the slot loop, the source-kind tap, the blend switch, invert and
 *    per-slot opacity, and read four plain uniforms instead of two 16-element
 *    `vec4` uniform arrays.
 *  - `"rgb"` — THREE channel sources tinted pure red/green/blue over ONE
 *    window. The material can drop the colormap LUT tap entirely: a pure basis
 *    tint means three taps assemble a vec3 directly.
 *  - `"phasor"` — ONE phasor source and no channels. The material can drop the
 *    channel branch.
 *  - `"graph"` — anything else. The general compositor, unchanged.
 */
export type RenderKind = "graph" | "intensity" | "rgb" | "phasor";

/** A transfer with nothing in it the specialised scalar path cannot express. */
const isPlainScalarTransfer = (transfer: ChannelRenderNode["transfer"]): boolean =>
  !transfer.stops &&
  !(transfer.colorStops && transfer.colorStops.length >= 2) &&
  transfer.invert !== true &&
  (transfer.opacity === null || transfer.opacity === undefined || transfer.opacity === 1);

/** RGB tints, in slot order. A layer must match these EXACTLY to earn `"rgb"`. */
const RGB_TINTS: readonly (readonly [number, number, number])[] = [
  [255, 0, 0],
  [0, 255, 0],
  [0, 0, 255],
];

const isTint = (color: number[] | null, tint: readonly [number, number, number]): boolean =>
  !!color && color.length >= 3 && color[0] === tint[0] && color[1] === tint[1] && color[2] === tint[2];

/**
 * What shape these sources ACTUALLY form.
 *
 * Deliberately structural rather than a typename test — see `LayerState.renderKind`.
 * Every arm is a conjunction of things the specialised material relies on, so
 * adding a capability to a material means adding its precondition HERE, and a
 * server field that breaks one silently demotes the layer instead of
 * mis-rendering it.
 */
export const resolveRenderKind = (
  sources: readonly SourceRenderNode[],
  blend: Blending,
): RenderKind => {
  // ADDITIVE is required even at ONE source. The compositor seeds its
  // accumulator to vec3(1) for MULTIPLICATIVE and to vec3(0) otherwise, so with
  // a single slot additive and normal both collapse to `color * weight` while
  // multiplicative does NOT (`mix(vec3(1), color, weight)`). The specialised
  // emitters write the collapsed form, so a multiplicative layer must keep the
  // general path — which renders it exactly as it renders today.
  const collapsible = blend !== Blending.Multiplicative;
  if (sources.length === 1 && sources[0].type === "channel") {
    const channel = sources[0];
    if (collapsible && channel.visible && isPlainScalarTransfer(channel.transfer))
      return "intensity";
    return "graph";
  }
  if (sources.length === 1 && sources[0].type === "phasor") {
    return collapsible && sources[0].visible ? "phasor" : "graph";
  }
  if (sources.length === 3 && blend === Blending.Additive) {
    const channels = sources.filter(
      (source): source is ChannelRenderNode => source.type === "channel",
    );
    if (channels.length !== 3) return "graph";
    const [first] = channels;
    const sharedWindow = channels.every(
      (channel) =>
        channel.transfer.climMin === first.transfer.climMin &&
        channel.transfer.climMax === first.transfer.climMax,
    );
    const plainTints = channels.every(
      (channel, index) =>
        channel.visible &&
        isPlainScalarTransfer(channel.transfer) &&
        // A named colormap would override the tint, so it must be absent.
        channel.transfer.colormap === null &&
        (channel.transfer.gamma === null || channel.transfer.gamma === 1) &&
        isTint(channel.transfer.color, RGB_TINTS[index]),
    );
    if (sharedWindow && plainTints) return "rgb";
  }
  return "graph";
};

export type LayerState = Omit<ImageLayerFragment, "__typename"> & {
  __typename:
    | "ImageLayer"
    | "LabelLayer"
    | "IntensityLayer"
    | "RgbLayer"
    | "PhasorLayer";
  /**
   * Which RECIPE SHAPE this layer's sources form — the promise a specialised
   * material may compile against.
   *
   * EARNED, never assumed from `__typename`. `resolveRenderKind` inspects the
   * flattened `sources` and answers what they actually are, so an `ImageLayer`
   * whose graph happens to be one plain channel gets `"intensity"` too, and an
   * `IntensityLayer` that a future server field gives something the specialised
   * material cannot express falls back to `"graph"` — where it renders
   * correctly and slower. That fallback is the whole safety story: a
   * specialised material is never reachable for a layer it cannot express.
   *
   * Read ONLY by material selection in `features/bricks`. Every other consumer
   * treats it as opaque and works off `sources`/`channels` as before.
   */
  renderKind: RenderKind;
  /**
   * How a label mask's ids become colour. Present only on a label layer, and the
   * one field that says which kind this is beyond the `__typename` — narrow with
   * `isLabelLayerState` rather than testing it, so the intent reads.
   */
  labelRender?: LabelLayerFragment["labelRender"];
  fixedLOD?: number | null;
  defaultVolumeLOD?: number | null;
  visible?: boolean;
  /**
   * Voxel→world spatial affine (x, y, z rows), composed CLIENT-SIDE from the
   * scene's coordinate-transformation graph (`transformGraph.ts`) — the server
   * no longer carries a flat `affineMatrix` on layers. Null = identity.
   */
  affineMatrix: number[][] | null;
  /**
   * Axis-name mapping, from the lens' server-derived `renderAxes` (axis TYPES
   * decide, so a dim cannot be both spatial and the channel axis anymore).
   * Kept as flat fields because ~15 consumers (slice signatures, probes,
   * panels, planners) read them by these names.
   */
  xAxis: string | null;
  yAxis: string | null;
  zAxis: string | null;
  tAxis: string | null;
  intensityAxis: string | null;
  /**
   * The axis the layer's phasor nodes reduce (a MICROTIME/SPECTRUM axis). Null
   * when the graph has no phasor node — and when it is set, the axis is NOT
   * collapsible: the phasor needs every bin, so there is no dim slider for it
   * (`sliceSignature.collapsibleDims`), and the brick repack reduces it into
   * g/s/intensity slabs instead of pinning one index.
   */
  phasorAxis: string | null;
  /** Channel sources flattened from the layer's render graph (tree order). */
  channels: ChannelRenderNode[];
  /** Phasor sources flattened from the layer's render graph (tree order). */
  phasors: PhasorRenderNode[];
  /**
   * Every pixel-producing leaf in tree order — channels and phasors together.
   * This is the compositor's slot list: slot i of the shader's source loop is
   * `sources[i]`.
   */
  sources: SourceRenderNode[];
  /** Blend mode of the render graph's root, used to composite channels. */
  blend: Blending;
  /** Projection mode (from a ProjectionNode in the graph, else MIP) for 3D. */
  projection: ProjectionMode;
  /**
   * Primary-channel render fields, DERIVED from the render graph (the single
   * rendering truth) and kept flat for the single-channel 3D shader path and
   * display chrome. The server no longer carries these on ImageLayer — they
   * come exclusively from the graph here.
   */
  climMin: number;
  climMax: number;
  colormap: ColorMap | null;
  color: number[] | null;
  gamma: number | null;
};

/**
 * Resolve an `ImageLayerFragment` (+ its default volume LOD) into `LayerState`:
 * flatten the render graph (or a default single-channel fallback) into a channel
 * list, and fold the primary channel's transfer onto the flat fields for the
 * single-channel render path. The render graph is the only source of these
 * fields — the server-side flat properties were removed.
 */
export const normalizeLayer = (
  layer: ImageLayerFragment,
  defaultVolumeLod: number | null,
  scene: SceneTransformContext,
): LayerState => {
  const graph = resolveLayerGraph(layer);
  const channels = flattenChannels(graph);
  const phasors = flattenPhasors(graph);
  const sources = flattenSources(graph);
  const primary = channels[0];
  const transfer = primary?.transfer;
  // Clim is stored in absolute base-native units; null = "full range". Resolve
  // null against the layer's base-native data range so the flat single-channel
  // fields (used by the 3D shader path + CPU probe march) stay concrete.
  const dtype = layer.lens?.dataset?.dataArrays?.[0]?.store?.dtype;
  let baseMin = 0;
  let baseMax = 1;
  if (dtype) {
    try {
      [baseMin, baseMax] = resolveLayerDataRange(layer, dtype);
    } catch {
      // keep [0,1] fallback
    }
  }
  const renderAxes = layer.lens.renderAxes;
  return {
    ...layer,
    climMin: transfer?.climMin ?? baseMin,
    climMax: transfer?.climMax ?? baseMax,
    colormap: transfer?.colormap ?? null,
    color: transfer?.color ?? null,
    gamma: transfer?.gamma ?? null,
    affineMatrix: composeLayerAffine(scene, layer),
    xAxis: renderAxes?.x ?? null,
    yAxis: renderAxes?.y ?? null,
    zAxis: renderAxes?.z ?? null,
    tAxis: renderAxes?.t ?? null,
    intensityAxis: resolveIntensityAxis(primary?.intensityAxis, renderAxes),
    phasorAxis: resolvePhasorAxis(phasors[0]?.phasorAxis, renderAxes),
    channels,
    phasors,
    sources,
    blend: graph.blending,
    projection: resolveProjectionMode(graph),
    // A graph layer EARNS a fast path too, when its graph happens to be one
    // plain channel — which is the common single-channel ImageLayer written
    // before the fixed-shape kinds existed.
    renderKind: resolveRenderKind(sources, graph.blending),
    fixedLOD: null,
    defaultVolumeLOD: defaultVolumeLod,
    visible: true,
  };
};

/** Which arm of the superset this is. Prefer it to testing `labelRender`. */
export const isLabelLayerState = (layer: LayerState): boolean =>
  layer.__typename === "LabelLayer";

// Placeability lives in its own leaf module (`./placeable`) so DOM-free
// pure-core code can import it; re-exported here for the model's consumers.
export { isPlaceable, unplaceableReason, type UnplaceableReason } from "./placeable";

/**
 * The `LayerState` a label mask normalizes to.
 *
 * Everything the render graph would have decided is filled with a degenerate
 * value, because a label map HAS no render graph — it has one source and no
 * compositing tree, and clim/gamma/colormaps/projections are all meaningless over
 * object ids. The choices, and why each is the honest one:
 *
 *  - `channels: []` / `phasors: []` / `sources: []` — an empty source list means
 *    the image compositor draws NOTHING. If a label ever reached it by mistake
 *    (a missed branch, a future merged pass) the failure is a blank layer, not a
 *    mask painted one flat wrong colour.
 *  - `climMin`/`climMax` from the dtype range. Nothing normalizes a label, but
 *    these also feed the pool's value range, and `resolveLayerDataRange` is where
 *    the id-preserving range is decided for both the planner and the allocator.
 *  - `colormap`/`color`/`gamma` null — a colormap over ids would impose an order
 *    they do not have. Ids become colour by hashing, or by a `colorBys` entry.
 *  - `projection: Mip`, `blend: Additive` — placeholders the label material never
 *    reads. MIP over ids is meaningless (the largest id wins, which is an
 *    arbitrary object); the 3D label path resolves FIRST HIT instead and decides
 *    that itself.
 *
 * `intensityAxis` is deliberately NULL even though `labelRender.intensityIndex`
 * names a channel. Setting it would make `buildLayerLevelGeometry` allocate
 * `min(16, extent)` slabs per brick — 3-16x the atlas and the fetch — for
 * channels nothing draws. The chosen index is pinned as a collapsed slice
 * instead, which is what the slice signature, the fixed-index resolution, the
 * probe's coordinate mapping and the dim sliders all already read.
 */
export const normalizeLabelLayer = (
  layer: LabelLayerFragment,
  defaultVolumeLod: number | null,
  scene: SceneTransformContext,
): LayerState => {
  const dtype = layer.lens?.dataset?.dataArrays?.[0]?.store?.dtype;
  let baseMin = 0;
  let baseMax = 1;
  if (dtype) {
    try {
      [baseMin, baseMax] = resolveLayerDataRange(layer, dtype);
    } catch {
      // keep [0,1] fallback
    }
  }
  const renderAxes = layer.lens.renderAxes;
  const intensityAxis = resolveIntensityAxis(
    layer.labelRender?.intensityAxis ?? undefined,
    renderAxes,
  );
  return {
    ...layer,
    // Pin the mask's channel as a COLLAPSED slice rather than as the layer's
    // intensity axis (see the docblock). A scene-wide dim slider can still
    // override it — `resolveFixedDimIndex` lets a selection win over a slice —
    // which is the right behaviour: `intensityIndex` is the default this mask
    // opens on, not a lock.
    lens:
      intensityAxis && layer.labelRender
        ? {
            ...layer.lens,
            slices: [
              ...(layer.lens.slices ?? []).filter((slice) => slice.axis !== intensityAxis),
              {
                __typename: "Slice" as const,
                axis: intensityAxis,
                start: layer.labelRender.intensityIndex,
                stop: layer.labelRender.intensityIndex + 1,
                step: null,
              },
            ],
          }
        : layer.lens,
    climMin: baseMin,
    climMax: baseMax,
    colormap: null,
    color: null,
    gamma: null,
    affineMatrix: composeLayerAffine(scene, layer),
    xAxis: renderAxes?.x ?? null,
    yAxis: renderAxes?.y ?? null,
    zAxis: renderAxes?.z ?? null,
    tAxis: renderAxes?.t ?? null,
    // NOT the mask's channel axis — see the docblock.
    intensityAxis: null,
    phasorAxis: null,
    channels: [],
    phasors: [],
    sources: [],
    blend: Blending.Additive,
    projection: ProjectionMode.Mip,
    // A label never takes an image fast path: its ids become colour through
    // their OWN material, which none of the specialised arms describe.
    renderKind: "graph",
    fixedLOD: null,
    defaultVolumeLOD: defaultVolumeLod,
    visible: true,
  } as LayerState;
};

/**
 * Base-native data range for a lens-backed layer, resolved defensively.
 *
 * Lifted out of the normalizers because all five of them need the identical
 * `[0, 1]`-on-failure fallback, and a fifth hand-rolled copy of a try/catch is
 * how one of them quietly starts disagreeing with the pool key — which resolves
 * the SAME range and must not diverge (`octree/poolKey.ts`).
 */
const resolveBaseRange = (layer: BrickLayerFragment): [number, number] => {
  const dtype = layer.lens?.dataset?.dataArrays?.[0]?.store?.dtype;
  if (!dtype) return [0, 1];
  try {
    return resolveLayerDataRange(layer, dtype);
  } catch {
    return [0, 1];
  }
};

/**
 * The fields every lens-backed `LayerState` shares, derived once.
 *
 * `normalizeLayer` predates this and still spells them inline; the three
 * fixed-shape normalizers below share it so a change to the axis mapping or the
 * affine composition cannot land in one and miss the others.
 */
const lensLayerCommon = (
  layer: BrickLayerFragment,
  defaultVolumeLod: number | null,
  scene: SceneTransformContext,
) => {
  const renderAxes = layer.lens.renderAxes;
  return {
    affineMatrix: composeLayerAffine(scene, layer),
    xAxis: renderAxes?.x ?? null,
    yAxis: renderAxes?.y ?? null,
    zAxis: renderAxes?.z ?? null,
    tAxis: renderAxes?.t ?? null,
    fixedLOD: null,
    defaultVolumeLOD: defaultVolumeLod,
    visible: true,
  };
};

/**
 * The `LayerState` an `IntensityLayer` normalizes to.
 *
 * The whole point of the type: the recipe's shape is DECLARED, so there is no
 * graph to walk. Where `normalizeLayer` runs `resolveLayerGraph` → a recursive
 * `parseRenderNode` over a four-deep expanded union, then four separate tree
 * walks (`flattenChannels`, `flattenPhasors`, `flattenSources`,
 * `resolveProjectionMode`) plus `parseCurveStops`' filter+sort, this builds one
 * object literal.
 *
 * `climMin`/`climMax` are raw dtype units exactly as `TransferFunction.climMin`
 * is, so `climToUnit` and the pool's value range are unaffected; null still
 * means "full range" and is resolved against the base-native range for the flat
 * single-channel fields.
 *
 * `projectionMode` null → MIP. A projection collapses z rather than compositing
 * anything, which is why `createVolumeLayer` returns an `IntensityLayer` with
 * this set rather than a kind of its own.
 */
export const normalizeIntensityLayer = (
  layer: IntensityLayerFragment,
  defaultVolumeLod: number | null,
  scene: SceneTransformContext,
): LayerState => {
  const [baseMin, baseMax] = resolveBaseRange(layer);
  const channel: ChannelRenderNode = {
    type: "channel",
    kind: CHANNEL_KIND,
    label: layer.name ?? null,
    intensityAxis: layer.intensityAxis ?? null,
    intensityIndex: layer.intensityIndex,
    visible: true,
    transfer: {
      climMin: layer.climMin ?? null,
      climMax: layer.climMax ?? null,
      // Aliased in the fragment: `colormap` is non-null here and nullable on
      // point/track layers, so the two cannot share a response key.
      colormap: layer.intensityColormap,
      // The channel TINT, exactly as an ImageLayer's channel node carries one. A
      // monochrome acquisition shown in magenta is still ONE scalar source, so
      // it stays the `"intensity"` recipe — `resolveRenderKind` deliberately
      // does not test the tint — and it stays a colormap-atlas ROW, because
      // `buildColormapAtlas` bakes a tint into the row exactly as it bakes a
      // named ramp. That is what lets the specialised material keep its single
      // LUT tap and change nothing to support this.
      color: layer.color ?? null,
      colorStops: null,
      stops: null,
      gamma: layer.gamma ?? null,
      opacity: null,
      invert: null,
    },
  };
  const sources = [channel];
  const blend = layer.blending;
  return {
    ...layer,
    ...lensLayerCommon(layer, defaultVolumeLod, scene),
    climMin: layer.climMin ?? baseMin,
    climMax: layer.climMax ?? baseMax,
    colormap: layer.intensityColormap,
    color: layer.color ?? null,
    gamma: layer.gamma ?? null,
    intensityAxis: resolveIntensityAxis(
      layer.intensityAxis ?? undefined,
      layer.lens.renderAxes,
    ),
    phasorAxis: null,
    channels: sources,
    phasors: [],
    sources,
    blend,
    projection: layer.projectionMode ?? ProjectionMode.Mip,
    renderKind: resolveRenderKind(sources, blend),
  } as LayerState;
};

/**
 * The `LayerState` an `RgbLayer` normalizes to: three channels over ONE window.
 *
 * The three planes are three views of one acquisition, so the server carries a
 * single `climMin`/`climMax` for all of them — per-plane contrast would
 * misrepresent the image. The tints are pure basis vectors rather than named
 * colormaps, which is exactly what lets the specialised material skip the LUT
 * tap: `resolveBaseColorRgb` reads `transfer.color`, and a pure basis means the
 * three taps assemble a vec3 directly.
 *
 * A plane index may repeat (a two-channel acquisition shown as R=G); nothing
 * here forbids it, and the compositor handles it as three ordinary slots.
 */
export const normalizeRgbLayer = (
  layer: RgbLayerFragment,
  defaultVolumeLod: number | null,
  scene: SceneTransformContext,
): LayerState => {
  const [baseMin, baseMax] = resolveBaseRange(layer);
  const plane = (
    label: string,
    intensityIndex: number,
    color: readonly [number, number, number],
  ): ChannelRenderNode => ({
    type: "channel",
    kind: CHANNEL_KIND,
    label,
    intensityAxis: layer.intensityAxis ?? null,
    intensityIndex,
    visible: true,
    transfer: {
      climMin: layer.climMin ?? null,
      climMax: layer.climMax ?? null,
      colormap: null,
      color: [...color],
      colorStops: null,
      stops: null,
      gamma: null,
      opacity: null,
      invert: null,
    },
  });
  const sources = [
    plane("Red", layer.redIndex, RGB_TINTS[0]),
    plane("Green", layer.greenIndex, RGB_TINTS[1]),
    plane("Blue", layer.blueIndex, RGB_TINTS[2]),
  ];
  // Across the three planes the compositing is addition — an RGB image IS the
  // sum of its basis-tinted planes. The layer's own `blending` describes how it
  // sits over the layers BELOW it, which is a different question the compositor
  // asks separately.
  const blend = Blending.Additive;
  return {
    ...layer,
    ...lensLayerCommon(layer, defaultVolumeLod, scene),
    climMin: layer.climMin ?? baseMin,
    climMax: layer.climMax ?? baseMax,
    // Flat fields describe the PRIMARY channel, as on an image layer.
    colormap: null,
    color: [...RGB_TINTS[0]],
    gamma: null,
    intensityAxis: resolveIntensityAxis(
      layer.intensityAxis ?? undefined,
      layer.lens.renderAxes,
    ),
    phasorAxis: null,
    channels: sources,
    phasors: [],
    sources,
    blend,
    projection: ProjectionMode.Mip,
    renderKind: resolveRenderKind(sources, blend),
  } as LayerState;
};

/**
 * The `LayerState` a `PhasorLayer` normalizes to.
 *
 * `phasorAxis` is the load-bearing field, and it is why this cannot be left to
 * a generic path: it is what makes `levelGeometry` lay out g/s/intensity slabs,
 * what excludes the axis from `sliceSignature`'s `collapsibleDims` (the phasor
 * needs every bin, so there is no dim slider for it) and what makes the brick
 * repack REDUCE the axis rather than pin one index. Get it wrong and the layer
 * either fetches a single bin or explodes into phantom channels.
 *
 * `phasorRender == null` normalizes to NO sources — the honest-degenerate rule
 * `normalizeLabelLayer` follows: a layer the compositor cannot describe draws
 * nothing rather than something wrong.
 */
export const normalizePhasorLayer = (
  layer: PhasorLayerFragment,
  defaultVolumeLod: number | null,
  scene: SceneTransformContext,
): LayerState => {
  const [baseMin, baseMax] = resolveBaseRange(layer);
  const render = layer.phasorRender;
  const phasor: PhasorRenderNode | null = render
    ? {
        type: "phasor",
        kind: PHASOR_KIND,
        label: layer.name ?? null,
        phasorAxis: render.phasorAxis,
        harmonic: render.harmonic,
        intensityAxis: render.intensityAxis ?? null,
        intensityIndex: render.intensityIndex,
        visible: true,
        transfer: parsePhasorTransfer(render.transfer),
      }
    : null;
  const sources = phasor ? [phasor] : [];
  const blend = layer.blending;
  return {
    ...layer,
    ...lensLayerCommon(layer, defaultVolumeLod, scene),
    // The photon-count transfer, folded flat the way an image layer folds its
    // primary channel's.
    climMin: phasor?.transfer.intensity.climMin ?? baseMin,
    climMax: phasor?.transfer.intensity.climMax ?? baseMax,
    colormap: phasor?.transfer.colormap ?? null,
    color: null,
    gamma: phasor?.transfer.intensity.gamma ?? null,
    intensityAxis: resolveIntensityAxis(
      render?.intensityAxis ?? undefined,
      layer.lens.renderAxes,
    ),
    phasorAxis: resolvePhasorAxis(phasor?.phasorAxis, layer.lens.renderAxes),
    channels: [],
    phasors: phasor ? [phasor] : [],
    sources,
    blend,
    projection: ProjectionMode.Mip,
    renderKind: resolveRenderKind(sources, blend),
  } as LayerState;
};

/**
 * Normalize ANY brick-backed layer fragment.
 *
 * The single dispatcher both `sceneStore` call sites go through — construction
 * and `syncSceneLayers`. They used to spell a two-arm ternary each; with five
 * arms, two copies is how they drift.
 */
export const normalizeBrickLayer = (
  layer: BrickLayerFragment,
  defaultVolumeLod: number | null,
  scene: SceneTransformContext,
): LayerState => {
  if (isLabelLayer(layer)) return normalizeLabelLayer(layer, defaultVolumeLod, scene);
  if (isIntensityLayer(layer)) return normalizeIntensityLayer(layer, defaultVolumeLod, scene);
  if (isRgbLayer(layer)) return normalizeRgbLayer(layer, defaultVolumeLod, scene);
  if (isPhasorLayer(layer)) return normalizePhasorLayer(layer, defaultVolumeLod, scene);
  return normalizeLayer(layer, defaultVolumeLod, scene);
};
