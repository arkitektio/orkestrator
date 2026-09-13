// @vitest-environment jsdom
// (the generated `graphql.ts` enums are runtime values, and importing that
// module pulls in the Apollo hooks barrel, which touches `window` on load)
import { describe, expect, it, vi } from "vitest";
import * as THREE from "three";
import { AnnotationKind, type SceneAnnotationFragment } from "@/mikro-next/api/graphql";
import {
  getAnnotationSelectionPoints,
  getWorldExtent,
  resolveCollectionMatrix,
  worldExtentToBox3,
  type AnnotationCollectionRef,
  type AnnotationLayerVariant,
} from "./annotationBounds";

const annotation = (
  kind: AnnotationKind,
  vectors: number[][],
): SceneAnnotationFragment =>
  ({ id: "a1", name: "a", kind, vectors, coordinates: [] }) as unknown as SceneAnnotationFragment;

describe("getAnnotationSelectionPoints", () => {
  it("takes only the first vertex of a POINT", () => {
    const points = getAnnotationSelectionPoints(
      annotation(AnnotationKind.Point, [[1, 2, 3], [9, 9, 9]]),
      false,
    );
    expect(points).toEqual([[1, 2, 3]]);
  });

  it("keeps every vertex of a LINE", () => {
    const points = getAnnotationSelectionPoints(
      annotation(AnnotationKind.Line, [[0, 0, 0], [4, 4, 4]]),
      false,
    );
    expect(points).toEqual([[0, 0, 0], [4, 4, 4]]);
  });

  it("expands a flat RECTANGLE corner pair to 4 corners", () => {
    const points = getAnnotationSelectionPoints(
      annotation(AnnotationKind.Rectangle, [[0, 0, 5], [2, 3, 5]]),
      false,
    );
    expect(points).toHaveLength(4);
    expect(points).toContainEqual([2, 3, 5]);
  });

  it("expands a deep RECTANGLE corner pair to 8 corners", () => {
    const points = getAnnotationSelectionPoints(
      annotation(AnnotationKind.Rectangle, [[0, 0, 0], [2, 3, 4]]),
      false,
    );
    expect(points).toHaveLength(8);
  });

  it("rings a flat ELLIPSE once and a deep one twice", () => {
    const flat = getAnnotationSelectionPoints(
      annotation(AnnotationKind.Ellipse, [[0, 0, 1], [4, 2, 1]]),
      false,
    );
    const deep = getAnnotationSelectionPoints(
      annotation(AnnotationKind.Ellipse, [[0, 0, 0], [4, 2, 6]]),
      false,
    );
    expect(flat).toHaveLength(24);
    expect(deep).toHaveLength(48);
  });

  it("falls back to raw vectors for POLYGON and friends", () => {
    const vectors = [[0, 0, 0], [1, 0, 0], [1, 1, 0]];
    expect(
      getAnnotationSelectionPoints(annotation(AnnotationKind.Polygon, vectors), false),
    ).toEqual(vectors);
  });

  it("is empty with no vectors", () => {
    expect(getAnnotationSelectionPoints(annotation(AnnotationKind.Polygon, []), false)).toEqual([]);
  });
});

describe("getWorldExtent", () => {
  it("bounds the shape under the identity matrix", () => {
    const extent = getWorldExtent(
      annotation(AnnotationKind.Polygon, [[0, 1, 2], [4, 5, 6], [-1, 0, 3]]),
      new THREE.Matrix4(),
    );
    expect(extent).not.toBeNull();
    expect(extent!.bounds).toEqual({ minX: -1, maxX: 4, minY: 0, maxY: 5 });
    expect(extent!.zSpan).toEqual({ min: 2, max: 6 });
  });

  it("applies scale and translation", () => {
    const matrix = new THREE.Matrix4()
      .makeScale(2, 2, 2)
      .setPosition(10, 20, 30);
    const extent = getWorldExtent(
      annotation(AnnotationKind.Line, [[0, 0, 0], [1, 1, 1]]),
      matrix,
    );
    expect(extent!.bounds).toEqual({ minX: 10, maxX: 12, minY: 20, maxY: 22 });
    expect(extent!.zSpan).toEqual({ min: 30, max: 32 });
  });

  it("gives a POINT a zero-size extent, not null", () => {
    const extent = getWorldExtent(
      annotation(AnnotationKind.Point, [[3, 4, 5]]),
      new THREE.Matrix4(),
    );
    expect(extent!.bounds).toEqual({ minX: 3, maxX: 3, minY: 4, maxY: 4 });
    expect(extent!.zSpan).toEqual({ min: 5, max: 5 });
  });

  it("is null with no vectors", () => {
    expect(
      getWorldExtent(annotation(AnnotationKind.Polygon, []), new THREE.Matrix4()),
    ).toBeNull();
  });
});

