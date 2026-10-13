import { describe, expect, it } from "vitest";

import { inSceneOrder, toSceneVector, toStoredVector } from "./sceneVectors";

describe("scene vertex order", () => {
  it("stores a volume vertex back to front: the collection's axes are (z, y, x)", () => {
    expect(toStoredVector([4405, 1677, 6], 3)).toEqual([6, 1677, 4405]);
  });

  it("stores a plane vertex with no z: the collection's axes are (y, x)", () => {
    expect(toStoredVector([4405, 1677, 0], 2)).toEqual([1677, 4405]);
  });

  it("reads a stored vertex back as [x, y, z], a plane's z left missing", () => {
    expect(toSceneVector([6, 1677, 4405])).toEqual([4405, 1677, 6]);
    expect(toSceneVector([1677, 4405])).toEqual([4405, 1677]);
  });

  it("round-trips at every rank", () => {
    for (const rank of [2, 3]) {
      const scene: [number, number, number] = [1, 2, rank === 3 ? 3 : 0];
      const back = toSceneVector(toStoredVector(scene, rank));
      expect([back[0], back[1], back[2] ?? 0]).toEqual(scene);
    }
  });

  it("answers one object per annotation, and leaves the stored one alone", () => {
    const stored = { id: "1", vectors: [[6, 1677, 4405]] };
    const ordered = inSceneOrder(stored);
    expect(ordered.vectors).toEqual([[4405, 1677, 6]]);
    expect(stored.vectors).toEqual([[6, 1677, 4405]]);
    expect(inSceneOrder(stored)).toBe(ordered);
  });
});
