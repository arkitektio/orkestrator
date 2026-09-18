import { describe, expect, it, vi } from "vitest";
import {
  composeLayerAffine,
  evalTransform,
  invert4,
  placementToSpatialAffine,
  spatialAxisTriple,
} from "./transformGraph";
import {
  absoluteLevelScale,
  relativeLevelScaleFactors,
} from "@/mikro-next/components/scene/platform/coords/levelGeometry";

/**
 * Fixtures use the reference scene document's own numbers (confocal pyramid
 * with true z factors 1..36, FLIM registration affine), so these tests double
 * as the hand-computed verification of the RFC-5 migration.
 */

const DIMS = ["t", "c", "z", "y", "x"];
const SPATIAL = ["x", "y", "z"] as const;

const level = (lvl: number, scale: number[], translation?: number[]) => ({
  level: lvl,
  toParent:
    translation === undefined
      ? { __typename: "ScaleTransformation", scale }
      : {
          __typename: "SequenceTransformation",
          transformations: [
            { __typename: "ScaleTransformation", scale },
            { __typename: "TranslationTransformation", translation },
          ],
        },
});

describe("evalTransform", () => {
  it("extracts spatial scale in input-axis order", () => {
    const m = evalTransform(
      { __typename: "ScaleTransformation", scale: [100, 1, 0.5, 0.325, 0.325] },
      DIMS,
      DIMS,
      SPATIAL,
    );
    expect(m).not.toBeNull();
    expect(m![0][0]).toBe(0.325); // x
    expect(m![1][1]).toBe(0.325); // y
    expect(m![2][2]).toBe(0.5); // z
    expect(m![0][3]).toBe(0);
  });

  it("composes Sequence children first-to-last (scale then translate)", () => {
    const m = evalTransform(
      level(3, [100, 1, 4.5, 2.6, 2.6], [0, 0, 2.0, 1.1375, 1.1375]).toParent,
      DIMS,
      DIMS,
      SPATIAL,
    )!;
    // voxel (1, 1, 1) → (2.6 + 1.1375, 2.6 + 1.1375, 4.5 + 2.0)
    expect(m[0][0] * 1 + m[0][3]).toBeCloseTo(3.7375);
    expect(m[2][2] * 1 + m[2][3]).toBeCloseTo(6.5);
  });

  it("maps an affine's spatial block by axis name (FLIM registration)", () => {
    // (M) x (N+1) over spatial axes z, y, x — rows outer, last column t.
    const m = evalTransform(
      {
        __typename: "AffineTransformation",
        affine: [
          [1.0, 0.0, 0.0, 0.0],
          [0.0, 0.998, 0.021, 12.4],
          [0.0, -0.021, 0.998, -3.1],
        ],
      },
      ["z", "y", "x"],
      ["z", "y", "x"],
      SPATIAL,
    )!;
    // x row (output x = affine row 2): x' = -0.021·y + 0.998·x - 3.1
    expect(m[0][0]).toBeCloseTo(0.998);
    expect(m[0][1]).toBeCloseTo(-0.021);
    expect(m[0][3]).toBeCloseTo(-3.1);
    // z passes through
    expect(m[2][2]).toBe(1);
    expect(m[2][3]).toBe(0);
  });

  it("returns null, not identity, when the output triple names none of the affine's rows", () => {
    // The lens' own names handed to an edge that writes world names: every
    // output slot indexOf's to -1. Identity here is a layer left in raw pixels
    // with nothing logged — the failure that hid the Visium bin-lattice bug.
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const m = evalTransform(
      { __typename: "AffineTransformation", affine: [[2, 0, 10], [0, 2, 20]] },
      ["row", "col"],
      ["y", "x"],
      ["col", "row", null],
      ["col", "row", null],
    );
    expect(m).toBeNull();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("none of the output slots"));
    warn.mockRestore();
  });

  it("leaves an affine that touches no spatial input axis as identity, silently", () => {
    // A ByDimension child acting on a non-spatial axis only: no slot on either
    // side, and that is correct pass-through, not a misplacement.
    const m = evalTransform(
      { __typename: "AffineTransformation", affine: [[3, 1]] },
      ["t"],
      ["t"],
      ["x", "y", "z"],
    );
    expect(m).not.toBeNull();
    expect(m![0][0]).toBe(1);
  });

  it("degrades a flat affine with more output names than rows to null", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const m = evalTransform(
      { __typename: "AffineTransformation", affine: [[2, 0, 10], [0, 2, 20]] },
      ["row", "col"],
      ["c", "y", "x"],
      ["col", "row", null],
      ["x", "y", null],
    );
    expect(m).toBeNull();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("has 2 rows"));
    warn.mockRestore();
  });

  it("returns null for kinds it cannot represent", () => {
    expect(
      evalTransform({ __typename: "FieldTransformation" }, DIMS, DIMS, SPATIAL),
    ).toBeNull();
  });
});

