// @vitest-environment jsdom
// (the AnnotationKind enum import pulls in modules that touch `window`)
import * as THREE from "three";
import { describe, expect, it } from "vitest";

import { AnnotationKind, type SceneAnnotationFragment } from "@/mikro-next/api/graphql";
import {
  partitionEntries,
  placeAnnotations,
  pointGroupsOf,
  sameEntries,
  shownEntries,
  splitPointEntries,
  type PlacementIdentity,
} from "./placedAnnotations";

const annotation = (id: string, kind: AnnotationKind, vectors: number[][]): SceneAnnotationFragment =>
  ({ id, name: id, kind, vectors, coordinates: [], strokeColor: null, fillColor: null, strokeWidth: 1.5, filled: false }) as unknown as SceneAnnotationFragment;

const identity: PlacementIdentity = { layerId: "layer", systemId: "cs", axisNames: ["z", "y", "x"] };
const matrix = new THREE.Matrix4();

describe("placeAnnotations", () => {
  it("keeps entry AND roi identity for unchanged rows across recomputes", () => {
    const a = annotation("a", AnnotationKind.Path, [[0, 0, 0], [1, 1, 0]]);
    const b = annotation("b", AnnotationKind.Point, [[2, 2, 2]]);
    const first = placeAnnotations([a, b], matrix, identity);
    // A poll delta: b replaced, a identical (Apollo keeps its row identity).
    const b2 = annotation("b", AnnotationKind.Point, [[3, 3, 3]]);
    const second = placeAnnotations([a, b2], matrix, identity);
    expect(second[0]).toBe(first[0]);
    expect(second[0].roi).toBe(first[0].roi);
    expect(second[1]).not.toBe(first[1]);
  });

  it("re-places everything when the matrix or the layer identity changes", () => {
    const a = annotation("a", AnnotationKind.Path, [[0, 0, 0], [1, 1, 0]]);
    const first = placeAnnotations([a], matrix, identity);
    const moved = placeAnnotations([a], new THREE.Matrix4().makeTranslation(5, 0, 0), identity);
    expect(moved[0]).not.toBe(first[0]);
    expect(moved[0].bounds.minX).toBeCloseTo(first[0].bounds.minX + 5);
  });

  it("splits points from shapes and buckets by opacity", () => {
    const entries = placeAnnotations(
      [
        annotation("p1", AnnotationKind.Point, [[0, 0, 0]]),
        annotation("line", AnnotationKind.Line, [[0, 0, 0], [1, 0, 0]]),
      ],
      matrix,
      identity,
    );
    const { pointGroups, otherShapes } = splitPointEntries(entries, () => false, true);
    expect(pointGroups).toHaveLength(1);
    expect(pointGroups[0][1][0].id).toBe("p1");
    expect(otherShapes.map((e) => e.annotation.id)).toEqual(["line"]);
  });

  it("partition is selection-independent: `others` keeps identity across a click", () => {
    const entries = placeAnnotations(
      [
        annotation("p1", AnnotationKind.Point, [[0, 0, 0]]),
        annotation("line", AnnotationKind.Line, [[0, 0, 0], [1, 0, 0]]),
      ],
      matrix,
      identity,
    );
    const { points, others } = partitionEntries(entries);
    expect(points.map((e) => e.annotation.id)).toEqual(["p1"]);
    expect(others.map((e) => e.annotation.id)).toEqual(["line"]);
    // The selection only reaches the point styling — never the partition.
    const unselected = pointGroupsOf(points, () => false, true);
    const selected = pointGroupsOf(points, (id) => id === "p1", true);
    expect(unselected[0][1][0].color).not.toBe(selected[0][1][0].color);
  });

  it("shownEntries returns the previous array when the filter keeps the same entries", () => {
    const a = annotation("a", AnnotationKind.Path, [[0, 0, 0], [1, 1, 0]]);
    const b = annotation("b", AnnotationKind.Point, [[2, 2, 2]]);
    const placed = placeAnnotations([a, b], matrix, identity);
    const first = shownEntries(placed, () => true);
    // A scrub tick: same predicate outcome, same array — memos downstream skip.
    expect(shownEntries(placed, () => true)).toBe(first);
    // A tick that hides one entry: a new array.
    const narrowed = shownEntries(placed, (entry) => entry.annotation.id === "a");
    expect(narrowed).not.toBe(first);
    expect(narrowed.map((e) => e.annotation.id)).toEqual(["a"]);
    // Back to everything: a new array again (the cache holds only the latest).
    expect(shownEntries(placed, () => true)).not.toBe(narrowed);
  });

  it("sameEntries is the cheap change test the store-write gate uses", () => {
    const a = annotation("a", AnnotationKind.Path, [[0, 0, 0], [1, 1, 0]]);
    const first = placeAnnotations([a], matrix, identity);
    const second = placeAnnotations([a], matrix, identity);
    expect(sameEntries(first, second)).toBe(true);
    expect(sameEntries(first, [])).toBe(false);
    expect(sameEntries(null, second)).toBe(false);
  });
});
