import { describe, expect, it } from "vitest";
import { buildPlanInputSignature } from "./planInputSignature";
import type { LayerViewRange } from "../../../platform/visibility/visibility";

const range = (over: Partial<LayerViewRange> = {}): LayerViewRange => ({
  xRange: [0, 512],
  yRange: [0, 512],
  zRange: null,
  scale: 2,
  ...over,
});

describe("buildPlanInputSignature", () => {
  it("equal inputs → equal signatures, even across object identities", () => {
    const affine = [
      [1, 0, 0, 0],
      [0, 1, 0, 0],
      [0, 0, 1, 0],
      [0, 0, 0, 1],
    ];
    expect(buildPlanInputSignature(affine, null, range())).toBe(
      buildPlanInputSignature(affine.map((row) => [...row]), null, range()),
    );
  });

  it("identity affine and missing range have stable spellings", () => {
    expect(buildPlanInputSignature(null, null, undefined)).toBe("I#-#none");
    expect(buildPlanInputSignature(undefined, undefined, undefined)).toBe("I#-#none");
  });

  it("a different affine splits the class", () => {
    const a = buildPlanInputSignature([[1, 0], [0, 1]], null, range());
    const b = buildPlanInputSignature([[2, 0], [0, 1]], null, range());
    expect(a).not.toBe(b);
  });

  it("a different visible range splits the class", () => {
    const a = buildPlanInputSignature(null, null, range());
    const b = buildPlanInputSignature(null, null, range({ xRange: [0, 256] }));
    const c = buildPlanInputSignature(null, null, range({ scale: 4 }));
    const d = buildPlanInputSignature(null, null, range({ zRange: [0, 64] }));
    expect(new Set([a, b, c, d]).size).toBe(4);
  });

  it("a fixed-LOD override splits the class", () => {
    expect(buildPlanInputSignature(null, 2, range())).not.toBe(
      buildPlanInputSignature(null, null, range()),
    );
    expect(buildPlanInputSignature(null, 0, range())).not.toBe(
      buildPlanInputSignature(null, null, range()),
    );
  });

});
