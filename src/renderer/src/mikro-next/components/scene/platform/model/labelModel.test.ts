// @vitest-environment jsdom
// (`layerModel.ts` imports enums from the generated `graphql.ts`, whose Apollo
// hooks barrel touches `window` on load.)
import { describe, expect, it } from "vitest";

import type { LabelLayerFragment } from "./layerGuards";
import { isLabelLayerState, normalizeLabelLayer } from "./layerModel";
import { LABEL_ID_CEILING, resolveLayerDataRange } from "./dataRange";
import type { SceneTransformContext } from "@/lib/scene/coords/transformGraph";

/**
 * `normalizeLabelLayer` is what lets a label mask join `LayerState` and therefore
 * the shared brick path. Everything the render graph would have decided is a
 * degenerate value here, and each one is a deliberate choice — these pin them.
 */

const SCENE: SceneTransformContext = { worldCoordinateSystem: null } as SceneTransformContext;

const labelLayer = (over: Partial<LabelLayerFragment> = {}): LabelLayerFragment =>
  ({
    __typename: "LabelLayer",
    id: "layer-1",
    kind: "LABEL",
    blending: "ADDITIVE",
    opacity: 1,
    order: 0,
    visible: true,
    pathToWorld: [],
    lens: {
      __typename: "Lens",
      id: "lens-1",
      shape: [3, 20, 512, 512],
      axisNames: ["c", "z", "y", "x"],
      renderAxes: { x: "x", y: "y", z: "z", t: null, intensity: "c", phasor: null },
      slices: [],
      dataset: {
        name: "nuclei mask",
        dataArrays: [{ store: { id: "s0", dtype: "uint16" } }],
      },
    },
    labelRender: {
      __typename: "LabelRender",
      intensityAxis: "c",
      intensityIndex: 2,
      seed: 7,
      background: 0,
      opacity: 1,
      contour: false,
      contourWidth: null,
      selected: [],
      selectionColor: null,
      showUnselected: true,
      colorBys: [],
      activeColorBy: null,
      filterBys: [],
      activeFilterBys: [],
    },
    ...over,
  }) as unknown as LabelLayerFragment;

describe("normalizeLabelLayer", () => {
  it("marks itself a label, so every downstream branch can tell", () => {
    const state = normalizeLabelLayer(labelLayer(), null, SCENE);
    expect(state.__typename).toBe("LabelLayer");
    expect(isLabelLayerState(state)).toBe(true);
  });

  it("carries NO channels, phasors or sources", () => {
    // The load-bearing degenerate value: an empty source list means the image
    // compositor draws nothing. If a label ever reached it by mistake the
    // failure is a blank layer, not a mask painted one flat wrong colour.
    const state = normalizeLabelLayer(labelLayer(), null, SCENE);
    expect(state.channels).toEqual([]);
    expect(state.phasors).toEqual([]);
    expect(state.sources).toEqual([]);
  });

  it("carries no colormap, colour or gamma", () => {
    // A colormap over ids would impose an order they do not have.
    const state = normalizeLabelLayer(labelLayer(), null, SCENE);
    expect(state.colormap).toBeNull();
    expect(state.color).toBeNull();
    expect(state.gamma).toBeNull();
  });

  it("takes the id range, not the dtype range, as its value range", () => {
    // uint16 data, but the range is the id ceiling — that is what makes the
    // 24-bit EMPTY encoding exact.
    const state = normalizeLabelLayer(labelLayer(), null, SCENE);
    expect(state.climMin).toBe(0);
    expect(state.climMax).toBe(LABEL_ID_CEILING);
  });

  it("maps the spatial axes off the lens' renderAxes like an image does", () => {
    const state = normalizeLabelLayer(labelLayer(), null, SCENE);
    expect([state.xAxis, state.yAxis, state.zAxis]).toEqual(["x", "y", "z"]);
  });

  it("leaves intensityAxis NULL even though the lens names one", () => {
    // Setting it would make buildLayerLevelGeometry allocate min(16, extent)
    // slabs per brick — 3-16x the atlas and the fetch — for channels nothing
    // draws.
    const state = normalizeLabelLayer(labelLayer(), null, SCENE);
    expect(state.intensityAxis).toBeNull();
    expect(state.phasorAxis).toBeNull();
  });

  it("pins intensityIndex as a collapsed slice on that axis instead", () => {
    const state = normalizeLabelLayer(labelLayer(), null, SCENE);
    const slice = state.lens.slices.find((s) => s.axis === "c");
    expect(slice).toMatchObject({ axis: "c", start: 2, stop: 3 });
  });

  it("replaces rather than duplicates an existing slice on that axis", () => {
    const layer = labelLayer();
    const withSlice = labelLayer({
      lens: {
        ...layer.lens,
        slices: [{ __typename: "Slice", axis: "c", start: 0, stop: 1, step: null }],
      },
    } as Partial<LabelLayerFragment>);
    const state = normalizeLabelLayer(withSlice, null, SCENE);
    const onC = state.lens.slices.filter((s) => s.axis === "c");
    expect(onC).toHaveLength(1);
    expect(onC[0]).toMatchObject({ start: 2, stop: 3 });
  });

  it("survives a layer with no labelRender at all", () => {
    // `labelRender` is nullable and a never-tuned layer has none; it must still
    // normalize, plan and stream.
    const state = normalizeLabelLayer(
      labelLayer({ labelRender: null } as Partial<LabelLayerFragment>),
      null,
      SCENE,
    );
    expect(state.__typename).toBe("LabelLayer");
    expect(state.channels).toEqual([]);
    expect(state.lens.slices).toEqual([]);
  });

  it("carries the default volume LOD it was planned with", () => {
    expect(normalizeLabelLayer(labelLayer(), 2, SCENE).defaultVolumeLOD).toBe(2);
    expect(normalizeLabelLayer(labelLayer(), null, SCENE).fixedLOD).toBeNull();
  });
});

describe("resolveLayerDataRange for a label", () => {
  it("returns the id ceiling whatever the dtype says", () => {
    for (const dtype of ["uint8", "uint16", "int32", "float32"]) {
      expect(resolveLayerDataRange({ __typename: "LabelLayer" }, dtype)).toEqual([
        0,
        LABEL_ID_CEILING,
      ]);
    }
  });

  it("leaves an image's range alone", () => {
    expect(resolveLayerDataRange({ __typename: "ImageLayer" }, "uint16")).toEqual([0, 65535]);
  });
});
