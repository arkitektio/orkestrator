// @vitest-environment jsdom
// (`layerModel.ts`, reached through the LayerState type's module, imports enums
// from the generated `graphql.ts`, whose Apollo hooks barrel touches `window`.)
import { describe, expect, it } from "vitest";

import { buildMergeMembers } from "./mergeMembers";
import type { LayerState } from "../../../platform/model/layerModel";

/**
 * Which pool members are eligible for ONE merged volume pass. Extracted out of
 * `BrickVolumeLayer`'s memo precisely so these rules are assertable without
 * rendering a canvas.
 */

const layer = (over: Partial<LayerState> = {}): LayerState =>
  ({
    __typename: "ImageLayer",
    id: "a",
    visible: true,
    affineMatrix: null,
    channels: [{}],
    sources: [{}],
    phasors: [],
    ...over,
  }) as unknown as LayerState;

const allPlanned = () => 0;

describe("buildMergeMembers", () => {
  it("includes a visible, planned image layer and records its pool order", () => {
    const layers = [layer({ id: "a" }), layer({ id: "b" })];
    const members = buildMergeMembers({
      memberIds: ["b", "a"],
      layers,
      targetLevelOf: allPlanned,
    });
    expect(members.map((m) => m.layerId)).toEqual(["b", "a"]);
    // `order` is the index in `layers`, NOT in memberIds — that is what makes
    // the primary choice deterministic across the components deriving this
    // independently.
    expect(members.map((m) => m.order)).toEqual([1, 0]);
  });

  it("EXCLUDES a label layer", () => {
    // The merged material is the image compositor unrolled per member — channel
    // slots, transfers, colormap rows — and a label has none of that.
    const layers = [layer({ id: "img" }), layer({ id: "mask", __typename: "LabelLayer" })];
    const members = buildMergeMembers({
      memberIds: ["img", "mask"],
      layers,
      targetLevelOf: allPlanned,
    });
    expect(members.map((m) => m.layerId)).toEqual(["img"]);
  });

  it("yields NO members when every member of the pool is a label", () => {
    // Two labels over one mask still share the pool (same bricks, the whole
    // win); with no eligible members there is no merged pass and each draws
    // itself.
    const layers = [
      layer({ id: "m1", __typename: "LabelLayer" }),
      layer({ id: "m2", __typename: "LabelLayer" }),
    ];
    expect(
      buildMergeMembers({ memberIds: ["m1", "m2"], layers, targetLevelOf: allPlanned }),
    ).toEqual([]);
  });

  it("excludes a hidden member immediately", () => {
    // The pool's membership only updates after the next replan + reconcile, so
    // without this the primary would keep compositing a hidden layer.
    const layers = [layer({ id: "a" }), layer({ id: "b", visible: false })];
    const members = buildMergeMembers({
      memberIds: ["a", "b"],
      layers,
      targetLevelOf: allPlanned,
    });
    expect(members.map((m) => m.layerId)).toEqual(["a"]);
  });

  it("excludes a member with no plan yet", () => {
    const layers = [layer({ id: "a" }), layer({ id: "b" })];
    const members = buildMergeMembers({
      memberIds: ["a", "b"],
      layers,
      targetLevelOf: (id) => (id === "a" ? 0 : undefined),
    });
    expect(members.map((m) => m.layerId)).toEqual(["a"]);
  });

  it("excludes a member id the store no longer carries", () => {
    const members = buildMergeMembers({
      memberIds: ["a", "gone"],
      layers: [layer({ id: "a" })],
      targetLevelOf: allPlanned,
    });
    expect(members.map((m) => m.layerId)).toEqual(["a"]);
  });

  it("counts phasor cursors across a member's phasor sources", () => {
    const layers = [
      layer({
        id: "a",
        phasors: [
          { transfer: { cursors: [{}, {}] } },
          { transfer: { cursors: [{}] } },
        ],
      } as unknown as Partial<LayerState>),
    ];
    const [member] = buildMergeMembers({
      memberIds: ["a"],
      layers,
      targetLevelOf: allPlanned,
    });
    expect(member.cursorCount).toBe(3);
  });
});

describe("quantizedAffineKey", () => {
  it("collapses float-noise-only differences into one bucket", async () => {
    const { quantizedAffineKey } = await import("./mergeMembers");
    const a = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 100.30000000000001, 0.1 + 0.2, 0, 1];
    const b = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 100.3, 0.3, 0, 1];
    expect(quantizedAffineKey(a)).toBe(quantizedAffineKey(b));
  });

  it("preserves real differences", async () => {
    const { quantizedAffineKey } = await import("./mergeMembers");
    const a = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 100.3, 0, 0, 1];
    const b = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 100.4, 0, 0, 1];
    expect(quantizedAffineKey(a)).not.toBe(quantizedAffineKey(b));
  });

  it("normalizes -0 so a zero's sign cannot split a bucket", async () => {
    const { quantizedAffineKey } = await import("./mergeMembers");
    expect(quantizedAffineKey([-0, 1])).toBe(quantizedAffineKey([0, 1]));
  });
});