describe("invert4", () => {
  it("inverts an affine scale+translation", () => {
    const m = [
      [2, 0, 0, 10],
      [0, 4, 0, -8],
      [0, 0, 0.5, 3],
      [0, 0, 0, 1],
    ];
    const inv = invert4(m)!;
    expect(inv[0][0]).toBeCloseTo(0.5);
    expect(inv[0][3]).toBeCloseTo(-5);
    expect(inv[1][1]).toBeCloseTo(0.25);
    expect(inv[1][3]).toBeCloseTo(2);
    expect(inv[2][2]).toBeCloseTo(2);
    expect(inv[2][3]).toBeCloseTo(-6);
  });

  it("returns null for singular matrices", () => {
    expect(
      invert4([
        [0, 0, 0, 0],
        [0, 1, 0, 0],
        [0, 0, 1, 0],
        [0, 0, 0, 1],
      ]),
    ).toBeNull();
  });
});

// The calibration-first scene: the world CS, the dataset's intrinsic pixel
// grid, and one calibrated physical system between them.
const SCENE = {
  worldCoordinateSystem: {
    id: "cs:world",
    axes: [{ name: "z" }, { name: "y" }, { name: "x" }],
  },
  coordinateSystems: [
    { id: "cs:intrinsic", axes: [{ name: "t" }, { name: "c" }, { name: "z" }, { name: "y" }, { name: "x" }] },
    { id: "cs:phys", axes: [{ name: "z" }, { name: "y" }, { name: "x" }] },
  ],
};

// intrinsic pixels → calibrated µm (the calibration edge)…
const CALIBRATION_STEP = {
  transformation: {
    __typename: "ScaleTransformation",
    input: { id: "cs:intrinsic" },
    output: { id: "cs:phys" },
    scale: [100, 1, 0.5, 0.325, 0.325],
  },
  inverted: false,
};
// …then calibrated → world (the scene registration).
const REGISTRATION_STEP = {
  transformation: {
    __typename: "TranslationTransformation",
    input: { id: "cs:phys" },
    output: { id: "cs:world" },
    translation: [10, 20, 30],
  },
  inverted: false,
};

/**
 * Regression: scene 28's calibration edge, verbatim. The dataset is isometric
 * in x/y (both 0.2405 µm) yet rendered anisotropic, because the ByDimension
 * children declare a 4-element `inputAxes` (c,z,y,x) while carrying 3-element
 * parameter arrays aligned to `outputAxes` (z,y,x). Read against `inputAxes`
 * that puts `undefined` (→1) on x and slides z's value onto y and y's onto z.
 *
 * The payload violates the schema contract; the server is the real fix. These
 * pin the client's tolerance: loud and approximately right, never quiet and
 * wrong.
 */
