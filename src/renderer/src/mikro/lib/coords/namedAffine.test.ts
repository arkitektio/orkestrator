import { describe, expect, it } from "vitest";
import {
  isIdentityDelta,
  leftMultiplyWorldDelta,
  namedAffineOf,
  reorderAxes,
  rightMultiplyInverseDelta,
  touchedSlots,
  type NamedAffine,
} from "./namedAffine";
import { invert4, placementToSpatialAffine } from "@/core/lib/scene/coords/transformGraph";

type M = number[][];

const I4: M = [
  [1, 0, 0, 0],
  [0, 1, 0, 0],
  [0, 0, 1, 0],
  [0, 0, 0, 1],
];

const mul4 = (a: M, b: M): M =>
  a.map((_, r) => a.map((__, c) => a[r].reduce((sum, v, k) => sum + v * b[k][c], 0)));

/** Reduce the way the renderer does; null means identity there. */
const reduce = (affine: NamedAffine, dataSpatial: (string | null)[], worldSpatial: (string | null)[]): M =>
  placementToSpatialAffine(affine, dataSpatial, worldSpatial) ?? I4;

const expectClose = (actual: M, expected: M) => {
  expect(actual.length).toBe(expected.length);
  actual.forEach((row, r) =>
    row.forEach((value, c) => expect(value).toBeCloseTo(expected[r][c], 9)),
  );
};

/** Rotate 30° about z, scale 2, translate (5, -3, 0) — touches x and y only. */
const c30 = Math.cos(Math.PI / 6);
const s30 = Math.sin(Math.PI / 6);
const IN_PLANE: M = [
  [2 * c30, -2 * s30, 0, 5],
  [2 * s30, 2 * c30, 0, -3],
  [0, 0, 1, 0],
  [0, 0, 0, 1],
];

/** Rotate 90° about x: y → z. Touches y and z. */
const TILT: M = [
  [1, 0, 0, 0],
  [0, 0, -1, 0],
  [0, 1, 0, 7],
  [0, 0, 0, 1],
];

