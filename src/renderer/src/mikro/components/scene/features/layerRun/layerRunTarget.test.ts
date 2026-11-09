import { describe, expect, it } from "vitest";

import {
  cutSize,
  keptAxes,
  layerChannelIndex,
  layerRunSelection,
  channelSelection,
  everythingSelection,
  pinSummary,
  runLensLabel,
  runLensObject,
  type RunLayer,
} from "./layerRunTarget";

/** A (t, c, z, y, x) dataset of 5 frames, 2 channels and 10 slices of 40 × 30. */
const AXES = ["t", "c", "z", "y", "x"];
const SHAPE = [5, 2, 10, 30, 40];

/** z stretched 2× in world: slice k's centre is at world z 2k + 1. */
const Z2 = [
  [1, 0, 0, 0],
  [0, 1, 0, 0],
  [0, 0, 2, 0],
  [0, 0, 0, 1],
];

const layer = (over: Partial<RunLayer> = {}): RunLayer => ({
  __typename: "IntensityLayer",
  affineMatrix: Z2,
  xAxis: "x",
  yAxis: "y",
  zAxis: "z",
  intensityAxis: "c",
  phasorAxis: null,
  channelPin: 1,
  channels: [{ intensityIndex: 1 }],
  // The server's lens pins channel 1; the pool lens has that slice taken out.
  sourceSlices: [{ axis: "c", start: 1, stop: 2, step: 1 }],
  lens: {
    axisNames: AXES,
    shape: SHAPE,
    dataset: { id: "ds:1", name: "Cells.czi", axisNames: AXES, shape: SHAPE },
  },
  ...over,
});

const run = (over: Partial<Parameters<typeof layerRunSelection>[0]> = {}) =>
  layerRunSelection({
    layer: layer(),
    displayMode: "2D",
    currentZ: 7, // lattice z 3.5 → slice 3
    selections: { t: 2 },
    cropBox: null,
    ...over,
  });

describe("layerRunSelection", () => {
  it("2D: the plane shown, at the frame shown, keeping the layer's channel", () => {
    expect(run()).toEqual({
      datasetId: "ds:1",
      kind: "slice",
      cropped: false,
      slices: [
        { axis: "t", start: 2, stop: 3, step: 1 },
        { axis: "c", start: 1, stop: 2, step: 1 },
        { axis: "z", start: 3, stop: 4, step: 1 },
      ],
      pins: [
        { axis: "t", index: 2 },
        { axis: "z", index: 3 },
      ],
    });
  });

  it("3D: the whole volume, still at the frame shown", () => {
    const selection = run({ displayMode: "3D" });
    expect(selection?.kind).toBe("selection");
    expect(selection?.slices).toEqual([
      { axis: "t", start: 2, stop: 3, step: 1 },
      { axis: "c", start: 1, stop: 2, step: 1 },
    ]);
  });

  it("without a scrubbed frame, the lens' own default frame", () => {
    // No selection: index 0, as the pool pins an absent slice.
    expect(run({ selections: {} })?.pins[0]).toEqual({ axis: "t", index: 0 });
  });

  it("a world-timed frame is whatever selectionsFor resolved for this layer", () => {
    expect(run({ selections: { t: 4 } })?.slices[0]).toEqual({ axis: "t", start: 4, stop: 5, step: 1 });
    // Clamped like the pool clamps it.
    expect(run({ selections: { t: 99 } })?.slices[0]).toEqual({ axis: "t", start: 4, stop: 5, step: 1 });
  });

  it("2D: nothing when the plane misses the stack", () => {
    expect(run({ currentZ: 40 })).toBeNull();
  });

  it("a crop box narrows x, y and z to the cells it meets", () => {
    const selection = run({
      displayMode: "3D",
      cropBox: { min: [4.5, 10, 2], max: [12.2, 20, 9] }, // z world 2..9 → lattice 1..4.5
    });
    expect(selection?.cropped).toBe(true);
    expect(selection?.slices).toEqual([
      { axis: "t", start: 2, stop: 3, step: 1 },
      { axis: "c", start: 1, stop: 2, step: 1 },
      { axis: "z", start: 1, stop: 5, step: 1 },
      { axis: "y", start: 10, stop: 20, step: 1 },
      { axis: "x", start: 4, stop: 13, step: 1 },
    ]);
  });

  it("the crop is intersected with what an offset lens already keeps, in dataset indices", () => {
    const offset = layer({
      sourceSlices: [
        { axis: "c", start: 1, stop: 2, step: 1 },
        { axis: "x", start: 8, stop: 30, step: 1 },
      ],
    });
    const selection = run({
      layer: offset,
      displayMode: "3D",
      cropBox: { min: [0, 0, 0], max: [12, 30, 20] },
    });
    // Not 0..12 (the box alone) nor 8..20 (the box read relative to the lens).
    expect(selection?.slices.find((slice) => slice.axis === "x")).toEqual({
      axis: "x",
      start: 8,
      stop: 12,
      step: 1,
    });
  });

  it("2D with a crop box: the plane, cut to the box", () => {
    const selection = run({ cropBox: { min: [0, 0, 0], max: [10, 10, 20] } });
    expect(selection?.slices.map((slice) => slice.axis)).toEqual(["t", "c", "z", "y", "x"]);
    expect(selection?.slices.find((slice) => slice.axis === "z")).toEqual({ axis: "z", start: 3, stop: 4, step: 1 });
  });

  it("nothing when the layer lies outside the crop box", () => {
    expect(run({ displayMode: "3D", cropBox: { min: [100, 100, 0], max: [120, 120, 20] } })).toBeNull();
  });

  it("2D: nothing when the crop box's depth misses the plane shown", () => {
    expect(run({ cropBox: { min: [0, 0, 12], max: [10, 10, 18] } })).toBeNull();
  });

  it("layers with more than one lens have no layer menu", () => {
    expect(run({ layer: layer({ __typename: "RgbLayer" }) })).toBeNull();
    expect(run({ layer: layer({ __typename: "PhasorLayer" }) })).toBeNull();
  });
});