describe("evalTransform parameter arity", () => {
  const calibrationChildren = (id: string) => ({
    __typename: "ByDimensionTransformation",
    inputAxes: ["z", "y", "x"],
    outputAxes: ["z", "y", "x"],
    input: { id },
    output: { id: "cs:world" },
    transformations: [
      {
        __typename: "ScaleTransformation",
        // Contract violation: 4 axis names, 3 values. `input`/`output` are
        // carried only so each test case hashes to its own warn-once key —
        // the real payload's nested children have neither.
        input: { id },
        output: { id: "cs:world" },
        inputAxes: ["c", "z", "y", "x"],
        outputAxes: ["z", "y", "x"],
        scale: [0.3310351162790698, 0.2405001955034213, 0.2405001955034213],
      },
      {
        __typename: "TranslationTransformation",
        input: { id },
        output: { id: "cs:world" },
        inputAxes: ["c", "z", "y", "x"],
        outputAxes: ["z", "y", "x"],
        translation: [0, -56423.85782972, 37785.478700700005],
      },
    ],
  });

  it("reads an outputAxes-aligned scale/translation against outputAxes", () => {
    const edge = calibrationChildren("cs:scene28");
    const m = evalTransform(edge, edge.inputAxes, edge.outputAxes, SPATIAL)!;
    // x and y isometric — the symptom that started this.
    expect(m[0][0]).toBeCloseTo(0.2405001955034213);
    expect(m[1][1]).toBeCloseTo(0.2405001955034213);
    expect(m[0][0]).toBeCloseTo(m[1][1]);
    // z keeps its own, larger spacing rather than inheriting y's.
    expect(m[2][2]).toBeCloseTo(0.3310351162790698);
    // Translation lands on the axis it was written for.
    expect(m[0][3]).toBeCloseTo(37785.478700700005);
    expect(m[1][3]).toBeCloseTo(-56423.85782972);
    expect(m[2][3]).toBeCloseTo(0);
  });

  it("warns rather than silently mis-indexing", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const edge = calibrationChildren("cs:scene28:warn");
    evalTransform(edge, edge.inputAxes, edge.outputAxes, SPATIAL);
    expect(warn).toHaveBeenCalled();
    expect(warn.mock.calls.map(String).join("\n")).toMatch(/outputAxes/);
    warn.mockRestore();
  });

  it("degrades to identity when the arity matches neither axis list", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const m = evalTransform(
      {
        __typename: "ScaleTransformation",
        input: { id: "cs:junk" },
        output: { id: "cs:world" },
        inputAxes: ["c", "z", "y", "x"],
        outputAxes: ["z", "y", "x"],
        scale: [2, 2],
      },
      ["c", "z", "y", "x"],
      ["z", "y", "x"],
      SPATIAL,
    );
    expect(m).toBeNull();
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it("leaves a conformant subset child on inputAxes (unchanged behaviour)", () => {
    const m = evalTransform(
      {
        __typename: "ScaleTransformation",
        inputAxes: ["y", "x"],
        outputAxes: ["y", "x"],
        scale: [0.65, 0.325],
      },
      ["y", "x"],
      ["y", "x"],
      SPATIAL,
    )!;
    expect(m[0][0]).toBeCloseTo(0.325); // x
    expect(m[1][1]).toBeCloseTo(0.65); // y
    expect(m[2][2]).toBe(1); // z unnamed → pass-through
  });
});

