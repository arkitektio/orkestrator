// @vitest-environment jsdom
// (the AnnotationKind enum import pulls in modules that touch `window`)
import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { AnnotationKind, type SceneAnnotationFragment } from "@/mikro/api/graphql";
import { ELLIPSE_SEGMENTS, roiForSegment } from "./annotationBatch";
import { ACTIVE_STROKE, DEFAULT_STROKE } from "./annotationStyle";
import {
  buildInteriorBatches,
  interiorColors,
  interiorTriangles,
  sectionedInteriorTriangles,
  staticInteriorTriangles,
} from "./interiorBatch";

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

/** Sum of the triangles' areas (xy), to check a surface covers the shape. */
const area = (triangles: number[]): number => {
  let total = 0;
  for (let i = 0; i < triangles.length; i += 9) {
    const [ax, ay, , bx, by, , cx, cy] = triangles.slice(i, i + 9);
    total += Math.abs((bx - ax) * (cy - ay) - (cx - ax) * (by - ay)) / 2;
  }
  return total;
};

describe("interiorTriangles", () => {
  it("a flat rectangle is two triangles covering it", () => {
    const triangles = interiorTriangles(
      annotation(AnnotationKind.Rectangle, [[0, 0, 5], [4, 2, 5]]),
      false,
      null,
    )!;
    expect(triangles).toHaveLength(18);
    expect(area(triangles)).toBeCloseTo(8);
  });

  it("an ellipse is a fan over its ring", () => {
    const triangles = interiorTriangles(
      annotation(AnnotationKind.Ellipse, [[0, 0, 0], [4, 2, 0]]),
      true,
      null,
    )!;
    expect(triangles).toHaveLength(ELLIPSE_SEGMENTS * 9);
    // A 48-gon inscribed in the 2 x 1 ellipse: just under pi * 2 * 1.
    expect(area(triangles)).toBeGreaterThan(Math.PI * 2 * 0.99);
    expect(area(triangles)).toBeLessThan(Math.PI * 2);
  });

  it("a polygon triangulates (concave too); fewer than 3 vertices has no inside", () => {
    // An L: 3x3 square minus its 2x2 top-right corner → area 5.
    const concave = annotation(AnnotationKind.Polygon, [
      [0, 0, 0],
      [3, 0, 0],
      [3, 1, 0],
      [1, 1, 0],
      [1, 3, 0],
      [0, 3, 0],
    ]);
    expect(area(interiorTriangles(concave, false, null)!)).toBeCloseTo(5);
    expect(
      interiorTriangles(annotation(AnnotationKind.Polygon, [[0, 0, 0], [1, 0, 0]]), false, null),
    ).toBeNull();
  });

  it("lines, paths, points and 3D meshes have no batched interior", () => {
    const line = annotation(AnnotationKind.Line, [[0, 0, 0], [1, 1, 0]]);
    const path = annotation(AnnotationKind.Path, [[0, 0, 0], [1, 1, 0], [2, 0, 0]]);
    const box = annotation(AnnotationKind.Cube, [[0, 0, 0], [4, 4, 4]]);
    const sphere = annotation(AnnotationKind.Sphere, [[0, 0, 0], [4, 4, 4]]);
    expect(interiorTriangles(line, false, null)).toBeNull();
    expect(interiorTriangles(path, false, null)).toBeNull();
    expect(interiorTriangles(box, false, null)).toBeNull();
    expect(interiorTriangles(sphere, false, null)).toBeNull();
  });

  it("a sectioned ellipsoid is only in the sectioned set, sized to the plane", () => {
    const ellipsoid = annotation(AnnotationKind.Sphere, [[0, 0, 0], [4, 2, 6]]);
    expect(staticInteriorTriangles(ellipsoid, true)).toBeNull();
    const equator = sectionedInteriorTriangles(ellipsoid, true, 3)!;
    const offCenter = sectionedInteriorTriangles(ellipsoid, true, 4.5)!;
    expect(area(offCenter)).toBeLessThan(area(equator));
    // A flat ellipse is static, never sectioned.
    const flat = annotation(AnnotationKind.Ellipse, [[0, 0, 0], [4, 2, 0]]);
    expect(sectionedInteriorTriangles(flat, true, 3)).toBeNull();
    expect(staticInteriorTriangles(flat, true)).not.toBeNull();
  });
});

