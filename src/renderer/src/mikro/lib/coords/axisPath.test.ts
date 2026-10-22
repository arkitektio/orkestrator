import { describe, expect, it } from "vitest";
import type { PathStep, PathTransformLike } from "./pathTypes";
import { applyPathToCoords, applyStepToCoords } from "./axisPath";

const step = (
  transformation: PathTransformLike | null,
  inverted = false,
): PathStep => ({ transformation, inverted });

describe("applyStepToCoords", () => {
  it("identity renames input axes to output axes", () => {
    const out = applyStepToCoords(
      step({
        __typename: "IdentityTransformation",
        inputAxes: ["y", "x"],
        outputAxes: ["row", "col"],
      }),
      { t: 5, y: 10, x: 20 },
    );
    expect(out).toEqual({ t: 5, row: 10, col: 20 });
  });

  it("scale multiplies forward and divides inverted", () => {
    const scale: PathTransformLike = {
      __typename: "ScaleTransformation",
      inputAxes: ["y", "x"],
      outputAxes: ["y", "x"],
      scale: [2, 4],
    };
    expect(applyStepToCoords(step(scale), { y: 3, x: 5 })).toEqual({ y: 6, x: 20 });
    expect(applyStepToCoords(step(scale, true), { y: 6, x: 20 })).toEqual({ y: 3, x: 5 });
  });

  it("translation adds forward and subtracts inverted", () => {
    const translation: PathTransformLike = {
      __typename: "TranslationTransformation",
      inputAxes: ["y", "x"],
      outputAxes: ["y", "x"],
      translation: [10, -2],
    };
    expect(applyStepToCoords(step(translation), { y: 1, x: 1 })).toEqual({ y: 11, x: -1 });
    expect(applyStepToCoords(step(translation, true), { y: 11, x: -1 })).toEqual({ y: 1, x: 1 });
  });

  it("affine applies rows over named axes, and inverts by solving", () => {
    // y' = 2y + 1, x' = 3x - 2
    const affine: PathTransformLike = {
      __typename: "AffineTransformation",
      inputAxes: ["y", "x"],
      outputAxes: ["y", "x"],
      affine: [
        [2, 0, 1],
        [0, 3, -2],
      ],
    };
    expect(applyStepToCoords(step(affine), { y: 2, x: 4, t: 7 })).toEqual({
      y: 5,
      x: 10,
      t: 7,
    });
    expect(applyStepToCoords(step(affine, true), { y: 5, x: 10, t: 7 })).toEqual({
      y: 2,
      x: 4,
      t: 7,
    });
  });

  it("singular inverted affine returns null", () => {
    const singular: PathTransformLike = {
      __typename: "AffineTransformation",
      inputAxes: ["y", "x"],
      outputAxes: ["y", "x"],
      affine: [
        [1, 1, 0],
        [2, 2, 0],
      ],
    };
    expect(applyStepToCoords(step(singular, true), { y: 1, x: 1 })).toBeNull();
  });

  it("ByDimension maps the axes its parts name, and nothing else crosses", () => {
    // The canonical mask edge: IDENTITY on t, a SCALE on y/x -- the image's c is
    // not the mask's, and no part says it is.
    const byDimension: PathTransformLike = {
      __typename: "ByDimensionTransformation",
      inputAxes: ["t", "y", "x"],
      outputAxes: ["t", "y", "x"],
      parts: [
        { kind: "IDENTITY", inputAxes: ["t"], outputAxes: ["t"], scale: [], translation: [], affine: [] },
        { kind: "SCALE", inputAxes: ["y", "x"], outputAxes: ["y", "x"], scale: [2, 2], translation: [], affine: [] },
      ],
    };
    // Stored mask→image, walked inverted (image→mask): scale divides.
    const out = applyStepToCoords(step(byDimension, true), { t: 3, c: 1, y: 8, x: 6 });
    expect(out).toEqual({ t: 3, y: 4, x: 3 });
  });

  it("sequence composes children in order, reversed when inverted", () => {
    const sequence: PathTransformLike = {
      __typename: "SequenceTransformation",
      inputAxes: ["x"],
      outputAxes: ["x"],
      transformations: [
        {
          __typename: "ScaleTransformation",
          inputAxes: ["x"],
          outputAxes: ["x"],
          scale: [2],
        },
        {
          __typename: "TranslationTransformation",
          inputAxes: ["x"],
          outputAxes: ["x"],
          translation: [1],
        },
      ],
    };
    // forward: x*2 then +1
    expect(applyStepToCoords(step(sequence), { x: 3 })).toEqual({ x: 7 });
    // inverted: -1 then /2
    expect(applyStepToCoords(step(sequence, true), { x: 7 })).toEqual({ x: 3 });
  });

  it("unmappable and field edges return null", () => {
    expect(
      applyStepToCoords(
        step({ __typename: "UnmappableTransformation", inputAxes: ["y"], outputAxes: ["i"] }),
        { y: 1 },
      ),
    ).toBeNull();
    expect(
      applyStepToCoords(
        step({ __typename: "FieldTransformation", inputAxes: ["y", "x"], outputAxes: ["i"] }),
        { y: 1, x: 1 },
      ),
    ).toBeNull();
  });

  it("a named axis missing from the point returns null, never guesses", () => {
    expect(
      applyStepToCoords(
        step({
          __typename: "ScaleTransformation",
          inputAxes: ["tau"],
          outputAxes: ["tau"],
          scale: [2],
        }),
        { y: 1, x: 1 },
      ),
    ).toBeNull();
  });

  it("zero scale inverted returns null instead of Infinity", () => {
    expect(
      applyStepToCoords(
        step(
          {
            __typename: "ScaleTransformation",
            inputAxes: ["x"],
            outputAxes: ["x"],
            scale: [0],
          },
          true,
        ),
        { x: 4 },
      ),
    ).toBeNull();
  });
});

