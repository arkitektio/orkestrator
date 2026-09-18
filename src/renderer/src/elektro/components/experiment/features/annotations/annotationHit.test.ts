import { describe, expect, it } from "vitest";
import type { AnnotationMarks } from "./annotationGeometry";
import { hitAnnotation, segmentDistance } from "./annotationHit";

const empty: AnnotationMarks = { events: [], epochs: [], rows: [], rowScoped: 0, skipped: 0 };
// 1000 px over [0, 1000): 1 px per time unit. 2 rows over 200 px: 100 px per row.
const ctx = {
  window: { start: 0, end: 1000 },
  widthPx: 1000,
  heightPx: 200,
  rowCount: 2,
  bands: { "tr:0": { bottom: -2, top: -1 } },
  climOf: () => ({ lo: 0, hi: 10 }),
};

describe("hitAnnotation", () => {
  it("measures point-to-segment distance", () => {
    expect(segmentDistance(5, 3, 0, 0, 10, 0)).toBe(3);
    expect(segmentDistance(-4, 3, 0, 0, 10, 0)).toBe(5);
  });

  it("hits an instant within the slop, by annotation id", () => {
    const marks = {
      a: { ...empty, events: [{ id: "x:1", annotationId: "x", name: null, time: 500, color: null }] },
    };
    expect(hitAnnotation(marks, ["a"], 503, 50, ctx)).toBe("x");
    expect(hitAnnotation(marks, ["a"], 510, 50, ctx)).toBeNull();
    // A hidden layer is not hit.
    expect(hitAnnotation(marks, [], 500, 50, ctx)).toBeNull();
  });

  it("prefers the narrowest epoch", () => {
    const epoch = (id: string, start: number, end: number) => ({
      id, name: null, start, end, color: null, rowScoped: false,
    });
    const marks = { a: { ...empty, epochs: [epoch("long", 0, 900), epoch("short", 400, 450)] } };
    expect(hitAnnotation(marks, ["a"], 420, 50, ctx)).toBe("short");
    expect(hitAnnotation(marks, ["a"], 100, 50, ctx)).toBe("long");
  });

  it("hits a value shape near its polyline, in its row", () => {
    // Row band y ∈ [-2, -1] → pixels 100..200; value 0 at the bottom (200 px), 10 at the top (100 px).
    const marks = {
      a: {
        ...empty,
        rows: [
          {
            traceLayerId: "tr",
            channel: 0,
            shapes: [
              { id: "line", name: null, kind: "LINE" as const, times: [100, 300], values: [0, 10], closed: false, color: null },
            ],
          },
        ],
      },
    };
    // Midpoint: t=200 → x=200, value 5 → y=150.
    expect(hitAnnotation(marks, ["a"], 200, 152, ctx)).toBe("line");
    expect(hitAnnotation(marks, ["a"], 200, 170, ctx)).toBeNull();
  });

  it("a value shape wins over an instant it crosses", () => {
    const marks = {
      a: {
        ...empty,
        events: [{ id: "e", annotationId: "e", name: null, time: 200, color: null }],
        rows: [
          {
            traceLayerId: "tr",
            channel: 0,
            shapes: [
              { id: "line", name: null, kind: "LINE" as const, times: [100, 300], values: [0, 10], closed: false, color: null },
            ],
          },
        ],
      },
    };
    expect(hitAnnotation(marks, ["a"], 200, 150, ctx)).toBe("line");
  });
});
