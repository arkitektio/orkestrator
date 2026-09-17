// @vitest-environment jsdom
// The store transitively imports app modules that read `window` at import time.
import { describe, expect, it } from "vitest";
import { createSceneStore } from "./sceneStore";
import { TIME_DIM, type DimExtent } from "../model/dimExtents";
import type { SceneFragment } from "@/mikro-next/api/graphql";

/** The least a scene can be and still build a store: no layers, no world. */
const emptyScene = () =>
  ({
    id: "1",
    preferredView: "TWO_D",
    layers: [],
    worldCoordinateSystem: null,
  }) as unknown as SceneFragment;

const store = () => createSceneStore({ scene: emptyScene() });

const extents = (maxIndex: number): DimExtent[] => [
  { dim: TIME_DIM, maxIndex, defaultIndex: maxIndex },
];

describe("setLayerDimExtents", () => {
  it("stores what a layer published", () => {
    const api = store();
    api.getState().setLayerDimExtents("a", extents(9));
    expect(api.getState().layerDimExtents).toEqual({ a: extents(9) });
  });

  /**
   * The guard `TrackLayerCard` and `DimSliderPanel` depend on. Publishers run
   * this from an effect on every geometry reload and rebuild the array each
   * time; without a STRUCTURAL compare the record would get a fresh identity per
   * reload and re-render every card for a sibling's load (P17).
   */
  it("keeps the same array reference when the published value is unchanged", () => {
    const api = store();
    api.getState().setLayerDimExtents("a", extents(9));
    const first = api.getState().layerDimExtents;
    api.getState().setLayerDimExtents("a", extents(9));
    expect(api.getState().layerDimExtents).toBe(first);
    expect(api.getState().layerDimExtents.a).toBe(first.a);
  });

  it("republishes when the value actually moved", () => {
    const api = store();
    api.getState().setLayerDimExtents("a", extents(9));
    const first = api.getState().layerDimExtents;
    api.getState().setLayerDimExtents("a", extents(10));
    expect(api.getState().layerDimExtents).not.toBe(first);
    expect(api.getState().layerDimExtents.a?.[0].maxIndex).toBe(10);
  });

  it("clears on null — a hidden or unmounted layer keeps no slider alive", () => {
    const api = store();
    api.getState().setLayerDimExtents("a", extents(9));
    api.getState().setLayerDimExtents("a", null);
    expect(api.getState().layerDimExtents).toEqual({});
  });

  it("treats an empty list as a clear, not as an entry offering nothing", () => {
    const api = store();
    api.getState().setLayerDimExtents("a", extents(9));
    api.getState().setLayerDimExtents("a", []);
    expect(api.getState().layerDimExtents).toEqual({});
  });

  it("clearing an absent layer is a no-op, not a republish", () => {
    const api = store();
    const before = api.getState().layerDimExtents;
    api.getState().setLayerDimExtents("nonesuch", null);
    expect(api.getState().layerDimExtents).toBe(before);
  });

  it("keeps layers independent: one publisher does not disturb another", () => {
    const api = store();
    api.getState().setLayerDimExtents("a", extents(9));
    api.getState().setLayerDimExtents("b", extents(4));
    api.getState().setLayerDimExtents("a", null);
    expect(api.getState().layerDimExtents).toEqual({ b: extents(4) });
  });
});

/**
 * The placement preview (COORDINATE_SYSTEMS.md §1 R1a), exercised through the
 * store so the interplay with `syncSceneLayers` is covered: a preview must
 * survive an unrelated re-emission and must drop the moment the server
 * re-places the layer — which is exactly when a saved registration lands.
 */
describe("setPlacementPreview", () => {
  const SHIFT_X = [
    [1, 0, 0, 10],
    [0, 1, 0, 0],
    [0, 0, 1, 0],
    [0, 0, 0, 1],
  ];

  const pointLayer = (version: number, tx: number) => ({
    __typename: "PointLayer",
    id: "p",
    name: "spots",
    visible: true,
    pathToWorld: [{ inverted: false, transformation: { id: "e1", version } }],
    asAffine: {
      inputAxes: ["y", "x"],
      outputAxes: ["y", "x"],
      total: true,
      matrix: [
        [1, 0, 0],
        [0, 1, tx],
      ],
    },
  });

  const sceneWith = (layer: unknown) =>
    createSceneStore({
      scene: {
        id: "1",
        preferredView: "TWO_D",
        layers: [layer],
        worldCoordinateSystem: {
          id: "w",
          name: "world",
          axes: [
            { name: "y", type: "SPACE", order: 0 },
            { name: "x", type: "SPACE", order: 1 },
          ],
        },
      } as unknown as SceneFragment,
    });

  const tx = (api: ReturnType<typeof sceneWith>) =>
    (api.getState().sceneLayers[0] as unknown as { asAffine: { matrix: number[][] } }).asAffine.matrix[1][2];

  it("moves the layer, remembers the server base, and restores on clear", () => {
    const api = sceneWith(pointLayer(1, 5));
    expect(api.getState().setPlacementPreview(["p"], SHIFT_X).failures).toEqual([]);
    expect(tx(api)).toBe(15);
    expect(Object.keys(api.getState().placementPreviewBases)).toEqual(["p"]);

    api.getState().setPlacementPreview([], null);
    expect(tx(api)).toBe(5);
    expect(api.getState().placementPreviewBases).toEqual({});
  });

  it("survives a re-emission that did not re-place the layer", () => {
    const api = sceneWith(pointLayer(1, 5));
    api.getState().setPlacementPreview(["p"], SHIFT_X);
    api.getState().syncSceneLayers([pointLayer(1, 5)] as never);
    expect(tx(api)).toBe(15);
    expect(Object.keys(api.getState().placementPreviewBases)).toEqual(["p"]);
  });

  it("drops with its base when the saved registration arrives (version bump)", () => {
    const api = sceneWith(pointLayer(1, 5));
    api.getState().setPlacementPreview(["p"], SHIFT_X);
    // The server folded the delta into the edge: new version, new placement.
    api.getState().syncSceneLayers([pointLayer(2, 15)] as never);
    expect(tx(api)).toBe(15);
    expect(api.getState().placementPreviewBases).toEqual({});
    // A late clear must not resurrect the pre-save placement.
    api.getState().setPlacementPreview([], null);
    expect(tx(api)).toBe(15);
  });

  it("does not publish when there is nothing to change", () => {
    const api = sceneWith(pointLayer(1, 5));
    const before = api.getState().sceneLayers;
    api.getState().setPlacementPreview([], null);
    expect(api.getState().sceneLayers).toBe(before);
  });
});
