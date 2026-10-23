import { describe, expect, it } from "vitest";

import { AxisType, CreatableTransformKind, PartKind } from "@/mikro/api/graphql";
import { placementTransform, slotAxesOf } from "./commitDesign";

const world = (names: string[]) => ({ id: "w", axes: names.map((name, order) => ({ name, order, type: name === "t" ? AxisType.Time : AxisType.Space })) });

describe("placing a designed collection", () => {
  it("names its axes in vertex-slot order, slot 0 being THREE's x and the world's last space axis", () => {
    expect(slotAxesOf(world(["z", "y", "x"]))).toEqual(["x", "y", "z"]);
    expect(slotAxesOf(world(["t", "z", "y", "x"]))).toEqual(["x", "y", "z"]);
  });

  it("refuses a world without exactly three space axes", () => {
    expect(() => slotAxesOf(world(["y", "x"]))).toThrow(/three/);
  });

  it("is a BY_DIMENSION over the slot axes, the bake's offset in the same order", () => {
    // A TRANSLATION with `inputAxes` is refused outright ("does not read
    // `inputAxes`"), which is how registering a designed collection failed.
    expect(placementTransform(["x", "y", "z"], [10, 20, 30])).toEqual({
      kind: CreatableTransformKind.ByDimension,
      parts: [{ kind: PartKind.Translation, translation: [10, 20, 30], inputAxes: ["x", "y", "z"], outputAxes: ["x", "y", "z"] }],
    });
  });
});