describe("buildInteriorBatches", () => {
  const roiOf = (id: string) => ({ id });
  const flatOf = (entry: SceneAnnotationFragment) => staticInteriorTriangles(entry, true);

  it("splits filled (per opacity) from pick-only, with triangle ranges per roi", () => {
    const entries = [
      {
        annotation: annotation(AnnotationKind.Rectangle, [[0, 0, 0], [1, 1, 0]], { id: "open" }),
        roi: roiOf("open"),
      },
      {
        annotation: annotation(AnnotationKind.Rectangle, [[0, 0, 0], [1, 1, 0]], {
          id: "filled",
          filled: true,
        } as Partial<SceneAnnotationFragment>),
        roi: roiOf("filled"),
      },
      {
        annotation: annotation(AnnotationKind.Ellipse, [[0, 0, 0], [2, 2, 0]], {
          id: "filled2",
          filled: true,
        } as Partial<SceneAnnotationFragment>),
        roi: roiOf("filled2"),
      },
      {
        annotation: annotation(AnnotationKind.Line, [[0, 0, 0], [1, 1, 0]], { id: "line" }),
        roi: roiOf("line"),
      },
    ];
    const batches = buildInteriorBatches(entries, flatOf);
    expect(batches).toHaveLength(2);

    const pick = batches.find((batch) => !batch.filled)!;
    expect(pick.key).toBe("pick");
    expect(pick.ranges).toEqual([{ start: 0, end: 2, roi: entries[0].roi }]);

    const filled = batches.find((batch) => batch.filled)!;
    expect(filled.triangleCount).toBe(2 + ELLIPSE_SEGMENTS);
    expect(filled.positions).toHaveLength(filled.triangleCount * 9);
    expect(filled.ranges).toEqual([
      { start: 0, end: 2, roi: entries[1].roi },
      { start: 2, end: 2 + ELLIPSE_SEGMENTS, roi: entries[2].roi },
    ]);
    // A picked triangle maps back to its roi.
    expect(roiForSegment(filled.ranges, 1)).toBe(entries[1].roi);
    expect(roiForSegment(filled.ranges, 2)).toBe(entries[2].roi);

    // An unnamed fill follows the stroke — which the selection overrides.
    const idle = new THREE.Color(DEFAULT_STROKE);
    const active = new THREE.Color(ACTIVE_STROKE);
    const colors = interiorColors(filled, (id) => id === "filled2");
    expect(colors).toHaveLength(filled.triangleCount * 9);
    expect(colors[0]).toBeCloseTo(idle.r);
    expect(colors[2 * 9]).toBeCloseTo(active.r);
    expect(colors[2 * 9 + 2]).toBeCloseTo(active.b);
  });

  it("different fill opacities get different batches", () => {
    const rgba = (alpha: number) => ({ filled: true, fillColor: [255, 0, 0, alpha] });
    const batches = buildInteriorBatches(
      [
        {
          annotation: annotation(AnnotationKind.Rectangle, [[0, 0, 0], [1, 1, 0]], {
            id: "a",
            ...rgba(51),
          } as Partial<SceneAnnotationFragment>),
          roi: roiOf("a"),
        },
        {
          annotation: annotation(AnnotationKind.Rectangle, [[0, 0, 0], [1, 1, 0]], {
            id: "b",
            ...rgba(255),
          } as Partial<SceneAnnotationFragment>),
          roi: roiOf("b"),
        },
      ],
      flatOf,
    );
    expect(batches.map((batch) => batch.opacity).sort()).toEqual([0.2, 1]);
  });
});
