// @vitest-environment jsdom
// (`layerModel.ts` imports enums from the generated `graphql.ts`, whose Apollo
// hooks barrel touches `window` on load.)
import { describe, expect, it } from "vitest";

import { Blending, ColorMap } from "@/mikro/api/graphql";
import type { SceneTransformContext } from "@/core/data/scene/coords/transformGraph";
import type { BrickLayerFragment } from "../../../platform/model/layerGuards";
import { normalizeBrickLayer, type LayerState } from "../../../platform/model/layerModel";
import { buildSliceSignature } from "../../../platform/model/sliceSignature";
import { resolveLayerDataRange } from "../../../platform/model/dataRange";
import { lensFamilyKey } from "../../../platform/model/channelLens";
import { buildPlanInputSignature } from "./planInputSignature";
import { buildPoolDerivation, deriveLayerStructure } from "../residency/poolLifecycle";
import type { LayerNodePlan } from "./nodePlanning";

/**
 * THE regression this file exists to make impossible.
 *
 * The server names which channel a layer draws through the layer's LENS: four
 * channels of one acquisition are four lenses with four ids, four slice lists,
 * four sets of anchors and four crop edges. Before, they were one lens and four
 * indices, and the whole one-layer-per-channel economy rests on that: one brick
 * pool, one atlas, one plan traversal and one merged raymarch pass for the
 * image, whatever number of layers looks at it.
 *
 * A pool is keyed by content (`poolKey.ts`), and two of the key's inputs are
 * read off the lens — the slice signature and the value range. Left alone, each
 * channel lens answers both differently and the image splits four ways: four
 * atlases with the device budget divided by four, four traversals, four passes.
 *
 * These tests run the REAL path from server fragments to pool key
 * (`normalizeBrickLayer` → `deriveLayerStructure` → `buildPoolDerivation`), on
 * float32 data on purpose: a uint8/uint16 range is the dtype's and would agree
 * across channels by accident.
 */

const SCENE: SceneTransformContext = { worldCoordinateSystem: null } as SceneTransformContext;

const AXES = ["c", "z", "y", "x"];
const SHAPE = [4, 36, 1024, 1024];

/** Each channel's own histogram range: all different, as on a real acquisition. */
const CHANNEL_RANGE = [
  { min: 0, max: 500 },
  { min: 12, max: 30000 },
  { min: 3, max: 4000 },
  { min: -20, max: 900 },
];
const anchor = (channel: number) => ({
  id: `anchor-${channel}`,
  coordinates: { c: channel },
  valueHistogram: { id: `histogram-${channel}`, ...CHANNEL_RANGE[channel] },
});

const DATA_ARRAYS = [{ level: 0, store: { id: "store-0", dtype: "float32" } }];

/** One dataset object shared by every lens over it, as the cache hands it out. */
const DATASET = {
  id: "dataset-1",
  name: "acquisition",
  axisNames: AXES,
  shape: SHAPE,
  dataArrays: DATA_ARRAYS,
  // The whole lens sees every channel's anchor: the dataset-wide range.
  fullLens: { id: "lens-whole", activeAnchors: [0, 1, 2, 3].map(anchor) },
};

const WHOLE_LENS = {
  __typename: "ArrayLens",
  id: "lens-whole",
  shape: SHAPE,
  axisNames: AXES,
  slices: [],
  coordinateSystem: { id: "cs-intrinsic" },
  toParent: null,
  dataset: DATASET,
  activeAnchors: [0, 1, 2, 3].map(anchor),
};

/** Channel `index` of the dataset: its own id, space, slice and anchors. */
const channelLens = (index: number, extraSlices: object[] = []) => ({
  __typename: "ArrayLens",
  id: `lens-c${index}`,
  shape: [1, 36, 1024, 1024],
  axisNames: AXES,
  slices: [
    { __typename: "Slice", axis: "c", start: index, stop: index + 1, step: 1 },
    ...extraSlices,
  ],
  coordinateSystem: { id: `cs-c${index}` },
  toParent: null,
  dataset: DATASET,
  // A single-channel lens sees ONLY its channel's anchor.
  activeAnchors: [anchor(index)],
});

const HEAD = {
  name: null,
  blending: Blending.Additive,
  opacity: 1,
  order: 0,
  visible: true,
  pathToWorld: [],
  asAffine: null,
  renderAxes: { x: "x", y: "y", z: "z", t: null, intensity: "c", phasor: null, vector: null },
};

const intensityLayer = (index: number, lens: object = channelLens(index)) =>
  ({
    ...HEAD,
    __typename: "IntensityLayer",
    id: `layer-c${index}`,
    kind: "INTENSITY",
    lens,
    intensityColormap: ColorMap.Viridis,
    color: null,
    climMin: null,
    climMax: null,
    gamma: null,
    projectionMode: null,
  }) as unknown as BrickLayerFragment;

const imageLayer = () =>
  ({
    ...HEAD,
    __typename: "ImageLayer",
    id: "layer-image",
    kind: "IMAGE",
    lens: WHOLE_LENS,
    renderGraph: null,
  }) as unknown as BrickLayerFragment;

const labelLayer = (index: number) =>
  ({
    ...HEAD,
    __typename: "LabelLayer",
    id: `layer-mask-c${index}`,
    kind: "LABEL",
    lens: channelLens(index),
    labelRender: null,
  }) as unknown as BrickLayerFragment;

const ARRAYS: Record<string, { shape: number[]; chunks: number[]; dtype: string }> = {
  "store-0": { shape: SHAPE, chunks: [1, 36, 256, 256], dtype: "float32" },
};

