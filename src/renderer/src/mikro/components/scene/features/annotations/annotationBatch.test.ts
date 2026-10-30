// @vitest-environment jsdom
// (the AnnotationKind enum import pulls in modules that touch `window`)
import { describe, expect, it } from "vitest";
import { AnnotationKind, type SceneAnnotationFragment } from "@/mikro/api/graphql";
import {
  ELLIPSE_SEGMENTS,
  STROKE_FLOATS,
  batchColors,
  createRangeTints,
  markTinted,
  strokeColorOf,
  tintRanges,
  buildOutlineBatches,
  buildSectionedOutlineBatches,
  drawsOwnMesh,
  isSectionedEllipse,
  outlinePoints,
  roiForSegment,
  sectionedOutlinePoints,
} from "./annotationBatch";
import { getVectorPoint } from "./annotationBounds";
import { DEFAULT_STROKE, ACTIVE_STROKE, HOVER_STROKE, MUTED_STROKE } from "./annotationStyle";
import * as THREE from "three";

/**
 * `outlinePoints` + `sectionedOutlinePoints` are every flat shape's outline:
 * same points, same open/closed decisions as the per-shape `<Line>`s they
 * replaced. `AnnotationShape` only draws what `drawsOwnMesh` accepts.
 */

const annotation = (
  kind: AnnotationKind | string,
  vectors: number[][],
  extra: Partial<SceneAnnotationFragment> = {},
): SceneAnnotationFragment =>
  ({
    id: extra.id ?? "a1",
    kind,
    vectors,
    coordinates: [],
    ...extra,
  }) as unknown as SceneAnnotationFragment;

describe("outlinePoints", () => {
  it("points and 3D-extruded boxes/spheres draw no fat line", () => {
    expect(outlinePoints(annotation(AnnotationKind.Point, [[1, 2, 3]]), false)).toBeNull();
    // Corners spanning depth in 3D → wireframe box branch, not a Line.
    expect(
      outlinePoints(annotation(AnnotationKind.Rectangle, [[0, 0, 0], [4, 4, 4]]), false),
    ).toBeNull();
    expect(
      outlinePoints(annotation(AnnotationKind.Ellipse, [[0, 0, 0], [4, 4, 4]]), false),
    ).toBeNull();
  });

  it("a flattened rectangle closes its corner loop at the drawing z", () => {
    const points = outlinePoints(
      annotation(AnnotationKind.Rectangle, [[0, 0, 5], [4, 2, 5]]),
      true,
    )!;
    const z = getVectorPoint([0, 0, 5], true)[2]; // the flat view's render z
    expect(points).toEqual([
      [0, 0, z],
      [4, 0, z],
      [4, 2, z],
      [0, 2, z],
      [0, 0, z],
    ]);
  });

  it("a polygon closes; a path stays open", () => {
    const vectors = [
      [0, 0, 0],
      [1, 0, 0],
      [1, 1, 0],
    ];
    const polygon = outlinePoints(annotation(AnnotationKind.Polygon, vectors), false)!;
    const path = outlinePoints(annotation(AnnotationKind.Path, vectors), false)!;
    expect(polygon).toHaveLength(4);
    expect(polygon[3]).toEqual(polygon[0]);
    expect(path).toHaveLength(3);
  });

  it("a flattened ellipse rings with a closing point", () => {
    const points = outlinePoints(
      annotation(AnnotationKind.Ellipse, [[0, 0, 0], [4, 2, 0]]),
      true,
    )!;
    expect(points).toHaveLength(ELLIPSE_SEGMENTS + 1);
    expect(points[ELLIPSE_SEGMENTS]).toEqual(points[0]);
  });
});

