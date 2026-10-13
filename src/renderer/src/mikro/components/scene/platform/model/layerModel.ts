import { Blending, ColorMap, ProjectionMode } from "@/mikro/api/graphql";
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
  type GraphChannelContext,
} from "./renderGraph";
import { resolveIntensityAxis, resolvePhasorAxis } from "./dims";
import { readGains } from "./whiteBalanceGains";
import { composeLatticeAffine, type SceneTransformContext } from "@/core/data/scene/coords/transformGraph";
import { pinnedIndex, type LensLookup } from "@/mikro/lib/lenses/lensSelection";
import { poolLensOf } from "./channelLens";

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

/** An rgb plane's opacity is its white-balance gain: unset, or finite and > 0. */
const isWhiteBalanceGain = (opacity: number | null | undefined): boolean =>
  opacity === null || opacity === undefined || (Number.isFinite(opacity) && opacity > 0);

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
        // Per-slot opacity is ALLOWED here, unlike the intensity arm: on an
        // rgb layer it is the white-balance gain of that primary
        // (`normalizeRgbLayer`), and the rgb emitters multiply it in exactly
        // as the general path's `weight = opacity · norm` does.
        isPlainScalarTransfer({ ...channel.transfer, opacity: null }) &&
        isWhiteBalanceGain(channel.transfer.opacity) &&
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
   * LATTICE→world spatial affine (x, y, z rows), composed CLIENT-SIDE from the
   * scene's coordinate-transformation graph (`composeLatticeAffine`) — the
   * server no longer carries a flat `affineMatrix` on layers. Null = identity.
   *
   * Its input is the corner-anchored lattice the layer renders, `[0, shape]`:
   * voxel `k` is the cell `[k, k + 1)` and its centre, `k + 0.5`, lands where
   * the server puts index `k`. Never apply it to a bare voxel index.
   */
  affineMatrix: number[][] | null;
  /**
   * Axis-name mapping, from the layer's server-derived `renderAxes` (axis TYPES
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
   * The channel the layer's OWN lens pins, as a dataset index — null when that
   * lens keeps more than one channel (an rgb layer's parent, a graph layer's).
   *
   * `lens` below is the POOL lens: the server's lens with the channel slice
   * taken out (`channelLens.ts`), so that every channel of a dataset shares one
   * brick pool. This is where the slice went. It is what a source that names no
   * lens of its own reads, and where a new source starts.
   */
  channelPin: number | null;
  /**
   * The lens' slices exactly as the server spelled them, channel slice
   * included. For the two things that must speak the server's language again:
   * which positions an editor may offer along the channel axis, and the base a
   * new channel lens is cut from (`ensureChannelLens`).
   */
  sourceSlices: ImageLayerFragment["lens"]["slices"];
  /**
   * True while a render-graph source names a lens nothing is known about yet,
   * so its channel index is the fallback rather than the answer. Cleared by
   * `sceneStore.refreshLensSelections` once the registry has it.
   */
  lensPending?: boolean;
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

const NO_LENSES: LensLookup = () => undefined;

/**
 * Where a lens-backed layer's channel lives now that the server spells it as a
 * slice of the lens: which axis is the channel axis (the layer's
 * `renderAxes.intensity`, guarded like every other reading of it), the position
 * the lens pins it to, and the lens the brick engine is handed instead
 * (`poolLensOf`: the same lens without that slice, shared by every channel of
 * the dataset).
 */
const channelOf = (layer: BrickLayerFragment) => {
  const axis = resolveIntensityAxis(undefined, layer.renderAxes);
  return {
    axis,
    pin: pinnedIndex(layer.lens.slices, axis),
    lens: poolLensOf(layer.lens, axis),
  };
};

/**
 * How a render graph's source nodes become channel indices for THIS layer.
 *
 * A node names a single-channel lens by id; the registry says what that lens
 * selects, and the position it pins the channel axis to is the index. A node
 * that names no lens reads the layer's own selection. An id the registry does
 * not know yet (the lookup is still in flight) or that belongs to another
 * dataset takes the same fallback, and `pending()` reports the first case so
 * the store can re-derive once it lands.
 */
