import { describe, expect, it } from "vitest";

import { CreatableTransformKind, PartKind } from "@/mikro/api/graphql";
import { placementTransform, translationForAxes } from "./commitDesign";

describe("placing a designed collection", () => {
  it("orders the translation by the declared axes, the last axis being vertex component 0", () => {
    // The bake's offset is THREE's (x, y, z); a (z, y, x) world reads it back to front.
    expect(translationForAxes(["z", "y", "x"], [10, 20, 30])).toEqual([30, 20, 10]);
    expect(translationForAxes(["x", "y", "z"], [10, 20, 30])).toEqual([30, 20, 10]);
  });

  it("is a BY_DIMENSION over the named axes — the kind the server reads axis names from", () => {
    // A TRANSLATION with `inputAxes` is refused outright ("does not read
    // `inputAxes`"), which is how registering a designed collection failed.
    expect(placementTransform(["z", "y", "x"], [10, 20, 30])).toEqual({
      kind: CreatableTransformKind.ByDimension,
      parts: [{ kind: PartKind.Translation, translation: [30, 20, 10], inputAxes: ["z", "y", "x"], outputAxes: ["z", "y", "x"] }],
    });
  });
});
