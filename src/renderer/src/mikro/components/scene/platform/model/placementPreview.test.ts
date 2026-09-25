import { describe, expect, it } from "vitest";
import { hostLayersKey, toHostLayers } from "./hostLayers";
import {
  applyPlacementPreview,
  prunePreviewBases,
  type PlacementPreviewArgs,
  type PreviewPlacement,
} from "./placementPreview";

type Raw = { id: string; asAffine?: PreviewPlacement | null; marker?: string };
type State = Raw & { affineTag?: string };

const placement = (tx: number): PreviewPlacement => ({
  inputAxes: ["y", "x"],
  outputAxes: ["y", "x"],
  total: true,
  matrix: [
    [1, 0, 0],
    [0, 1, tx],
  ],
});

/** Translate +10 along world x. */
const SHIFT_X = [
  [1, 0, 0, 10],
  [0, 1, 0, 0],
  [0, 0, 1, 0],
  [0, 0, 0, 1],
];
const IDENTITY = [
  [1, 0, 0, 0],
  [0, 1, 0, 0],
  [0, 0, 1, 0],
  [0, 0, 0, 1],
];

const args = (overrides: Partial<PlacementPreviewArgs<Raw, State>>): PlacementPreviewArgs<Raw, State> => ({
  sceneLayers: [],
  layers: [],
  bases: {},
  layerIds: [],
  worldDelta: null,
  worldSpatial: ["x", "y", null],
  dataSpatialOf: () => ["x", "y", null],
  placeImage: (state, asAffine) => ({ ...state, asAffine, affineTag: `placed:${asAffine.matrix[1][2]}` }),
  ...overrides,
});

describe("applyPlacementPreview", () => {
  const a: Raw = { id: "a", asAffine: placement(5) };
  const b: Raw = { id: "b", asAffine: placement(7) };
  const c: Raw = { id: "c", asAffine: placement(9), marker: "untouched" };
  const stateA: State = { id: "a", asAffine: placement(5) };

  it("left-multiplies the delta onto every member, in one result", () => {
    const result = applyPlacementPreview(
      args({ sceneLayers: [a, b, c], layers: [stateA], layerIds: ["a", "b"], worldDelta: SHIFT_X }),
    );
    expect(result.changed).toBe(true);
    expect(result.sceneLayers[0].asAffine?.matrix[1][2]).toBe(15);
    expect(result.sceneLayers[1].asAffine?.matrix[1][2]).toBe(17);
    expect(result.layers[0].affineTag).toBe("placed:15");
    expect(result.bases).toEqual({ a: placement(5), b: placement(7) });
    expect(result.failures).toEqual([]);
  });

  it("preserves the identity of every layer it does not touch", () => {
    const result = applyPlacementPreview(
      args({ sceneLayers: [a, b, c], layers: [stateA], layerIds: ["b"], worldDelta: SHIFT_X }),
    );
    expect(result.sceneLayers[0]).toBe(a);
    expect(result.sceneLayers[2]).toBe(c);
    expect(result.layers[0]).toBe(stateA);
  });

  it("always computes from the SERVER base, never from the previous preview", () => {
    const first = applyPlacementPreview(args({ sceneLayers: [a], layerIds: ["a"], worldDelta: SHIFT_X }));
    const second = applyPlacementPreview(
      args({ sceneLayers: first.sceneLayers, bases: first.bases, layerIds: ["a"], worldDelta: SHIFT_X }),
    );
    // Applied twice, moved once: no drift however many frames a drag lasts.
    expect(second.sceneLayers[0].asAffine?.matrix[1][2]).toBe(15);
    expect(second.bases.a).toEqual(placement(5));
  });

  it("restores exactly on null, and treats an identity delta as a clear", () => {
    const previewed = applyPlacementPreview(args({ sceneLayers: [a], layerIds: ["a"], worldDelta: SHIFT_X }));
    for (const worldDelta of [null, IDENTITY]) {
      const cleared = applyPlacementPreview(
        args({ sceneLayers: previewed.sceneLayers, bases: previewed.bases, layerIds: ["a"], worldDelta }),
      );
      expect(cleared.sceneLayers[0].asAffine).toEqual(placement(5));
      expect(cleared.bases).toEqual({});
      expect(cleared.changed).toBe(true);
    }
  });

  it("restores a layer that dropped out of the member set", () => {
    const previewed = applyPlacementPreview(
      args({ sceneLayers: [a, b], layerIds: ["a", "b"], worldDelta: SHIFT_X }),
    );
    const narrowed = applyPlacementPreview(
      args({ sceneLayers: previewed.sceneLayers, bases: previewed.bases, layerIds: ["a"], worldDelta: SHIFT_X }),
    );
    expect(narrowed.sceneLayers[1].asAffine).toEqual(placement(7));
    expect(Object.keys(narrowed.bases)).toEqual(["a"]);
  });

  it("clearing nothing changes nothing", () => {
    const result = applyPlacementPreview(args({ sceneLayers: [a, b], layerIds: [], worldDelta: null }));
    expect(result.changed).toBe(false);
    expect(result.sceneLayers[0]).toBe(a);
  });

  it("never gives an unplaced layer a placement", () => {
    const unplaced: Raw = { id: "u", asAffine: null };
    const result = applyPlacementPreview(args({ sceneLayers: [unplaced], layerIds: ["u"], worldDelta: SHIFT_X }));
    expect(result.sceneLayers[0]).toBe(unplaced);
    expect(result.failures).toHaveLength(1);
    expect(result.bases).toEqual({});
  });

  it("reports a delta the world cannot hold, leaving the layer on its base", () => {
    const alongZ = [
      [1, 0, 0, 0],
      [0, 1, 0, 0],
      [0, 0, 1, 4],
      [0, 0, 0, 1],
    ];
    const result = applyPlacementPreview(args({ sceneLayers: [a], layerIds: ["a"], worldDelta: alongZ }));
    expect(result.failures[0].layerId).toBe("a");
    expect(result.sceneLayers[0]).toBe(a);
  });

  it("keeps the placement's own flags (total) on the preview", () => {
    const partial: Raw = { id: "p", asAffine: { ...placement(1), total: false } };
    const result = applyPlacementPreview(args({ sceneLayers: [partial], layerIds: ["p"], worldDelta: SHIFT_X }));
    expect(result.sceneLayers[0].asAffine?.total).toBe(false);
  });
});