describe("composeLayerAffine", () => {
  const makeLayer = (opts?: {
    lensToParent?: unknown;
    pathToWorld?: unknown;
    asAffine?: unknown;
    pathStartId?: string;
  }) => ({
    pathToWorld: (opts?.pathToWorld ?? null) as never,
    asAffine: (opts?.asAffine ?? null) as never,
    lens: {
      axisNames: DIMS,
      renderAxes: { x: "x", y: "y", z: "z" },
      coordinateSystem: { id: "cs:lens" },
      toParent: (opts?.lensToParent ?? null) as never,
      dataset: {
        intrinsicSystem: { id: "cs:intrinsic", name: "intrinsic" },
        dataArrays: [
          {
            level: 0,
            coordinateSystem: { id: "cs:intrinsic" },
            // pixel-space pyramid: level 0 → intrinsic is identity
            toParent: { __typename: "IdentityTransformation" },
          },
        ],
      },
    },
  });

  it("prepends the lens crop before an intrinsic-rooted placement", () => {
    const layer = makeLayer({
      // Cropped lens: z slices start at 4 → translation on the z axis.
      lensToParent: { __typename: "TranslationTransformation", translation: [0, 0, 4, 0, 0] },
      // The path is provenance (it says where the placement STARTS); the
      // matrix is the server's composition of it: calibration then registration.
      pathToWorld: [CALIBRATION_STEP, REGISTRATION_STEP],
      asAffine: {
        matrix: [
          [0, 0, 0.5, 0, 0, 10], // z
          [0, 0, 0, 0.325, 0, 20], // y
          [0, 0, 0, 0, 0.325, 30], // x
        ],
        inputAxes: DIMS,
        outputAxes: ["z", "y", "x"],
        total: true,
      },
    });
    const m = composeLayerAffine(SCENE, layer)!;
    // lens voxel (0,0,0) → intrinsic z 4 → physical z 2.0 µm → world z 12.
    expect(m[2][3]).toBeCloseTo(12.0);
    expect(m[0][3]).toBeCloseTo(30);
    expect(m[0][0]).toBeCloseTo(0.325);
  });

  it("skips the local prefix when the path already starts at the lens", () => {
    // The lens CS is not in the scene's axes index, so its edge arrays
    // resolve against the layer's dim order (t, c, z, y, x).
    const lensRootedPath = [
      {
        transformation: {
          __typename: "TranslationTransformation",
          input: { id: "cs:lens" },
          output: { id: "cs:world" },
          translation: [0, 0, 7, 0, 0],
        },
        inverted: false,
      },
    ];
    const layer = makeLayer({
      lensToParent: { __typename: "TranslationTransformation", translation: [0, 0, 4, 0, 0] },
      pathToWorld: lensRootedPath,
      asAffine: {
        matrix: [
          [0, 0, 1, 0, 0, 7], // z
          [0, 0, 0, 1, 0, 0], // y
          [0, 0, 0, 0, 1, 0], // x
        ],
        inputAxes: DIMS,
        outputAxes: ["z", "y", "x"],
        total: true,
      },
    });
    const m = composeLayerAffine(SCENE, layer)!;
    // The crop must NOT be double-applied: only the placement's z shift remains.
    expect(m[2][3]).toBeCloseTo(7);
  });

  it("never walks pathToWorld: without asAffine only the local prefix remains, and it warns", () => {
    // The steps alone would compose to a real placement; the client must not
    // do that. `isPlaceable` keeps such a layer off screen, so what comes back
    // here is only the lens prefix (pixel units) — never a world position.
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const layer = makeLayer({
      lensToParent: { __typename: "TranslationTransformation", translation: [0, 0, 4, 0, 0] },
      pathToWorld: [CALIBRATION_STEP, REGISTRATION_STEP],
      asAffine: null,
    });
    const m = composeLayerAffine(SCENE, layer)!;
    expect(m[2][3]).toBeCloseTo(4); // crop only
    expect(m[0][0]).toBe(1); // no calibration applied
    expect(m[0][3]).toBe(0); // no registration applied
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("not drawn"));
    warn.mockRestore();
  });

  it("warns 'unregistered' for a null path and null asAffine", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const layer = makeLayer({
      lensToParent: { __typename: "TranslationTransformation", translation: [0, 0, 4, 0, 0] },
      pathToWorld: null,
      asAffine: null,
    });
    const m = composeLayerAffine(SCENE, layer)!;
    expect(m[2][3]).toBeCloseTo(4);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("unregistered"));
    warn.mockRestore();
  });

  it("returns null (identity) when nothing transforms", () => {
    expect(composeLayerAffine({}, makeLayer())).toBeNull();
  });
});