const normalize = (fragment: BrickLayerFragment): LayerState =>
  normalizeBrickLayer(fragment, null, SCENE);

/** The pool a layer lands in, by the manager's own derivation. */
const poolKeyOf = (layer: LayerState): string => {
  const structure = deriveLayerStructure(layer, "3D", new Map(), (storeId) => ARRAYS[storeId]);
  if (!structure) throw new Error(`layer ${layer.id} derived no structure`);
  const plan = { mode: "3D", sliceSignature: buildSliceSignature(layer) } as LayerNodePlan;
  return buildPoolDerivation(layer, plan, structure).poolKey;
};

const channels = [0, 1, 2, 3].map((index) => normalize(intensityLayer(index)));

describe("four channel lenses over one dataset", () => {
  it("land in ONE brick pool", () => {
    expect(new Set(channels.map(poolKeyOf)).size).toBe(1);
  });

  it("share that pool with an image layer over the whole lens", () => {
    // A composite and its per-channel siblings over the same array: still one
    // atlas, as `poolKey.test.ts` pins for the key in isolation.
    expect(poolKeyOf(normalize(imageLayer()))).toBe(poolKeyOf(channels[0]));
  });

  it("agree on the slice signature — the channel slice is not in it", () => {
    const signatures = channels.map((layer) => buildSliceSignature(layer));
    expect(new Set(signatures).size).toBe(1);
    expect(signatures[0]).toBe(buildSliceSignature(normalize(imageLayer())));
    expect(JSON.parse(signatures[0]).slices).toEqual([]);
  });

  it("agree on the value range — the DATASET's, not the channel's own", () => {
    const ranges = channels.map((layer) => resolveLayerDataRange(layer, "float32"));
    for (const range of ranges) expect(range).toEqual([-20, 30000]);
    expect(resolveLayerDataRange(normalize(imageLayer()), "float32")).toEqual([-20, 30000]);
  });

  it("plan as ONE equivalence class: same pool, same placement", () => {
    // `nodePlanTracker` groups layers by `poolKey#planInput`; one class is one
    // DFS traversal, and its members merge into one raymarch pass.
    const classes = channels.map(
      (layer) =>
        `${poolKeyOf(layer)}#${buildPlanInputSignature(layer.affineMatrix, layer.fixedLOD, undefined)}`,
    );
    expect(new Set(classes).size).toBe(1);
  });

  it("still draw four DIFFERENT channels", () => {
    // What the slice turned into: the uniform each layer taps its slab with.
    expect(channels.map((layer) => layer.channels[0].intensityIndex)).toEqual([0, 1, 2, 3]);
    expect(channels.map((layer) => layer.channelPin)).toEqual([0, 1, 2, 3]);
    // And each layer is still its own lens to everything that names it.
    expect(channels.map((layer) => layer.lens.id)).toEqual([
      "lens-c0",
      "lens-c1",
      "lens-c2",
      "lens-c3",
    ]);
  });

  it("head ONE run of layer cards", () => {
    expect(new Set(channels.map((layer) => lensFamilyKey(layer.lens))).size).toBe(1);
  });

  it("would split four ways without the model boundary (the test has teeth)", () => {
    // The same layers with the server's lens put back: this is what the brick
    // engine would be handed if normalization stopped taking the slice out.
    const raw = channels.map((layer, index) => ({
      ...layer,
      lens: { ...layer.lens, slices: channelLens(index).slices },
    })) as LayerState[];
    expect(new Set(raw.map(poolKeyOf)).size).toBe(4);
  });
});

describe("spellings and neighbours", () => {
  it("keys a lens that spells out its whole axes like one that omits them", () => {
    // Whether the server pads a sliced lens with explicit full ranges is its
    // business; one selection must not become two pools over it.
    const padded = normalize(
      intensityLayer(
        1,
        channelLens(1, [
          { __typename: "Slice", axis: "z", start: 0, stop: 36, step: 1 },
          { __typename: "Slice", axis: "y", start: 0, stop: 1024, step: 1 },
          { __typename: "Slice", axis: "x", start: 0, stop: 1024, step: 1 },
        ]),
      ),
    );
    expect(poolKeyOf(padded)).toBe(poolKeyOf(channels[0]));
  });

  it("keeps a real crop in a pool of its own", () => {
    // A slice that DOES cut something still changes what a brick holds.
    const cropped = normalize(
      intensityLayer(
        1,
        channelLens(1, [{ __typename: "Slice", axis: "z", start: 4, stop: 5, step: 1 }]),
      ),
    );
    expect(poolKeyOf(cropped)).not.toBe(poolKeyOf(channels[0]));
  });

  it("keeps the channels of a crop together", () => {
    const crop = (index: number) =>
      normalize(
        intensityLayer(
          index,
          channelLens(index, [{ __typename: "Slice", axis: "z", start: 4, stop: 5, step: 1 }]),
        ),
      );
    expect(poolKeyOf(crop(0))).toBe(poolKeyOf(crop(3)));
  });

  it("keeps a label mask over one channel out of the image's pool", () => {
    // A mask allocates ONE slab and pins its channel as a collapsed slice, so
    // it neither joins the image's pool nor shares one across channels.
    const mask = normalize(labelLayer(2));
    expect(poolKeyOf(mask)).not.toBe(poolKeyOf(channels[0]));
    expect(poolKeyOf(mask)).not.toBe(poolKeyOf(normalize(labelLayer(1))));
  });
});