describe("prunePreviewBases", () => {
  const bases = { a: placement(1), b: placement(2) };
  it("returns null when every previewed layer survived untouched", () => {
    expect(prunePreviewBases(bases, new Set(["a", "b", "c"]))).toBeNull();
  });
  it("drops the base of a layer the server re-placed or removed", () => {
    expect(prunePreviewBases(bases, new Set(["a"]))).toEqual({ a: placement(1) });
  });
});

describe("hostLayersKey", () => {
  const path = [{ inverted: false, transformation: { id: "e1", version: 2 } }];
  const layer = { id: "a", __typename: "ImageLayer", name: "DAPI", visible: true, asAffine: placement(1), pathToWorld: path };

  it("summarizes placement and the final edge", () => {
    const [host] = toHostLayers([layer]);
    expect(host).toMatchObject({
      name: "DAPI",
      placeable: true,
      visible: true,
      finalStep: { edgeId: "e1", version: 2, inverted: false },
    });
    expect(toHostLayers([{ id: "u", pathToWorld: null, asAffine: null }])[0]).toMatchObject({
      placeable: false,
      finalStep: null,
    });
  });

  it("ignores a placement-preview frame, but not a saved registration", () => {
    const key = hostLayersKey(toHostLayers([layer]));
    // A preview rewrites asAffine and nothing else.
    expect(hostLayersKey(toHostLayers([{ ...layer, asAffine: placement(99) }]))).toBe(key);
    const saved = [{ inverted: false, transformation: { id: "e1", version: 3 } }];
    expect(hostLayersKey(toHostLayers([{ ...layer, pathToWorld: saved }]))).not.toBe(key);
  });

  it("names the data a layer shows, whichever shape it arrives in", () => {
    const data = (extra: object) => toHostLayers([{ id: "l", ...extra }])[0].data;
    expect(data({ lens: { dataset: { id: "d1" } } })).toEqual({ kind: "arrayDataset", id: "d1" });
    expect(data({ tableDataset: { id: "t1" } })).toEqual({ kind: "tableDataset", id: "t1" });
    expect(data({ collection: { coordinateSystem: { id: "c1" } } })).toEqual({ kind: "coordinateSystem", id: "c1" });
    expect(data({})).toBeNull();
  });

  it("lets a normalized layer's session visibility win", () => {
    const [host] = toHostLayers([layer], new Map([["a", false]]));
    expect(host.visible).toBe(false);
  });
});