describe("composeLayerAffine — lens axes named unlike the world (Visium HD bin lattice)", () => {
  // Scene 2's own numbers: a 2 µm bin-id array (row, col) fitted onto the H&E
  // pixel grid (y, x) by a reflected affine, then the H&E's µm calibration.
  // The world is (c, y, x); the lens is (row, col). Reducing with lens names
  // on the output side indexOf's every slot to -1 and silently dropped the
  // whole registration — the layer sat in raw pixels next to the tissue.
  const WORLD = {
    id: "cs:world",
    axes: [
      { name: "c", type: "CHANNEL", order: 0 },
      { name: "y", type: "SPACE", order: 1 },
      { name: "x", type: "SPACE", order: 2 },
    ],
  };
  const SCENE_CYX = { worldCoordinateSystem: WORLD };
  const LATTICE_STEP = {
    transformation: {
      __typename: "ByDimensionTransformation",
      inputAxes: ["row", "col"],
      outputAxes: ["y", "x"],
      input: { id: "cs:bins" },
      output: { id: "cs:he" },
      transformations: [
        {
          __typename: "AffineTransformation",
          inputAxes: ["row", "col"],
          // Over-declared by the server: 2 rows under 3 names.
          outputAxes: ["c", "y", "x"],
          affine: [
            [-7.3035151893397705, -0.04863885486632391, 24099.110308890056],
            [-0.04860509668249711, 7.303741872268973, 253.42724783538984],
          ],
        },
      ],
    },
    inverted: false,
  };
  const CALIBRATION_CYX = {
    transformation: {
      __typename: "ScaleTransformation",
      inputAxes: ["c", "y", "x"],
      outputAxes: ["c", "y", "x"],
      input: { id: "cs:he" },
      output: { id: "cs:world" },
      scale: [1, 0.2738, 0.2738],
    },
    inverted: false,
  };
  const AS_AFFINE = {
    matrix: [
      [-1.999702458841229, -0.013317318462399487, 6598.3364025740975],
      [-0.013308075471667707, 1.9997645246272446, 69.38838045732973],
    ],
    inputAxes: ["row", "col"],
    outputAxes: ["y", "x"],
    total: false,
  };
  const binLayer = (asAffine: typeof AS_AFFINE | null) => ({
    pathToWorld: [LATTICE_STEP, CALIBRATION_CYX] as never,
    asAffine,
    lens: {
      axisNames: ["row", "col"],
      renderAxes: { x: "col", y: "row", z: null },
      coordinateSystem: { id: "cs:bins" },
      toParent: null,
      dataset: {
        intrinsicSystem: { id: "cs:bins", name: "bins" },
        dataArrays: [{ level: 0, coordinateSystem: { id: "cs:bins" }, toParent: null }],
      },
    },
  });
  const expectPlaced = (m: number[][] | null) => {
    expect(m).not.toBeNull();
    // x ← col, y ← row (reflected), translation in µm.
    expect(m![0][0]).toBeCloseTo(1.9997645, 5);
    expect(m![0][1]).toBeCloseTo(-0.0133081, 5);
    expect(m![0][3]).toBeCloseTo(69.38838, 3);
    expect(m![1][0]).toBeCloseTo(-0.0133173, 5);
    expect(m![1][1]).toBeCloseTo(-1.9997025, 5);
    expect(m![1][3]).toBeCloseTo(6598.3364, 2);
    expect(m![2][2]).toBe(1);
    expect(m![2][3]).toBe(0);
  };

  it("places the layer from the server's asAffine", () => {
    expectPlaced(composeLayerAffine(SCENE_CYX, binLayer(AS_AFFINE)));
  });

  it("still composes a lens named like the world against typed world axes", () => {
    const he = {
      pathToWorld: [CALIBRATION_CYX] as never,
      asAffine: {
        matrix: [[1, 0, 0, 0], [0, 0.2738, 0, 0], [0, 0, 0.2738, 0]],
        inputAxes: ["c", "y", "x"],
        outputAxes: ["c", "y", "x"],
        total: true,
      },
      lens: {
        axisNames: ["c", "y", "x"],
        renderAxes: { x: "x", y: "y", z: null },
        coordinateSystem: { id: "cs:he" },
        toParent: null,
        dataset: {
          intrinsicSystem: { id: "cs:he", name: "he" },
          dataArrays: [{ level: 0, coordinateSystem: { id: "cs:he" }, toParent: null }],
        },
      },
    };
    const m = composeLayerAffine(SCENE_CYX, he)!;
    expect(m[0][0]).toBeCloseTo(0.2738);
    expect(m[1][1]).toBeCloseTo(0.2738);
    expect(m[0][3]).toBe(0);
  });
});

/**
 * `Layer.asAffine` reduction. The regression suite for the Visium HD non-overlap:
 * the point layer read `asAffine.matrix` by POSITION, which transposes a world
 * whose axes are `(y,x)` / `(z,y,x)` — mikro's convention, x last — and, on a
 * 2×3 placement, wrote the translation into the z basis where a z=0 layer
 * multiplies it away.
 */