describe("buildOutlineBatches", () => {
  const roiOf = (id: string) => ({ id });

  it("groups by stroke width, lays segments contiguously, and colors selection", () => {
    const entries = [
      {
        annotation: annotation(AnnotationKind.Line, [[0, 0, 0], [1, 0, 0], [2, 0, 0]], {
          id: "thin",
        }),
        roi: roiOf("thin"),
      },
      {
        annotation: annotation(AnnotationKind.Line, [[0, 1, 0], [1, 1, 0]], {
          id: "thick",
          strokeWidth: 3,
        } as Partial<SceneAnnotationFragment>),
        roi: roiOf("thick"),
      },
      {
        annotation: annotation(AnnotationKind.Line, [[0, 2, 0], [1, 2, 0]], { id: "selected" }),
        roi: roiOf("selected"),
      },
    ];
    const batches = buildOutlineBatches(entries, false);
    expect(batches).toHaveLength(2);

    const thin = batches.find((batch) => batch.lineWidth === 1.5)!;
    const thick = batches.find((batch) => batch.lineWidth === 3)!;
    // 2 segments from "thin" + 1 from "selected"; positions are 6 floats/segment.
    expect(thin.segmentCount).toBe(3);
    expect(thin.positions).toHaveLength(18);
    expect(thin.ranges).toEqual([
      { start: 0, end: 2, roi: entries[0].roi },
      { start: 2, end: 3, roi: entries[2].roi },
    ]);
    expect(thick.segmentCount).toBe(1);

    // GEOMETRY is selection-independent; the highlight is a color-only pass.
    const active = new THREE.Color(ACTIVE_STROKE);
    const idle = new THREE.Color(DEFAULT_STROKE);
    const colors = batchColors(thin, (id) => id === "selected");
    expect(colors).toHaveLength(3 * STROKE_FLOATS);
    expect(colors[0]).toBeCloseTo(idle.r);
    expect(colors[2 * STROKE_FLOATS]).toBeCloseTo(active.r);
    expect(colors[2 * STROKE_FLOATS + 1]).toBeCloseTo(active.g);
    // A selection change re-tints without touching the positions.
    const none = batchColors(thin, () => false);
    expect(none[2 * STROKE_FLOATS]).toBeCloseTo(idle.r);
    // The hovered shape wears the hover tint — unless it is selected.
    const hover = new THREE.Color(HOVER_STROKE);
    const hovered = batchColors(thin, () => false, "selected");
    expect(hovered[2 * STROKE_FLOATS]).toBeCloseTo(hover.r);
    expect(hovered[2 * STROKE_FLOATS + 2]).toBeCloseTo(hover.b);
    expect(hovered[0]).toBeCloseTo(idle.r);
    const both = batchColors(thin, (id) => id === "selected", "selected");
    expect(both[2 * STROKE_FLOATS]).toBeCloseTo(active.r);
    // A shape being drawn grays out every other one, selected and hovered too.
    const muted = new THREE.Color(MUTED_STROKE);
    const grayed = batchColors(thin, (id) => id === "selected", "selected", true);
    expect(grayed[0]).toBeCloseTo(muted.r);
    expect(grayed[2 * STROKE_FLOATS]).toBeCloseTo(muted.r);
    expect(grayed[2 * STROKE_FLOATS + 2]).toBeCloseTo(muted.b);
    expect(both[2 * STROKE_FLOATS + 1]).toBeCloseTo(active.g);
  });

  it("sectioned ellipsoids stay OUT of the static batch — their ring moves with the plane", () => {
    // Depth-bearing ellipse in the flat view: the sectioned batch's, not this one.
    expect(
      outlinePoints(annotation(AnnotationKind.Ellipse, [[0, 0, 0], [4, 2, 6]]), true),
    ).toBeNull();
    // Flat ellipse (no depth): batched as before.
    expect(
      outlinePoints(annotation(AnnotationKind.Ellipse, [[0, 0, 0], [4, 2, 0]]), true),
    ).not.toBeNull();
  });

  it("skips shapes without a fat line (points, 3D boxes)", () => {
    const batches = buildOutlineBatches(
      [
        { annotation: annotation(AnnotationKind.Point, [[0, 0, 0]]), roi: roiOf("p") },
        {
          annotation: annotation(AnnotationKind.Rectangle, [[0, 0, 0], [4, 4, 4]]),
          roi: roiOf("box"),
        },
      ],
      false,
    );
    expect(batches).toHaveLength(0);
  });
});

describe("sectioned outlines", () => {
  const roiOf = (id: string) => ({ id });
  const ellipsoid = annotation(AnnotationKind.Sphere, [[0, 0, 0], [4, 2, 6]], { id: "s" });

  it("only depth-bearing ellipses in the flat view are sectioned", () => {
    expect(isSectionedEllipse(ellipsoid, true)).toBe(true);
    expect(isSectionedEllipse(ellipsoid, false)).toBe(false); // 3D: a mesh
    expect(
      isSectionedEllipse(annotation(AnnotationKind.Ellipse, [[0, 0, 0], [4, 2, 0]]), true),
    ).toBe(false);
    expect(
      sectionedOutlinePoints(annotation(AnnotationKind.Ellipse, [[0, 0, 0], [4, 2, 0]]), true, 0),
    ).toBeNull();
  });

  it("the ring follows the plane: full at the equator, clamped past the pole", () => {
    // Center z 3, radius z 3; radii 2 x 1 around (2, 1).
    const equator = sectionedOutlinePoints(ellipsoid, true, 3)!;
    expect(equator).toHaveLength(ELLIPSE_SEGMENTS + 1);
    expect(equator[ELLIPSE_SEGMENTS]).toEqual(equator[0]);
    expect(equator[0][0]).toBeCloseTo(4);
    const pastPole = sectionedOutlinePoints(ellipsoid, true, 100)!;
    expect(pastPole[0][0]).toBeCloseTo(2 + 2 * 0.05);
    // No plane (scene without a z stack): unscaled.
    expect(sectionedOutlinePoints(ellipsoid, true, null)![0][0]).toBeCloseTo(4);
  });

  it("batches the rings per stroke width, with roi ranges", () => {
    const batches = buildSectionedOutlineBatches(
      [
        { annotation: ellipsoid, roi: roiOf("s") },
        // Not sectioned: skipped by the sectioned builder.
        { annotation: annotation(AnnotationKind.Line, [[0, 0, 0], [1, 0, 0]]), roi: roiOf("l") },
      ],
      true,
      3,
    );
    expect(batches).toHaveLength(1);
    expect(batches[0].segmentCount).toBe(ELLIPSE_SEGMENTS);
    expect(batches[0].ranges).toEqual([{ start: 0, end: ELLIPSE_SEGMENTS, roi: { id: "s" } }]);
  });
});

