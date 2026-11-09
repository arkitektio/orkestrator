import { descriptorsOf, structure } from "@/core/smart/structure";
import type { Structure } from "@/core/types";
import { arraySelectionKey, type SliceLike } from "@/mikro/lib/lenses/lensSelection";

import { cropBoxToVoxelAabb, type CropBox } from "../../platform/coords/cropBox";
import { resolveFixedDimIndex } from "../../platform/coords/selection";
import { affineToMatrix4, physicalToVoxelZStrict } from "../../platform/coords/worldTransform";
import { collapsibleLensDims } from "../../platform/model/dimExtents";
import type { LayerState } from "../../platform/model/layerModel";
import type { DisplayMode } from "../../platform/stores/modeStore";

/**
 * What a right-click on an image layer runs on: a lens of what is on screen,
 * before it exists. Pure, so the cut is testable without a canvas.
 *
 * - **2D, "this slice"**: z pinned to the plane shown.
 * - **3D, "this selection"**: x, y and z whole — the volume drawn.
 *
 * In both, every collapsed dim (t, …) is pinned to the frame shown, and a crop
 * box narrows x, y and z to the voxels it meets.
 *
 * Everything is stated in DATASET level-0 indices, the spelling
 * `createLens(dataset:, slices:)` takes: the layer's lattice `[0, shape]` (what
 * `affineMatrix` maps to world) is that index space, and the starting point is
 * the server's own spelling of the layer's lens (`sourceSlices`, channel slice
 * included) — never the pool lens, never `lens:`-relative indices, which would
 * shift the cut by the lens' offset without an error.
 */

/**
 * What a right-click runs on:
 * - `slice` / `selection`: what is on screen (2D / 3D), the default;
 * - `channel`: the channel the layer draws, every other axis whole;
 * - `everything`: what is on screen across EVERY channel — the view's cut
 *   without its channel slice. Still only what is visible: the frame shown,
 *   the plane in 2D, the crop box. Never the whole dataset.
 */
export type RunKind = "slice" | "selection" | "channel" | "everything";

/** The scopes the float offers: the view's cut (slice or selection), the channel, everything. */
export type RunScope = "view" | "channel" | "everything";

/** One slice of the cut, all four keys spelled (`SliceInput`). */
export type RunSlice = { axis: string; start: number; stop: number; step: number };

/** One axis held to a single position, for the menu's summary line. */
export type RunPin = { axis: string; index: number };

export type LayerRunSelection = {
  /** The dataset the cut is made over. */
  datasetId: string;
  /** In dataset axis order. */
  slices: RunSlice[];
  kind: RunKind;
  /** The axes held to one position (z in 2D, the collapsed dims), in dataset order. */
  pins: RunPin[];
  /** Whether a crop box narrowed it. */
  cropped: boolean;
  /** For `everything`: which view cut it widens (a slice in 2D, a selection in 3D). */
  view?: "slice" | "selection";
};

/** The slice of a layer the cut reads (structural, so tests need no fixture). */
export type RunLayer = Pick<
  LayerState,
  "__typename" | "affineMatrix" | "xAxis" | "yAxis" | "zAxis" | "intensityAxis" | "phasorAxis" | "channelPin"
> & {
  sourceSlices: readonly SliceLike[];
  /** The render graph's channel sources: which channel(s) the layer draws. */
  channels: readonly { intensityIndex: number }[];
  lens: {
    axisNames: readonly string[];
    shape: readonly number[];
    dataset: { id: string; name?: string | null; axisNames: readonly string[]; shape: readonly number[] };
  };
};

/**
 * The layer kinds that draw ONE array lens. An rgb layer names three, a phasor
 * layer reduces its own: which of them "this slice" means is a guess, so they
 * have no layer menu.
 */
const RUNNABLE = new Set(["ImageLayer", "LabelLayer", "IntensityLayer"]);

const spelled = (slice: SliceLike, extent: number): RunSlice => ({
  axis: slice.axis,
  start: slice.start ?? 0,
  stop: slice.stop ?? extent,
  step: slice.step ?? 1,
});