describe("placementToSpatialAffine", () => {
  it("puts a 2D placement's translation in the TRANSLATION column, not z", () => {
    // 2 x (2+1): rows (y, x), columns (y, x), last column the translation.
    const m = placementToSpatialAffine(
      { matrix: [[1, 0, 40], [0, 1, 70]], inputAxes: ["y", "x"], outputAxes: ["y", "x"] },
      ["x", "y", null],
    )!;
    expect(m[0][3]).toBeCloseTo(70); // x translation, from the x ROW
    expect(m[1][3]).toBeCloseTo(40); // y translation, from the y ROW
    // z is unconstrained by a 2D registration: identity pass-through, not zero.
    expect(m[2][2]).toBe(1);
    expect(m[2][3]).toBe(0);
  });

  it("maps rows by NAME for an x-last world (no transposition)", () => {
    // rows/cols (z, y, x): reading row 0 as x would put the z scale on x.
    const m = placementToSpatialAffine(
      {
        matrix: [
          [5, 0, 0, 1],
          [0, 3, 0, 2],
          [0, 0, 0.5, 4],
        ],
        inputAxes: ["z", "y", "x"],
        outputAxes: ["z", "y", "x"],
      },
      ["x", "y", "z"],
    )!;
    expect(m[0][0]).toBeCloseTo(0.5); // x scale
    expect(m[1][1]).toBeCloseTo(3); // y scale
    expect(m[2][2]).toBeCloseTo(5); // z scale
    expect(m[0][3]).toBeCloseTo(4);
    expect(m[2][3]).toBeCloseTo(1);
  });

  it("leaves an unconstrained axis identity for a partial placement (total: false)", () => {
    // Registered on (y,x) into a (z,y,x) world: two rows, and z must PASS
    // THROUGH rather than be pinned at the origin.
    const m = placementToSpatialAffine(
      { matrix: [[2, 0, 10], [0, 2, 20]], inputAxes: ["y", "x"], outputAxes: ["y", "x"] },
      ["x", "y", "z"],
    )!;
    expect(m[2][2]).toBe(1);
    expect(m[2][3]).toBe(0);
    expect(m[0][0]).toBeCloseTo(2);
    expect(m[0][3]).toBeCloseTo(20);
  });

  it("resolves when the input axes are table COLUMNS and the output axes are world axes", () => {
    // A point layer's columns are its source axes and share no names with the
    // world. A single-triple reducer indexOf's its way to -1 here and degrades
    // to identity — the silent failure this signature exists to prevent.
    const m = placementToSpatialAffine(
      {
        matrix: [[1, 0, 12], [0, 1, 34]],
        inputAxes: ["pxl_row_in_fullres", "pxl_col_in_fullres"],
        outputAxes: ["y", "x"],
      },
      ["pxl_col_in_fullres", "pxl_row_in_fullres", null], // xColumn, yColumn, zColumn
      ["x", "y", null],
    );
    expect(m).not.toBeNull();
    expect(m![0][0]).toBeCloseTo(1);
    expect(m![0][3]).toBeCloseTo(34); // x row's translation
    expect(m![1][3]).toBeCloseTo(12); // y row's translation
  });

  it("returns null for a null placement and for an identity one", () => {
    expect(placementToSpatialAffine(null, ["x", "y", "z"])).toBeNull();
    expect(
      placementToSpatialAffine(
        { matrix: [[1, 0, 0, 0], [0, 1, 0, 0], [0, 0, 1, 0]], inputAxes: ["z", "y", "x"], outputAxes: ["z", "y", "x"] },
        ["x", "y", "z"],
      ),
    ).toBeNull();
  });
});

describe("spatialAxisTriple", () => {
  it("reads SPACE axes back to front (x is the LAST spatial axis)", () => {
    expect(
      spatialAxisTriple({
        id: "cs:world",
        axes: [
          { name: "t", type: "TIME", order: 0 },
          { name: "z", type: "SPACE", order: 1 },
          { name: "y", type: "SPACE", order: 2 },
          { name: "x", type: "SPACE", order: 3 },
        ],
      }),
    ).toEqual(["x", "y", "z"]);
  });

  it("yields a null z for a 2D world", () => {
    expect(
      spatialAxisTriple({
        id: "cs:world",
        axes: [
          { name: "c", type: "CHANNEL", order: 0 },
          { name: "y", type: "SPACE", order: 1 },
          { name: "x", type: "SPACE", order: 2 },
        ],
      }),
    ).toEqual(["x", "y", null]);
  });

  it("is empty for a missing system", () => {
    expect(spatialAxisTriple(null)).toEqual([null, null, null]);
  });

  it("degrades to identity rather than guessing when no axis is SPACE-typed", () => {
    // Guessing "the last three" here would put `c` in the z slot and place the
    // layer somewhere wrong. Also exercises the warn path.
    expect(
      spatialAxisTriple({
        id: "cs:broken",
        axes: [
          { name: "c", type: "CHANNEL", order: 0 },
          { name: "t", type: "TIME", order: 1 },
        ],
      }),
    ).toEqual([null, null, null]);
  });
});