describe("drawsOwnMesh", () => {
  it("is exactly the extruded 3D box / ellipsoid", () => {
    const box = annotation(AnnotationKind.Cube, [[0, 0, 0], [4, 4, 4]]);
    const sphere = annotation(AnnotationKind.Sphere, [[0, 0, 0], [4, 4, 4]]);
    expect(drawsOwnMesh(box, false)).toBe(true);
    expect(drawsOwnMesh(sphere, false)).toBe(true);
    expect(drawsOwnMesh(box, true)).toBe(false);
    expect(drawsOwnMesh(sphere, true)).toBe(false);
    const flatRect = annotation(AnnotationKind.Rectangle, [[0, 0, 0], [4, 4, 0]]);
    const polygon = annotation(AnnotationKind.Polygon, [[0, 0, 0], [4, 4, 4], [0, 4, 0]]);
    expect(drawsOwnMesh(flatRect, false)).toBe(false);
    expect(drawsOwnMesh(polygon, false)).toBe(false);
  });
});

describe("roiForSegment", () => {
  it("binary-searches the sorted ranges", () => {
    const ranges = [
      { start: 0, end: 2, roi: "a" },
      { start: 2, end: 3, roi: "b" },
      { start: 3, end: 7, roi: "c" },
    ];
    expect(roiForSegment(ranges, 0)).toBe("a");
    expect(roiForSegment(ranges, 1)).toBe("a");
    expect(roiForSegment(ranges, 2)).toBe("b");
    expect(roiForSegment(ranges, 6)).toBe("c");
    expect(roiForSegment(ranges, 7)).toBeNull();
    expect(roiForSegment(ranges, undefined)).toBeNull();
    expect(roiForSegment([], 0)).toBeNull();
  });
});

describe("tintRanges", () => {
  const rect = (id: string) =>
    annotation(AnnotationKind.Rectangle, [[0, 0, 0], [1, 1, 0]], { id });
  const batch = buildOutlineBatches(
    [
      { annotation: rect("a"), roi: "a" },
      { annotation: rect("b"), roi: "b" },
      { annotation: rect("c"), roi: "c" },
    ],
    true,
  )[0];

  it("reports all on the first pass, then only what changed, then nothing", () => {
    const tints = createRangeTints(batch.segmentCount * STROKE_FLOATS, batch.ranges.length);
    const pass = (selected: string | null, hovered: string | null) =>
      tintRanges(
        tints,
        batch.ranges,
        STROKE_FLOATS,
        strokeColorOf(batch, (id) => id === selected, hovered),
      );
    expect(pass(null, null)).toBe("all");
    expect(pass(null, null)).toBe("none");
    expect(pass(null, "b")).toEqual([
      { start: batch.ranges[1].start * STROKE_FLOATS, count: 4 * STROKE_FLOATS },
    ]);
    expect(pass("a", "c")).toHaveLength(3);
  });

  it("any sequence of passes equals a buffer built from nothing", () => {
    const tints = createRangeTints(batch.segmentCount * STROKE_FLOATS, batch.ranges.length);
    const ids = [null, "a", "b", "c"];
    let seed = 5;
    const pick = () => ids[(seed = (seed * 16807) % 2147483647) % ids.length];
    for (let i = 0; i < 200; i++) {
      const selected = pick();
      const hovered = pick();
      const muted = i % 17 === 0;
      const isActive = (id: string) => id === selected;
      tintRanges(
        tints,
        batch.ranges,
        STROKE_FLOATS,
        strokeColorOf(batch, isActive, hovered, muted),
      );
      expect(Array.from(tints.colors)).toEqual(
        Array.from(batchColors(batch, isActive, hovered, muted)),
      );
    }
  });
});

describe("markTinted", () => {
  const attribute = () => {
    const made = new THREE.BufferAttribute(new Float32Array(30), 3);
    made.needsUpdate = false;
    return made;
  };

  it("adds to what a pass before the next frame left pending", () => {
    const made = attribute();
    markTinted(made, [{ start: 0, count: 3 }]);
    markTinted(made, [{ start: 6, count: 3 }]);
    expect(made.updateRanges).toEqual([
      { start: 0, count: 3 },
      { start: 6, count: 3 },
    ]);
  });

  it("all covers the array, and a later partial pass does not narrow it", () => {
    const made = attribute();
    markTinted(made, "all");
    markTinted(made, [{ start: 6, count: 3 }]);
    expect(made.updateRanges[0]).toEqual({ start: 0, count: 30 });
    expect(made.updateRanges).toHaveLength(2);
  });

  it("does not ask for an upload when nothing changed", () => {
    const made = attribute();
    const version = made.version;
    markTinted(made, "none");
    expect(made.version).toBe(version);
    expect(made.updateRanges).toHaveLength(0);
  });
});