const graphChannelContext = (
  channel: ReturnType<typeof channelOf>,
  datasetId: string,
  lookup: LensLookup,
): GraphChannelContext & { pending: () => boolean } => {
  let pending = false;
  const fallback = channel.pin ?? 0;
  return {
    intensityAxis: channel.axis,
    indexOf: (lens) => {
      if (!lens) return fallback;
      const selection = lookup(lens);
      if (!selection) {
        pending = true;
        return fallback;
      }
      if (selection.kind !== "array" || selection.dataset !== datasetId) return fallback;
      return pinnedIndex(selection.slices, channel.axis) ?? fallback;
    },
    pending: () => pending,
  };
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
  lookup: LensLookup = NO_LENSES,
): LayerState => {
  const channel = channelOf(layer);
  const context = graphChannelContext(channel, layer.lens.dataset.id, lookup);
  const graph = resolveLayerGraph({ ...layer, channelPin: channel.pin }, context);
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
  const renderAxes = layer.renderAxes;
  return {
    ...layer,
    lens: channel.lens,
    channelPin: channel.pin,
    sourceSlices: layer.lens.slices,
    lensPending: context.pending(),
    climMin: transfer?.climMin ?? baseMin,
    climMax: transfer?.climMax ?? baseMax,
    colormap: transfer?.colormap ?? null,
    color: transfer?.color ?? null,
    gamma: transfer?.gamma ?? null,
    affineMatrix: composeLatticeAffine(scene, layer),
    xAxis: renderAxes?.x ?? null,
    yAxis: renderAxes?.y ?? null,
    zAxis: renderAxes?.z ?? null,
    tAxis: renderAxes?.t ?? null,
    intensityAxis: channel.axis,
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
 * `intensityAxis` is deliberately NULL even though the mask's lens pins a
 * channel. Setting it would make `buildLayerLevelGeometry` allocate
 * `min(16, extent)` slabs per brick — 3-16x the atlas and the fetch — for
 * channels nothing draws. The lens' own slice on that axis stays IN the lens
 * instead (the one layer kind whose channel slice is not taken out, see
 * `channelLens.ts`): a collapsed slice is what the slice signature, the
 * fixed-index resolution and the probe's coordinate mapping all already read.
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
  const renderAxes = layer.renderAxes;
  return {
    ...layer,
    // The mask's channel stays a COLLAPSED slice of its lens rather than the
    // layer's intensity axis (see the docblock); only the spelling is made
    // canonical, so a mask over a whole array keys like one.
    lens: poolLensOf(layer.lens, null),
    channelPin: null,
    sourceSlices: layer.lens.slices,
    climMin: baseMin,
    climMax: baseMax,
    colormap: null,
    color: null,
    gamma: null,
    affineMatrix: composeLatticeAffine(scene, layer),
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
  const renderAxes = layer.renderAxes;
  const channel = channelOf(layer);
  return {
    lens: channel.lens,
    channelPin: channel.pin,
    sourceSlices: layer.lens.slices,
    intensityAxis: channel.axis,
    // The RAW layer: the affine is composed from the lens' own placement edges
    // and reduces to the spatial axes, so the channel slice never reaches it.
    affineMatrix: composeLatticeAffine(scene, layer),
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
  const common = lensLayerCommon(layer, defaultVolumeLod, scene);
  const channel: ChannelRenderNode = {
    type: "channel",
    kind: CHANNEL_KIND,
    label: layer.name ?? null,
    intensityAxis: common.intensityAxis,
    // Which channel is drawn is the lens' selection: the position it pins the
    // channel axis to. A lens with no channel axis, or one channel, draws 0.
    intensityIndex: common.channelPin ?? 0,
    lens: layer.lens.id,
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
    ...common,
    climMin: layer.climMin ?? baseMin,
    climMax: layer.climMax ?? baseMax,
    colormap: layer.intensityColormap,
    color: layer.color ?? null,
    gamma: layer.gamma ?? null,
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
 *
 * `whiteBalance` lands on the three planes' slot OPACITY: the general
 * compositor's contribution is `tint · opacity · norm`, which is exactly a
 * per-primary gain after the window, and the rgb material multiplies the same
 * scalars in (`rgbUniforms.ts`). A neutral gain stays null, so an unbalanced
 * layer normalizes exactly as it did before the field existed.
 */
export const normalizeRgbLayer = (
  layer: RgbLayerFragment,
  defaultVolumeLod: number | null,
  scene: SceneTransformContext,
): LayerState => {
  const [baseMin, baseMax] = resolveBaseRange(layer);
  const gains = readGains(layer.whiteBalance);
  const common = lensLayerCommon(layer, defaultVolumeLod, scene);
  // Each plane is a crop of the layer's lens with the channel axis at one
  // position; that position is the plane. A plane lens that pins nothing (no
  // channel axis to pin) falls back to its slot, as an unset index did.
  const plane = (
    label: string,
    lens: RgbLayerFragment["redLens"],
    slot: number,
    color: readonly [number, number, number],
    gain: number,
  ): ChannelRenderNode => ({
    type: "channel",
    kind: CHANNEL_KIND,
    label,
    intensityAxis: common.intensityAxis,
    intensityIndex: pinnedIndex(lens?.slices, common.intensityAxis) ?? slot,
    lens: lens?.id ?? null,
    visible: true,
    transfer: {
      climMin: layer.climMin ?? null,
      climMax: layer.climMax ?? null,
      colormap: null,
      color: [...color],
      colorStops: null,
      stops: null,
      gamma: null,
      opacity: gain === 1 ? null : gain,
      invert: null,
    },
  });
  const sources = [
    plane("Red", layer.redLens, 0, RGB_TINTS[0], gains[0]),
    plane("Green", layer.greenLens, 1, RGB_TINTS[1], gains[1]),
    plane("Blue", layer.blueLens, 2, RGB_TINTS[2], gains[2]),
  ];
  // Across the three planes the compositing is addition — an RGB image IS the
  // sum of its basis-tinted planes. The layer's own `blending` describes how it
  // sits over the layers BELOW it, which is a different question the compositor
  // asks separately.
  const blend = Blending.Additive;
  return {
    ...layer,
    ...common,
    climMin: layer.climMin ?? baseMin,
    climMax: layer.climMax ?? baseMax,
    // Flat fields describe the PRIMARY channel, as on an image layer.
    colormap: null,
    color: [...RGB_TINTS[0]],
    gamma: null,
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
  const common = lensLayerCommon(layer, defaultVolumeLod, scene);
  const phasor: PhasorRenderNode | null = render
    ? {
        type: "phasor",
        kind: PHASOR_KIND,
        label: layer.name ?? null,
        phasorAxis: render.phasorAxis,
        harmonic: render.harmonic,
        intensityAxis: common.intensityAxis,
        // The channel whose photons are counted is the lens' selection, as on
        // an intensity layer.
        intensityIndex: common.channelPin ?? 0,
        lens: layer.lens.id,
        visible: true,
        transfer: parsePhasorTransfer(render.transfer),
      }
    : null;
  const sources = phasor ? [phasor] : [];
  const blend = layer.blending;
  return {
    ...layer,
    ...common,
    // The photon-count transfer, folded flat the way an image layer folds its
    // primary channel's.
    climMin: phasor?.transfer.intensity.climMin ?? baseMin,
    climMax: phasor?.transfer.intensity.climMax ?? baseMax,
    colormap: phasor?.transfer.colormap ?? null,
    color: null,
    gamma: phasor?.transfer.intensity.gamma ?? null,
    phasorAxis: resolvePhasorAxis(phasor?.phasorAxis, layer.renderAxes),
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
 *
 * `lookup` resolves the lenses a render graph names by bare id (the session's
 * lens registry, through `sceneStore`). Only the graph arm reads it: the
 * fixed-shape kinds carry their lenses as objects.
 */
export const normalizeBrickLayer = (
  layer: BrickLayerFragment,
  defaultVolumeLod: number | null,
  scene: SceneTransformContext,
  lookup: LensLookup = NO_LENSES,
): LayerState => {
  if (isLabelLayer(layer)) return normalizeLabelLayer(layer, defaultVolumeLod, scene);
  if (isIntensityLayer(layer)) return normalizeIntensityLayer(layer, defaultVolumeLod, scene);
  if (isRgbLayer(layer)) return normalizeRgbLayer(layer, defaultVolumeLod, scene);
  if (isPhasorLayer(layer)) return normalizePhasorLayer(layer, defaultVolumeLod, scene);
  return normalizeLayer(layer, defaultVolumeLod, scene, lookup);
};