describe("evalTransform with separate in/out spatial triples", () => {
  it("defaults spatialOut to spatial (existing call sites unchanged)", () => {
    const args = [
      { __typename: "ScaleTransformation", scale: [100, 1, 0.5, 0.325, 0.325] },
      DIMS,
      DIMS,
      SPATIAL,
    ] as const;
    expect(evalTransform(...args)).toEqual(evalTransform(...args, SPATIAL));
  });
});

describe("level scale factors from toParent edges", () => {
  it("passes pixel-space scales through unchanged (level 0 = 1)", () => {
    // Calibration-first pyramids: toParent maps level → intrinsic PIXELS, so
    // the scale IS the relative factor and dividing by level 0 is a no-op.
    const dataArrays = [
      level(0, [1, 1, 1, 1, 1]),
      level(1, [1, 1, 2, 2, 2]),
      level(3, [1, 1, 9, 8, 8]),
    ];
    const factors = relativeLevelScaleFactors(dataArrays, DIMS.length);
    expect(factors[0]).toEqual([1, 1, 1, 1, 1]);
    expect(factors[1]).toEqual([1, 1, 2, 2, 2]);
    expect(factors[2]).toEqual([1, 1, 9, 8, 8]);
  });

  it("derives the removed scaleFactors semantics from absolute scales", () => {
    // The reference confocal pyramid: TRUE z factors 1, 2, 4, 9, 18, 36 —
    // NOT the nominal 1, 2, 4, 8, 16, 32 the old relative field claimed.
    // (Physical-scaled level edges — the pre-calibration schema — must keep
    // working: the division by level 0 normalizes them to factors.)
    const dataArrays = [
      level(0, [100, 1, 0.5, 0.325, 0.325]),
      level(1, [100, 1, 1.0, 0.65, 0.65], [0, 0, 0.25, 0.1625, 0.1625]),
      level(2, [100, 1, 2.0, 1.3, 1.3], [0, 0, 0.75, 0.4875, 0.4875]),
      level(3, [100, 1, 4.5, 2.6, 2.6], [0, 0, 2.0, 1.1375, 1.1375]),
      level(4, [100, 1, 9.0, 5.2, 5.2], [0, 0, 4.25, 2.4375, 2.4375]),
      level(5, [100, 1, 18.0, 10.4, 10.4], [0, 0, 8.75, 5.0375, 5.0375]),
    ];
    const factors = relativeLevelScaleFactors(dataArrays, DIMS.length);
    expect(factors[0]).toEqual([1, 1, 1, 1, 1]);
    expect(factors[3]).toEqual([1, 1, 9, 8, 8]);
    expect(factors[5]).toEqual([1, 1, 36, 32, 32]);
  });

  it("treats identity / pure-translation edges as unscaled", () => {
    expect(absoluteLevelScale({ __typename: "IdentityTransformation" }, 3)).toEqual([1, 1, 1]);
    expect(
      absoluteLevelScale({ __typename: "TranslationTransformation", translation: [1, 2, 3] }, 3),
    ).toEqual([1, 1, 1]);
  });

  it("memoizes on the dataArrays array identity (warm replan path)", () => {
    const dataArrays = [level(0, [1, 1, 1, 1, 1]), level(1, [1, 1, 2, 2, 2])];
    const first = relativeLevelScaleFactors(dataArrays, DIMS.length);
    // Same identity → same output array, no re-parse.
    expect(relativeLevelScaleFactors(dataArrays, DIMS.length)).toBe(first);
    // A structurally equal but NEW array recomputes (fresh fragment).
    const clone = [...dataArrays];
    expect(relativeLevelScaleFactors(clone, DIMS.length)).not.toBe(first);
    expect(relativeLevelScaleFactors(clone, DIMS.length)).toEqual(first);
  });

  it("bails to the shape-ratio fallback for edges it cannot read", () => {
    expect(absoluteLevelScale({ __typename: "AffineTransformation", affine: [[1]] }, 3)).toBeNull();
    expect(absoluteLevelScale(null, 3)).toBeNull();
    const factors = relativeLevelScaleFactors(
      [{ level: 0, toParent: null }, level(1, [1, 1, 2, 2, 2])],
      DIMS.length,
    );
    expect(factors).toEqual([null, null]);
  });
});
