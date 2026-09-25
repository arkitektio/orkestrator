import { describe, expect, it } from "vitest";
import { identity, translation } from "./mat4";
import { landmarkResiduals } from "./residuals";

describe("landmarkResiduals", () => {
  const landmarks = [
    { id: 1, fixed: [10, 0, 0] as [number, number, number], moving: [7, 0, 0] as [number, number, number] },
    { id: 2, fixed: [0, 4, 0] as [number, number, number], moving: [-3, 0, 0] as [number, number, number] },
    { id: 3, fixed: [1, 1, 1] as [number, number, number], moving: null },
  ];

  it("measures under the CURRENT draft and skips open pairs", () => {
    const before = landmarkResiduals(landmarks, identity());
    expect(before.byId.get(1)).toBe(3);
    expect(before.byId.get(2)).toBe(5);
    expect(before.byId.has(3)).toBe(false);
    expect(before.rms).toBeCloseTo(Math.sqrt((9 + 25) / 2), 12);

    const after = landmarkResiduals(landmarks, translation([3, 0, 0]));
    expect(after.byId.get(1)).toBe(0);
    expect(after.byId.get(2)).toBe(4);
  });

  it("has no RMS without a complete pair", () => {
    expect(landmarkResiduals([landmarks[2]], identity()).rms).toBeNull();
  });
});