describe("the virtual lens", () => {
  it("is an array lens whose id is never a lens id, stable per selection", () => {
    const selection = run()!;
    const lens = runLensObject(selection, runLensLabel({ kind: "slice" }, "DAPI"), { "@mikro/n_space_axes": 2 });
    expect(lens.identifier).toBe("@mikro/arraylens");
    expect(lens.id.startsWith("slice:")).toBe(true);
    expect(lens.label).toBe("This slice of DAPI");
    expect(lens.descriptors).toEqual({ "@mikro/n_space_axes": 2 });
    expect(runLensObject(run()!, "x", {}).id).toBe(lens.id);
    expect(runLensObject(run({ currentZ: 9 })!, "x", {}).id).not.toBe(lens.id);
  });

  it("summarizes its pins", () => {
    expect(pinSummary(run()!.pins)).toBe("t 2 · z 3");
  });
});

describe("what the cut keeps", () => {
  it("lists every dataset axis with its kept range, and the spatial size", () => {
    const selection = run({ displayMode: "3D", cropBox: { min: [4.5, 10, 2], max: [12.2, 20, 9] } })!;
    const kept = keptAxes(selection, { axisNames: AXES, shape: SHAPE });
    expect(kept.map((axis) => [axis.axis, axis.start, axis.stop, axis.count])).toEqual([
      ["t", 2, 3, 1],
      ["c", 1, 2, 1],
      ["z", 1, 5, 4],
      ["y", 10, 20, 10],
      ["x", 4, 13, 9],
    ]);
    expect(cutSize(kept, ["x", "y", "z"])).toBe("9 × 10 × 4");
    // 2D: the pinned z is no extent.
    expect(cutSize(keptAxes(run()!, { axisNames: AXES, shape: SHAPE }), ["x", "y", "z"])).toBe("40 × 30");
  });
});

describe("the other scopes", () => {
  it("channel: the layer's channel, every other axis whole", () => {
    expect(channelSelection(layer())).toEqual({
      datasetId: "ds:1",
      kind: "channel",
      slices: [{ axis: "c", start: 1, stop: 2, step: 1 }],
      pins: [{ axis: "c", index: 1 }],
      cropped: false,
    });
  });

  it("everything: still only what is visible — the view's cut, across every channel", () => {
    expect(everythingSelection(run()!, "c")).toEqual({
      datasetId: "ds:1",
      kind: "everything",
      view: "slice",
      cropped: false,
      slices: [
        { axis: "t", start: 2, stop: 3, step: 1 },
        { axis: "z", start: 3, stop: 4, step: 1 },
      ],
      pins: [
        { axis: "t", index: 2 },
        { axis: "z", index: 3 },
      ],
    });
    // The crop box stays.
    const cropped = everythingSelection(run({ displayMode: "3D", cropBox: { min: [0, 0, 0], max: [10, 10, 20] } })!, "c");
    expect(cropped?.view).toBe("selection");
    // The box spans the whole stack in z: z stays whole, x and y are cut.
    expect(cropped?.slices.map((slice) => slice.axis)).toEqual(["t", "y", "x"]);
  });

  it("no everything where the view keeps every channel already", () => {
    const allChannels = layer({ channelPin: null, channels: [{ intensityIndex: 0 }, { intensityIndex: 1 }], sourceSlices: [] });
    expect(everythingSelection(run({ layer: allChannels })!, "c")).toBeNull();
    expect(everythingSelection(run()!, null)).toBeNull();
  });

  it("the channel comes from the lens' pin, else the one channel the graph reads", () => {
    expect(layerChannelIndex(layer({ channelPin: null, channels: [{ intensityIndex: 0 }] }))).toBe(0);
    expect(
      layerChannelIndex(layer({ channelPin: null, channels: [{ intensityIndex: 0 }, { intensityIndex: 1 }] })),
    ).toBeNull();
  });

  it("no channel scope for a layer drawing several channels, one channel, or none", () => {
    expect(channelSelection(layer({ channelPin: null, channels: [{ intensityIndex: 0 }, { intensityIndex: 1 }] }))).toBeNull();
    const single = layer({ lens: { axisNames: AXES, shape: [5, 1, 10, 30, 40], dataset: { id: "ds:2", axisNames: AXES, shape: [5, 1, 10, 30, 40] } } });
    expect(channelSelection(single)).toBeNull();
    expect(channelSelection(layer({ intensityAxis: null }))).toBeNull();
    expect(channelSelection(layer({ __typename: "RgbLayer" }))).toBeNull();
  });

  it("labels: the view and the channel are the layer's; everything is the view's cut of the dataset", () => {
    expect(runLensLabel({ kind: "channel" }, "DAPI", "Cells.czi")).toBe("This channel of DAPI");
    expect(runLensLabel({ kind: "everything", view: "slice" }, "DAPI", "Cells.czi")).toBe("This slice of Cells.czi");
  });
});