describe("namedAffineOf", () => {
  it("reads a bare affine verbatim", () => {
    const affine = namedAffineOf({
      __typename: "AffineTransformation",
      inputAxes: ["y", "x"],
      outputAxes: ["y", "x"],
      affine: [
        [2, 0, 10],
        [0, 3, 20],
      ],
    });
    expect(affine).toEqual({
      inputAxes: ["y", "x"],
      outputAxes: ["y", "x"],
      matrix: [
        [2, 0, 10],
        [0, 3, 20],
      ],
    });
  });

  it("builds scale and translation leaves in inputAxes order", () => {
    expect(
      namedAffineOf({ __typename: "ScaleTransformation", inputAxes: ["z", "y", "x"], scale: [5, 0.5, 0.25] })
        ?.matrix,
    ).toEqual([
      [5, 0, 0, 0],
      [0, 0.5, 0, 0],
      [0, 0, 0.25, 0],
    ]);
    expect(
      namedAffineOf({ __typename: "TranslationTransformation", inputAxes: ["y", "x"], translation: [4, 9] })
        ?.matrix,
    ).toEqual([
      [1, 0, 4],
      [0, 1, 9],
    ]);
  });

  it("refuses a mis-sized payload instead of tolerating it", () => {
    // evalTransform reads this against outputAxes with a warning; re-saving it
    // would launder the misreading into the stored edge.
    expect(
      namedAffineOf({
        __typename: "ScaleTransformation",
        inputAxes: ["c", "z", "y", "x"],
        outputAxes: ["z", "y", "x"],
        scale: [1, 2, 3],
      }),
    ).toBeNull();
    expect(
      namedAffineOf({
        __typename: "AffineTransformation",
        inputAxes: ["y", "x"],
        outputAxes: ["c", "y", "x"],
        affine: [
          [1, 0, 0],
          [0, 1, 0],
        ],
      }),
    ).toBeNull();
  });

  it("returns null for kinds with no matrix", () => {
    expect(namedAffineOf({ __typename: "FieldTransformation" })).toBeNull();
    expect(namedAffineOf({ __typename: "MapAxisTransformation" })).toBeNull();
    expect(namedAffineOf({ __typename: "UnmappableTransformation" })).toBeNull();
    expect(namedAffineOf(null)).toBeNull();
  });

  it("composes a sequence first to last", () => {
    // Scale then translate: x' = 2x + 10.
    const affine = namedAffineOf({
      __typename: "SequenceTransformation",
      inputAxes: ["y", "x"],
      outputAxes: ["y", "x"],
      transformations: [
        { __typename: "ScaleTransformation", inputAxes: ["y", "x"], scale: [3, 2] },
        { __typename: "TranslationTransformation", inputAxes: ["y", "x"], translation: [7, 10] },
      ],
    });
    expect(affine?.matrix).toEqual([
      [3, 0, 7],
      [0, 2, 10],
    ]);
  });

  it("lays BY_DIMENSION children side by side, keeping the non-spatial row", () => {
    const affine = namedAffineOf({
      __typename: "ByDimensionTransformation",
      inputAxes: ["t", "y", "x"],
      outputAxes: ["t", "y", "x"],
      transformations: [
        { __typename: "ScaleTransformation", inputAxes: ["t"], scale: [60] },
        {
          __typename: "AffineTransformation",
          inputAxes: ["y", "x"],
          outputAxes: ["y", "x"],
          affine: [
            [0.5, 0, 100],
            [0, 0.5, 200],
          ],
        },
      ],
    });
    expect(affine?.matrix).toEqual([
      [60, 0, 0, 0],
      [0, 0.5, 0, 100],
      [0, 0, 0.5, 200],
    ]);
  });

  it("treats BY_DIMENSION children as parallel, not sequential, under renaming", () => {
    // A swap: y→x and x→y. Sequentially the second child would read the
    // first's result and the swap would collapse onto one axis.
    const affine = namedAffineOf({
      __typename: "ByDimensionTransformation",
      inputAxes: ["y", "x"],
      outputAxes: ["y", "x"],
      transformations: [
        { __typename: "AffineTransformation", inputAxes: ["y"], outputAxes: ["x"], affine: [[1, 0]] },
        { __typename: "AffineTransformation", inputAxes: ["x"], outputAxes: ["y"], affine: [[1, 0]] },
      ],
    });
    expect(affine?.matrix).toEqual([
      [0, 1, 0],
      [1, 0, 0],
    ]);
  });

  it("handles a rank-changing, renaming affine (row,col → y,x)", () => {
    const affine = namedAffineOf({
      __typename: "ByDimensionTransformation",
      inputAxes: ["row", "col"],
      outputAxes: ["y", "x"],
      transformations: [
        {
          __typename: "AffineTransformation",
          inputAxes: ["row", "col"],
          outputAxes: ["y", "x"],
          affine: [
            [2, 0, 1],
            [0, 2, 1],
          ],
        },
      ],
    });
    expect(affine?.inputAxes).toEqual(["row", "col"]);
    expect(affine?.outputAxes).toEqual(["y", "x"]);
    expect(affine?.matrix).toEqual([
      [2, 0, 1],
      [0, 2, 1],
    ]);
  });
});

describe("touchedSlots", () => {
  it("is all-false for identity", () => {
    expect(touchedSlots(I4)).toEqual([false, false, false]);
    expect(isIdentityDelta(I4)).toBe(true);
  });
  it("marks both slots an off-diagonal couples, and translated slots", () => {
    expect(touchedSlots(IN_PLANE)).toEqual([true, true, false]);
    expect(touchedSlots(TILT)).toEqual([false, true, true]);
  });
});