describe("worldExtentToBox3", () => {
  it("leaves a non-degenerate box untouched", () => {
    const box = worldExtentToBox3(
      { bounds: { minX: 0, maxX: 10, minY: 0, maxY: 10 }, zSpan: { min: 0, max: 10 } },
      1,
    );
    expect(box.min.toArray()).toEqual([0, 0, 0]);
    expect(box.max.toArray()).toEqual([10, 10, 10]);
  });

  it("pads every axis of a point extent", () => {
    const box = worldExtentToBox3(
      { bounds: { minX: 5, maxX: 5, minY: 5, maxY: 5 }, zSpan: { min: 5, max: 5 } },
      2,
    );
    expect(box.min.toArray()).toEqual([3, 3, 3]);
    expect(box.max.toArray()).toEqual([7, 7, 7]);
  });

  it("pads only z of a flat rectangle, keeping the real footprint", () => {
    const box = worldExtentToBox3(
      { bounds: { minX: 0, maxX: 10, minY: 0, maxY: 8 }, zSpan: { min: 4, max: 4 } },
      1,
    );
    expect(box.min.toArray()).toEqual([0, 0, 3]);
    expect(box.max.toArray()).toEqual([10, 8, 5]);
  });
});

describe("resolveCollectionMatrix (annotations)", () => {
  const WORLD_CYX = {
    id: "cs:world",
    axes: [
      { name: "c", type: "CHANNEL", order: 0 },
      { name: "y", type: "SPACE", order: 1 },
      { name: "x", type: "SPACE", order: 2 },
    ],
  };
  const collection = (id: string, axes: string[]): AnnotationCollectionRef =>
    ({
      id,
      coordinateSystem: { id: `cs:${id}`, axes: axes.map((name) => ({ name })) },
    }) as unknown as AnnotationCollectionRef;
  const layerWith = (asAffine: unknown): AnnotationLayerVariant =>
    ({ __typename: "AnnotationLayer", id: "layer:1", asAffine }) as unknown as AnnotationLayerVariant;

  it("reduces the server's asAffine, output side named by the world", () => {
    // Drawn in (z, row, col); placed into a (y, x) world with a reflection.
    const m = resolveCollectionMatrix(
      layerWith({
        matrix: [
          [0, -2, 0, 100], // y ← row
          [0, 0, 2, 5], // x ← col
        ],
        inputAxes: ["z", "row", "col"],
        outputAxes: ["y", "x"],
        total: false,
      }),
      collection("ann:rowcol", ["z", "row", "col"]),
      { worldCoordinateSystem: WORLD_CYX },
    );
    expect(m.elements[0]).toBeCloseTo(2); // x ← col
    expect(m.elements[12]).toBeCloseTo(5);
    expect(m.elements[5]).toBeCloseTo(-2); // y ← row
    expect(m.elements[13]).toBeCloseTo(100);
    expect(m.elements[10]).toBe(1); // z unconstrained → identity
  });

  it("never walks pathToWorld: a null asAffine is identity, warned once", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      const col = collection("ann:none", ["z", "y", "x"]);
      const m = resolveCollectionMatrix(layerWith(null), col, { worldCoordinateSystem: WORLD_CYX });
      expect(m.elements).toEqual([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
      resolveCollectionMatrix(layerWith(null), col, { worldCoordinateSystem: WORLD_CYX });
      expect(warn).toHaveBeenCalledTimes(1);
      expect(warn).toHaveBeenCalledWith(expect.stringContaining("asAffine is null"));
    } finally {
      warn.mockRestore();
    }
  });
});
