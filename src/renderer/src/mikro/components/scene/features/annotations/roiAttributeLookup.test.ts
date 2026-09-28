// @vitest-environment jsdom
// (the generated `graphql.ts` enums are runtime values, and importing that
// module pulls in the Apollo hooks barrel, which touches `window` on load)
import { describe, expect, it } from "vitest";

import { AnnotationKind } from "@/mikro/api/graphql";
import {
  buildRoiLookupTargets,
  roiAxisCoords,
  roiLookupPoints,
} from "./roiAttributeLookup";

describe("roiLookupPoints", () => {
  it("returns nothing for empty vectors", () => {
    expect(roiLookupPoints(AnnotationKind.Point, [])).toEqual([]);
  });

  it("point → its single vertex", () => {
    expect(roiLookupPoints(AnnotationKind.Point, [[1, 2, 3]])).toEqual([
      { label: "point", point: [1, 2, 3] },
    ]);
  });

  it("line → both endpoints", () => {
    expect(
      roiLookupPoints(AnnotationKind.Line, [
        [0, 0, 0],
        [10, 10, 0],
      ]),
    ).toEqual([
      { label: "start", point: [0, 0, 0] },
      { label: "end", point: [10, 10, 0] },
    ]);
  });

  it("rectangle/ellipsis → midpoint of the stored corners", () => {
    const corners: number[][] = [
      [0, 0, 2],
      [10, 20, 2],
    ];
    for (const kind of [AnnotationKind.Rectangle, AnnotationKind.Ellipse]) {
      expect(roiLookupPoints(kind, corners)).toEqual([
        { label: "center", point: [5, 10, 2] },
      ]);
    }
  });

  it("polygon → vertex centroid", () => {
    expect(
      roiLookupPoints(AnnotationKind.Polygon, [
        [0, 0, 0],
        [6, 0, 0],
        [0, 6, 0],
      ]),
    ).toEqual([{ label: "center", point: [2, 2, 0] }]);
  });

  it("short path → every vertex", () => {
    const points = roiLookupPoints(AnnotationKind.Path, [
      [0, 0, 0],
      [1, 1, 0],
      [2, 2, 0],
    ]);
    expect(points.map((p) => p.point)).toEqual([
      [0, 0, 0],
      [1, 1, 0],
      [2, 2, 0],
    ]);
  });

  it("long path → 5 evenly spaced vertices including both endpoints", () => {
    const vectors = Array.from({ length: 12 }, (_, i) => [i, 0, 0]);
    const points = roiLookupPoints(AnnotationKind.Path, vectors);
    expect(points).toHaveLength(5);
    expect(points[0].point).toEqual([0, 0, 0]);
    expect(points[points.length - 1].point).toEqual([11, 0, 0]);
  });

  it("missing vector components default to 0", () => {
    expect(roiLookupPoints(AnnotationKind.Point, [[4, 5]])).toEqual([
      { label: "point", point: [4, 5, 0] },
    ]);
  });
});

describe("roiAxisCoords", () => {
  it("maps spatial axes to the last three names reversed, others from pinned coords", () => {
    const coords = roiAxisCoords({
      axisNames: ["c", "t", "z", "y", "x"],
      coordinates: [{ name: "t", value: 7 }],
      point: [100, 200, 3],
    });
    expect(coords).toEqual({ c: 0, t: 7, z: 3, y: 200, x: 100 });
  });

  it("handles a 2-axis system (no z)", () => {
    const coords = roiAxisCoords({
      axisNames: ["y", "x"],
      coordinates: [],
      point: [100, 200, 3],
    });
    expect(coords).toEqual({ y: 200, x: 100 });
  });

  it("returns null for fewer than 2 axes", () => {
    expect(
      roiAxisCoords({ axisNames: ["x"], coordinates: [], point: [1, 2, 3] }),
    ).toBeNull();
  });
});

describe("buildRoiLookupTargets", () => {
  const base = {
    systemId: "sys-1",
    axisNames: ["z", "y", "x"],
    coordinates: [],
  };

  it("dedupes points that round to the same coords", () => {
    const targets = buildRoiLookupTargets({
      ...base,
      points: [
        { label: "p1", point: [10.2, 20.1, 0] },
        { label: "p2", point: [10.4, 19.9, 0] },
        { label: "p3", point: [50, 60, 0] },
      ],
    });
    expect(targets).toHaveLength(2);
    expect(targets[0].label).toBe("p1");
    expect(targets[1].label).toBe("p3");
  });

  it("keeps float coords but keys on rounded ones", () => {
    const [target] = buildRoiLookupTargets({
      ...base,
      points: [{ label: "point", point: [10.4, 20.1, 0] }],
    });
    expect(target.coords).toEqual({ z: 0, y: 20.1, x: 10.4 });
    expect(target.key).toContain("x=10");
  });

  it("skips points a too-small system cannot place", () => {
    const targets = buildRoiLookupTargets({
      systemId: "sys-1",
      axisNames: ["x"],
      coordinates: [],
      points: [{ label: "point", point: [1, 2, 3] }],
    });
    expect(targets).toEqual([]);
  });
});