describe("leftMultiplyWorldDelta", () => {
  const edge: NamedAffine = {
    inputAxes: ["t", "z", "y", "x"],
    outputAxes: ["t", "z", "y", "x"],
    matrix: [
      [60, 0, 0, 0, 5],
      [0, 4, 0, 0, 0],
      [0, 0, 0.5, 0, 10],
      [0, 0, 0, 0.5, 20],
    ],
  };
  const spatial = ["x", "y", "z"];

  it("round-trips through the renderer's reduction: reduce(E′) = D · reduce(E)", () => {
    const result = leftMultiplyWorldDelta(edge, IN_PLANE, { worldSpatial: spatial, dataSpatial: spatial });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.extended).toBe(false);
    expectClose(reduce(result.affine, spatial, spatial), mul4(IN_PLANE, reduce(edge, spatial, spatial)));
  });

  it("preserves the non-spatial row the spatial reduction would have dropped", () => {
    const result = leftMultiplyWorldDelta(edge, TILT, { worldSpatial: spatial, dataSpatial: spatial });
    if (!result.ok) throw new Error(result.reason);
    expect(result.affine.outputAxes).toEqual(["t", "z", "y", "x"]);
    expect(result.affine.matrix[0]).toEqual([60, 0, 0, 0, 5]);
  });

  it("leaves untouched slots exactly as they were", () => {
    const result = leftMultiplyWorldDelta(edge, IN_PLANE, { worldSpatial: spatial, dataSpatial: spatial });
    if (!result.ok) throw new Error(result.reason);
    expect(result.affine.matrix[1]).toEqual([0, 4, 0, 0, 0]); // z row
  });

  it("extends a y,x edge when 3D data is tilted out of plane", () => {
    const partial: NamedAffine = {
      inputAxes: ["y", "x"],
      outputAxes: ["y", "x"],
      matrix: [
        [0.5, 0, 10],
        [0, 0.5, 20],
      ],
    };
    const result = leftMultiplyWorldDelta(partial, TILT, { worldSpatial: spatial, dataSpatial: spatial });
    if (!result.ok) throw new Error(result.reason);
    expect(result.extended).toBe(true);
    expect(result.affine.outputAxes).toContain("z");
    expect(result.affine.inputAxes).toContain("z");
    // The z that used to pass through implicitly now does so explicitly, and
    // the reduction still agrees with D · reduce(E).
    expectClose(reduce(result.affine, spatial, spatial), mul4(TILT, reduce(partial, spatial, spatial)));
  });

  it("gives a plane a zero row, not a column, when the data has no such axis", () => {
    const flat: NamedAffine = {
      inputAxes: ["y", "x"],
      outputAxes: ["y", "x"],
      matrix: [
        [1, 0, 0],
        [0, 1, 0],
      ],
    };
    const result = leftMultiplyWorldDelta(flat, TILT, {
      worldSpatial: ["x", "y", "z"],
      dataSpatial: ["x", "y", null],
    });
    if (!result.ok) throw new Error(result.reason);
    expect(result.affine.inputAxes).toEqual(["y", "x"]);
    expect(result.affine.outputAxes).toEqual(["y", "x", "z"]);
    // TILT sends y → z (+7) and z → -y; the plane sits at z = 0.
    const z = result.affine.matrix[2];
    expect(z).toEqual([1, 0, 7]);
    expect(result.affine.matrix[0]).toEqual([0, 0, 0]); // y' = -z = 0
  });

  it("addresses renamed axes by NAME on each side", () => {
    const visium: NamedAffine = {
      inputAxes: ["row", "col"],
      outputAxes: ["y", "x"],
      matrix: [
        [2, 0, 1],
        [0, 2, 1],
      ],
    };
    const result = leftMultiplyWorldDelta(visium, IN_PLANE, {
      worldSpatial: ["x", "y", null],
      dataSpatial: ["col", "row", null],
    });
    if (!result.ok) throw new Error(result.reason);
    expectClose(
      reduce(result.affine, ["col", "row", null], ["x", "y", null]),
      mul4(IN_PLANE, reduce(visium, ["col", "row", null], ["x", "y", null])),
    );
  });

  it("refuses a delta along an axis the world does not have", () => {
    const result = leftMultiplyWorldDelta(edge, TILT, {
      worldSpatial: ["x", "y", null],
      dataSpatial: ["x", "y", null],
    });
    expect(result.ok).toBe(false);
  });

  it("is a no-op for the identity delta", () => {
    const result = leftMultiplyWorldDelta(edge, I4, { worldSpatial: spatial, dataSpatial: spatial });
    if (!result.ok) throw new Error(result.reason);
    expect(result.affine.matrix).toEqual(edge.matrix);
  });
});