export const layerRunSelection = (input: {
  layer: RunLayer;
  displayMode: DisplayMode;
  /** The flat view's world z (`viewerStore.currentZ`). */
  currentZ: number;
  /** This layer's index selections: `selectionsFor(viewerState, layerId)`. */
  selections: Readonly<Record<string, number>>;
  cropBox: CropBox | null;
}): LayerRunSelection | null => {
  const { layer, displayMode, currentZ, selections, cropBox } = input;
  if (!RUNNABLE.has(layer.__typename)) return null;

  const dataset = layer.lens.dataset;
  const extentOf = (axis: string) => Math.max(1, dataset.shape[dataset.axisNames.indexOf(axis)] ?? 1);
  const byAxis = new Map<string, RunSlice>();
  for (const slice of layer.sourceSlices) {
    if (dataset.axisNames.includes(slice.axis)) byAxis.set(slice.axis, spelled(slice, extentOf(slice.axis)));
  }
  const pinned = new Set<string>();
  const pin = (axis: string, index: number) => {
    byAxis.set(axis, { axis, start: index, stop: index + 1, step: 1 });
    pinned.add(axis);
  };

  // The frame on screen, resolved exactly as the brick pool fixes it
  // (`computeFixedIndices`): the scene's selection clamped, else the lens'
  // collapsed default. The pool lens decides WHICH dims collapse — a dim the
  // lens already pins has extent 1 there and stays as the server spelled it.
  const collapsed = collapsibleLensDims(layer.lens, [
    layer.xAxis,
    layer.yAxis,
    layer.zAxis,
    layer.intensityAxis,
    layer.phasorAxis,
  ]);
  for (const dim of collapsed) {
    // The raw slice, as the pool reads it: an absent bound and a full one
    // default to different frames.
    const raw = layer.sourceSlices.find((slice) => slice.axis === dim);
    pin(dim, resolveFixedDimIndex(raw, selections[dim], extentOf(dim)));
  }

  // The plane on screen: the same arithmetic the flat view plans its slab
  // with, null when the plane misses this layer's stack (nothing is shown).
  const zAxis = layer.zAxis;
  if (displayMode === "2D" && zAxis && extentOf(zAxis) > 1) {
    const z = physicalToVoxelZStrict(affineToMatrix4(layer.affineMatrix), currentZ, extentOf(zAxis) - 1);
    if (z === null) return null;
    const own = byAxis.get(zAxis);
    if (own && (z < own.start || z >= own.stop || (z - own.start) % own.step !== 0)) return null;
    pin(zAxis, z);
  }

  // The crop box: the cells it meets on each spatial axis, intersected with
  // what the lens keeps there (and with the pinned plane in 2D).
  if (cropBox) {
    const spatial = [layer.xAxis, layer.yAxis, layer.zAxis] as const;
    const shape = spatial.map((axis) => (axis ? extentOf(axis) : 1)) as [number, number, number];
    const aabb = cropBoxToVoxelAabb(cropBox, affineToMatrix4(layer.affineMatrix).invert(), shape);
    if (!aabb) return null;
    for (let i = 0; i < 3; i++) {
      const axis = spatial[i];
      if (!axis) continue;
      const own = byAxis.get(axis) ?? { axis, start: 0, stop: shape[i], step: 1 };
      const start = Math.max(own.start, Math.floor(aabb.min[i]));
      const stop = Math.min(own.stop, Math.ceil(aabb.max[i]));
      if (stop <= start) return null;
      if (start !== own.start || stop !== own.stop) byAxis.set(axis, { ...own, start, stop });
    }
  }

  const slices = dataset.axisNames
    .map((axis) => byAxis.get(axis))
    .filter((slice): slice is RunSlice => slice !== undefined);
  return {
    datasetId: dataset.id,
    slices,
    kind: displayMode === "2D" ? "slice" : "selection",
    pins: dataset.axisNames
      .filter((axis) => pinned.has(axis))
      .map((axis) => ({ axis, index: byAxis.get(axis)!.start })),
    cropped: cropBox !== null,
  };
};

/**
 * What the virtual lens' id starts with. Never a lens id: a run path that
 * forgot to `materialize` is refused by the server rather than run on another
 * lens (`CROP_ID_PREFIX`'s rule).
 */
export const SLICE_ID_PREFIX = "slice:";

export const ARRAY_LENS_IDENTIFIER = "@mikro/arraylens";

/** How each kind is said: "this slice", "this channel", "everything". */
export const runPhrase = (kind: RunKind): string => (kind === "everything" ? "everything" : `this ${kind}`);

/**
 * What the lens is called: "This slice of DAPI", "This channel of DAPI",
 * "All of Cells.czi" (everything is the dataset's, not the layer's).
 */
export const runLensLabel = (
  selection: Pick<LayerRunSelection, "kind" | "view">,
  layerName: string,
  datasetName?: string | null,
): string =>
  selection.kind === "everything"
    ? `This ${selection.view ?? "selection"} of ${datasetName || layerName}`
    : `This ${selection.kind} of ${layerName}`;

