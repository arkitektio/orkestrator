import { describe, expect, it } from "vitest";
import { annotationMarks, type AnnotationLike } from "./annotationGeometry";

const TIME = { name: "t", type: "TIME", order: 0 };
const VALUE = { name: "v", type: "VALUE", order: 1 };
const world = { axes: [TIME] };
const identity = { matrix: [[1, 0]], inputAxes: ["t"], outputAxes: ["t"], total: true };

const a = (kind: string, vectors: number[][], extra: Partial<AnnotationLike> = {}): AnnotationLike => ({
  id: `${kind}-${vectors.flat().join(",")}`,
  kind,
  vectors,
  ...extra,
});

describe("annotationMarks", () => {
  it("draws an EVENT as an instant on the world clock", () => {
    const marks = annotationMarks({
      annotations: [a("EVENT", [[120]])],
      system: { axes: [TIME] },
      asAffine: identity,
      world,
    });
    expect(marks.events.map((e) => e.time)).toEqual([120]);
  });

  it("places marks through the view's placement, not raw coordinates", () => {
    // A collection drawn over a segment clock that starts 1000 ms into the world.
    const marks = annotationMarks({
      annotations: [a("EVENT", [[5]])],
      system: { axes: [TIME] },
      asAffine: { matrix: [[1, 1000]], inputAxes: ["t"], outputAxes: ["t"], total: true },
      world,
    });
    expect(marks.events[0].time).toBe(1005);
  });

  it("expands EVENTS into one instant each", () => {
    const marks = annotationMarks({
      annotations: [a("EVENTS", [[1], [2], [3]])],
      system: { axes: [TIME] },
      asAffine: identity,
      world,
    });
    expect(marks.events.map((e) => e.time)).toEqual([1, 2, 3]);
  });

  it("draws an EPOCH as an ordered span", () => {
    const marks = annotationMarks({
      annotations: [a("EPOCH", [[50], [10]])],
      system: { axes: [TIME] },
      asAffine: identity,
      world,
    });
    expect(marks.epochs[0]).toMatchObject({ start: 10, end: 50, rowScoped: false });
  });

  it("reads time from the right column when the system also has a VALUE axis", () => {
    const marks = annotationMarks({
      annotations: [a("EVENT", [[77, -60]])],
      system: { axes: [TIME, VALUE] },
      asAffine: identity,
      world,
    });
    expect(marks.events[0].time).toBe(77);
  });

  it("draws a row-scoped shape by its time extent and COUNTS it, rather than guessing a row", () => {
    // The schema cannot say which view's row a value belongs to.
    const marks = annotationMarks({
      annotations: [a("LINE", [[10, -70], [12, 30]])],
      system: { axes: [TIME, VALUE] },
      asAffine: identity,
      world,
    });
    expect(marks.rowScoped).toBe(1);
    expect(marks.epochs[0]).toMatchObject({ start: 10, end: 12, rowScoped: true });
  });

  it("skips everything when the view has no placement", () => {
    const marks = annotationMarks({
      annotations: [a("EVENT", [[1]]), a("EVENT", [[2]])],
      system: { axes: [TIME] },
      asAffine: null,
      world,
    });
    expect(marks.skipped).toBe(2);
    expect(marks.events).toHaveLength(0);
  });

  it("uses the stroke colour, falling back to the fill", () => {
    const marks = annotationMarks({
      annotations: [a("EVENT", [[1]], { strokeColor: null, fillColor: [255, 0, 0] })],
      system: { axes: [TIME] },
      asAffine: identity,
      world,
    });
    expect(marks.events[0].color).toBe("rgb(255, 0, 0)");
  });
});