describe("rightMultiplyInverseDelta", () => {
  const spatial = ["x", "y", "z"];
  // world → data, square and invertible.
  const edge: NamedAffine = {
    inputAxes: ["z", "y", "x"],
    outputAxes: ["z", "y", "x"],
    matrix: [
      [0.25, 0, 0, 1],
      [0, 2, 0, -4],
      [0, 0, 2, 6],
    ],
  };

  it("moves the INVERTED step by D: inverse(reduce(E′)) = D · inverse(reduce(E))", () => {
    const result = rightMultiplyInverseDelta(edge, IN_PLANE, { worldSpatial: spatial, dataSpatial: spatial });
    if (!result.ok) throw new Error(result.reason);
    const stepBefore = invert4(reduce(edge, spatial, spatial))!;
    const stepAfter = invert4(reduce(result.affine, spatial, spatial))!;
    expectClose(stepAfter, mul4(IN_PLANE, stepBefore));
  });

  it("refuses an out-of-plane delta when the data has no axis to keep it invertible", () => {
    const flat: NamedAffine = {
      inputAxes: ["y", "x"],
      outputAxes: ["y", "x"],
      matrix: [
        [1, 0, 0],
        [0, 1, 0],
      ],
    };
    const result = rightMultiplyInverseDelta(flat, TILT, {
      worldSpatial: ["x", "y", "z"],
      dataSpatial: ["x", "y", null],
    });
    expect(result.ok).toBe(false);
  });

  it("extends with an explicit pass-through when the data does have the axis", () => {
    const partial: NamedAffine = {
      inputAxes: ["y", "x"],
      outputAxes: ["y", "x"],
      matrix: [
        [2, 0, 0],
        [0, 2, 0],
      ],
    };
    const result = rightMultiplyInverseDelta(partial, TILT, { worldSpatial: spatial, dataSpatial: spatial });
    if (!result.ok) throw new Error(result.reason);
    expect(result.extended).toBe(true);
    const stepBefore = invert4(reduce(partial, spatial, spatial))!;
    const stepAfter = invert4(reduce(result.affine, spatial, spatial))!;
    expectClose(stepAfter, mul4(TILT, stepBefore));
  });

  it("refuses a singular delta", () => {
    const flatten: M = [
      [1, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 1, 0],
      [0, 0, 0, 1],
    ];
    expect(
      rightMultiplyInverseDelta(edge, flatten, { worldSpatial: spatial, dataSpatial: spatial }).ok,
    ).toBe(false);
  });
});

describe("reorderAxes", () => {
  it("permutes rows and columns together and keeps the translation last", () => {
    const affine: NamedAffine = {
      inputAxes: ["y", "x", "z"],
      outputAxes: ["y", "x", "z"],
      matrix: [
        [1, 2, 3, 10],
        [4, 5, 6, 20],
        [7, 8, 9, 30],
      ],
    };
    const ordered = reorderAxes(affine, { input: ["z", "y", "x"], output: ["z", "y", "x"] });
    expect(ordered.inputAxes).toEqual(["z", "y", "x"]);
    expect(ordered.matrix).toEqual([
      [9, 7, 8, 30],
      [3, 1, 2, 10],
      [6, 4, 5, 20],
    ]);
    const spatial = ["x", "y", "z"];
    expectClose(reduce(ordered, spatial, spatial), reduce(affine, spatial, spatial));
  });
});