/**
 * The dataset index of the ONE channel the layer draws: the one its lens pins,
 * else the one every channel source of its render graph reads. Null when it
 * draws several (an rgb-like graph), or the dataset has no channel axis.
 */
export const layerChannelIndex = (layer: Pick<RunLayer, "intensityAxis" | "channelPin" | "channels">): number | null => {
  if (!layer.intensityAxis) return null;
  if (layer.channelPin != null) return layer.channelPin;
  const indices = new Set(layer.channels.map((channel) => channel.intensityIndex));
  return indices.size === 1 ? [...indices][0] : null;
};

/**
 * The layer's channel with every other axis whole. Null where it does not
 * apply — a layer kind with more than one lens, a layer drawing several
 * channels, a dataset with one channel or none.
 */
export const channelSelection = (layer: RunLayer): LayerRunSelection | null => {
  if (!RUNNABLE.has(layer.__typename)) return null;
  const dataset = layer.lens.dataset;
  const axis = layer.intensityAxis;
  const index = layerChannelIndex(layer);
  const extent = axis ? dataset.shape[dataset.axisNames.indexOf(axis)] ?? 1 : 1;
  if (!axis || index === null || extent <= 1) return null;
  return {
    datasetId: dataset.id,
    slices: [{ axis, start: index, stop: index + 1, step: 1 }],
    kind: "channel",
    pins: [{ axis, index }],
    cropped: false,
  };
};

/**
 * What is on screen across every channel: the view's cut without its channel
 * slice — the same frame, plane and crop box. Null when the view keeps every
 * channel already (it IS everything then), or there is no channel axis.
 */
export const everythingSelection = (
  view: LayerRunSelection,
  channelAxis: string | null | undefined,
): LayerRunSelection | null => {
  if (!channelAxis || !view.slices.some((slice) => slice.axis === channelAxis)) return null;
  return {
    ...view,
    slices: view.slices.filter((slice) => slice.axis !== channelAxis),
    pins: view.pins.filter((pin) => pin.axis !== channelAxis),
    kind: "everything",
    view: view.kind === "slice" ? "slice" : "selection",
  };
};

/**
 * The lens `createLens(dataset:, slices:)` would return, before it is made: an
 * array lens with the descriptors mikro says it would have
 * (`ArrayDataset.descriptorsSliced`), so the actions it fits can be listed.
 * The menu makes it when one of them runs.
 */
export const runLensObject = (
  selection: Pick<LayerRunSelection, "datasetId" | "slices">,
  label: string,
  descriptors: unknown,
): Structure =>
  structure(ARRAY_LENS_IDENTIFIER, `${SLICE_ID_PREFIX}${arraySelectionKey(selection.datasetId, selection.slices)}`, {
    label,
    descriptors: descriptorsOf(descriptors),
  });

/** "z 12 · t 3": the pins, as the summary line under the menu's title. */
export const pinSummary = (pins: readonly RunPin[]): string =>
  pins.map((pin) => `${pin.axis} ${pin.index}`).join(" · ");

/** One dataset axis as the cut keeps it, for the float's Details. */
export type KeptAxis = {
  axis: string;
  /** The dataset's extent along it. */
  extent: number;
  start: number;
  /** Exclusive. */
  stop: number;
  step: number;
  /** How many positions are kept. */
  count: number;
};

/** Every axis of the dataset, with what the cut keeps of it (all of it, when unsliced). */
export const keptAxes = (
  selection: Pick<LayerRunSelection, "slices">,
  dataset: { axisNames: readonly string[]; shape: readonly number[] },
): KeptAxis[] =>
  dataset.axisNames.map((axis, i) => {
    const extent = Math.max(1, dataset.shape[i] ?? 1);
    const slice = selection.slices.find((candidate) => candidate.axis === axis);
    const start = slice?.start ?? 0;
    const stop = slice?.stop ?? extent;
    const step = slice?.step ?? 1;
    return { axis, extent, start, stop, step, count: Math.max(0, Math.ceil((stop - start) / step)) };
  });

/** "40 × 30" / "40 × 30 × 9": the kept extent along the layer's spatial axes, x first. */
export const cutSize = (kept: readonly KeptAxis[], spatial: readonly (string | null)[]): string | null => {
  const counts = spatial
    .filter((axis): axis is string => !!axis)
    .map((axis) => kept.find((entry) => entry.axis === axis))
    .filter((entry): entry is KeptAxis => !!entry && entry.count > 1)
    .map((entry) => entry.count);
  return counts.length > 0 ? counts.join(" × ") : null;
};
