// @vitest-environment jsdom
// (only because the tool map lives beside `AnnotationKind`, which pulls the Apollo
// barrel — the module under test is pure)
import { describe, expect, it } from "vitest";
import {
  ELLIPSE_SEGMENTS,
  ellipseOutline,
  polylineOutline,
  rectangleOutline,
  roiOutline,
} from "./roiOutline";
import {
  DRAWING_TOOL_TO_ROI_KIND,
  type DrawingTool,
} from "./roiDrawingStore";

/**
 * The invariant that matters most here: an ellipse's point count does not depend
 * on its size. That is what lets `platform/draw/PreviewLine.tsx` rewrite the
 * border in place while you drag instead of reallocating the vertex buffer.
 */

const a = { x: 0, y: 0 };
const b = { x: 10, y: 4 };

/** The complete tool set, by type — the map is a total Record<DrawingTool, …>. */
const ALL_TOOLS = Object.keys(DRAWING_TOOL_TO_ROI_KIND) as DrawingTool[];

describe("rectangleOutline", () => {
  it("is closed, so the border has no seam", () => {
    const outline = rectangleOutline(a, b, 2);
    expect(outline).toHaveLength(5);
    expect(outline[4]).toEqual(outline[0]);
  });

  it("walks the corners in order at the given z", () => {
    expect(rectangleOutline(a, b, 2)).toEqual([
      [0, 0, 2],
      [10, 0, 2],
      [10, 4, 2],
      [0, 4, 2],
      [0, 0, 2],
    ]);
  });

  it("works when the drag runs up and to the left", () => {
    const outline = rectangleOutline({ x: 10, y: 4 }, { x: 0, y: 0 }, 0);
    expect(outline).toHaveLength(5);
    expect(outline[4]).toEqual(outline[0]);
  });
});

describe("ellipseOutline", () => {
  it("has a point count independent of size — the in-place fast path depends on it", () => {
    const small = ellipseOutline({ x: 0, y: 0 }, { x: 1, y: 1 }, 0);
    const huge = ellipseOutline({ x: -5000, y: -5000 }, { x: 5000, y: 5000 }, 0);

    expect(small).toHaveLength(ELLIPSE_SEGMENTS + 1);
    expect(huge).toHaveLength(small.length);
  });

  it("is closed", () => {
    const outline = ellipseOutline(a, b, 0);
    expect(outline[outline.length - 1][0]).toBeCloseTo(outline[0][0]);
    expect(outline[outline.length - 1][1]).toBeCloseTo(outline[0][1]);
  });

  it("puts every point on the ellipse inscribed in the drag rectangle", () => {
    const outline = ellipseOutline({ x: 0, y: 0 }, { x: 10, y: 4 }, 0);
    const [cx, cy, rx, ry] = [5, 2, 5, 2];

    for (const [x, y] of outline) {
      const norm = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2;
      expect(norm).toBeCloseTo(1);
    }
  });

  it("degenerates without NaN when the drag has no width", () => {
    const outline = ellipseOutline({ x: 3, y: 0 }, { x: 3, y: 8 }, 1);
    for (const [x, y, z] of outline) {
      expect(Number.isFinite(x)).toBe(true);
      expect(Number.isFinite(y)).toBe(true);
      expect(z).toBe(1);
    }
  });

  it("honours a custom segment count", () => {
    expect(ellipseOutline(a, b, 0, 8)).toHaveLength(9);
  });
});

describe("polylineOutline", () => {
  it("applies z to every point", () => {
    expect(polylineOutline([a, b], 9)).toEqual([
      [0, 0, 9],
      [10, 4, 9],
    ]);
  });

  it("closes only once there is an area to close", () => {
    expect(polylineOutline([a, b], 0, true)).toHaveLength(2);
    expect(polylineOutline([a, b, { x: 5, y: 9 }], 0, true)).toHaveLength(4);
  });

  // Probe-placed vertices each sit at their own depth — a path traced across a
  // surface in 3D is not a polyline on a plane.
  it("lets a point keep its own z", () => {
    expect(polylineOutline([{ ...a, z: 2 }, b, { ...a, z: -3 }], 9)).toEqual([
      [0, 0, 2],
      [10, 4, 9],
      [0, 0, -3],
    ]);
  });

  it("closes back onto the first point's own z", () => {
    const closed = polylineOutline(
      [{ ...a, z: 2 }, { ...b, z: 5 }, { x: 5, y: 9, z: 8 }],
      0,
      true,
    );
    expect(closed[0]).toEqual([0, 0, 2]);
    expect(closed[3]).toEqual([0, 0, 2]);
  });
});

describe("roiOutline", () => {
  // Guards the missing `default` in the switch: every tool must return an array.
  it("returns an array for every drawing tool, never undefined", () => {
    for (const tool of ALL_TOOLS) {
      const outline = roiOutline(tool, [a, b], 7);
      expect(Array.isArray(outline)).toBe(true);
    }
  });

  it("strokes every tool except POINT, all on the requested plane", () => {
    for (const tool of ALL_TOOLS) {
      const outline = roiOutline(tool, [a, b], 7);
      if (tool === "POINT") {
        expect(outline).toEqual([]);
        continue;
      }
      expect(outline.length).toBeGreaterThanOrEqual(2);
      for (const point of outline) expect(point[2]).toBe(7);
    }
  });

  it("keeps the corner-pair tools planar even when their corners differ in z", () => {
    // Two probed corners describe a BOX; its preview is the footprint at the
    // plane the caller asked for. The AnnotationLayer extrudes the committed
    // shape — that is where depth is drawn.
    for (const tool of ["RECTANGLE", "ELLIPSE", "SPHERE", "CUBE"] as const) {
      const outline = roiOutline(tool, [{ ...a, z: 1 }, { ...b, z: 40 }], 7);
      for (const point of outline) expect(point[2]).toBe(7);
    }
  });

  it("has nothing to stroke below two points", () => {
    for (const tool of ALL_TOOLS) {
      expect(roiOutline(tool, [a], 0)).toEqual([]);
      expect(roiOutline(tool, [], 0)).toEqual([]);
    }
  });

  it("leaves a polygon open when asked — the preview draws its closing edge separately", () => {
    const points = [a, b, { x: 5, y: 9 }];
    expect(roiOutline("POLYGON", points, 0, { closePolygon: false })).toHaveLength(3);
    expect(roiOutline("POLYGON", points, 0)).toHaveLength(4);
  });

  it("never closes a path", () => {
    expect(roiOutline("PATH", [a, b, { x: 5, y: 9 }], 0)).toHaveLength(3);
  });

  it("ignores points beyond the first two for a line", () => {
    expect(roiOutline("LINE", [a, b, { x: 99, y: 99 }], 0)).toHaveLength(2);
  });
});