describe("applyStepToCoords on composites that carry their own map", () => {
  const byDimension = {
    __typename: "ByDimensionTransformation",
    inputAxes: ["x"],
    outputAxes: ["u"],
    parts: [{ kind: "AFFINE", inputAxes: ["x"], outputAxes: ["u"], scale: [], translation: [], affine: [[2, 1]] }],
  } as PathTransformLike;
  const sequence = {
    __typename: "SequenceTransformation",
    inputAxes: ["x"],
    outputAxes: ["u"],
    steps: [
      { kind: "SCALE", scale: [2], translation: [], affine: [] },
      { kind: "TRANSLATION", scale: [], translation: [1], affine: [] },
    ],
  } as PathTransformLike;

  it("scales, then translates, and passes the rest through (sequence)", () => {
    expect(applyStepToCoords({ transformation: sequence, inverted: false }, { x: 3, c: 1 })).toEqual({ u: 7, c: 1 });
    expect(applyStepToCoords({ transformation: sequence, inverted: true }, { u: 7, c: 1 })).toEqual({ x: 3, c: 1 });
  });

  it("maps a by-dimension's parts and lets nothing else cross", () => {
    expect(applyStepToCoords({ transformation: byDimension, inverted: false }, { x: 3, c: 1 })).toEqual({ u: 7 });
    expect(applyStepToCoords({ transformation: byDimension, inverted: true }, { u: 7, c: 1 })).toEqual({ x: 3 });
  });

  it("reads every by-dimension part from the original coordinates, side by side", () => {
    const swap = {
      __typename: "ByDimensionTransformation",
      inputAxes: ["y", "x"],
      outputAxes: ["x", "y"],
      parts: [
        { kind: "IDENTITY", inputAxes: ["y"], outputAxes: ["x"], scale: [], translation: [], affine: [] },
        { kind: "IDENTITY", inputAxes: ["x"], outputAxes: ["y"], scale: [], translation: [], affine: [] },
      ],
    } as PathTransformLike;
    expect(applyStepToCoords({ transformation: swap, inverted: false }, { y: 1, x: 2 })).toEqual({ x: 1, y: 2 });
  });
});

describe("applyPathToCoords", () => {
  it("empty path is the identity (locally-rooted plan)", () => {
    expect(applyPathToCoords([], { t: 1, y: 2, x: 3 })).toEqual({ t: 1, y: 2, x: 3 });
  });

  it("composes steps first to last and fails as a whole", () => {
    const path: PathStep[] = [
      step({
        __typename: "TranslationTransformation",
        inputAxes: ["x"],
        outputAxes: ["x"],
        translation: [5],
      }),
      step(
        {
          __typename: "ScaleTransformation",
          inputAxes: ["x"],
          outputAxes: ["x"],
          scale: [2],
        },
        true,
      ),
    ];
    expect(applyPathToCoords(path, { x: 1 })).toEqual({ x: 3 });
    expect(
      applyPathToCoords(
        [...path, step({ __typename: "UnmappableTransformation", inputAxes: ["x"], outputAxes: ["x"] })],
        { x: 1 },
      ),
    ).toBeNull();
  });
});
