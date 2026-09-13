import { describe, expect, it } from "vitest";
import { evalTransform } from "@/mikro-next/lib/coords/transformGraph";
import {
  AxisLike,
  MappingRow,
  RegistrationDraft,
  buildAffineDiagonal,
  buildRegistrationInput,
  hasBlockingIssue,
  isModeAvailable,
  mappedRows,
  num,
  prefillMapping,
  renamesAnyAxis,
  validateRegistration,
} from "./mapping";

/**
 * The registration form's contract, in two halves.
 *
 * The first half pins the prefill heuristic and the array ordering the schema's
 * `inputAxes` docstring warns about ("indexing the arrays against them silently
 * misplaces them").
 *
 * The second half is the one that matters most: it round-trips what we author
 * back through `evalTransform` — the client-side evaluator in
 * mikro-next/lib/coords/transformGraph.ts that actually renders these edges. An edge that
 * this module emits and that evaluator misreads is invisible in production: it
 * degrades to identity behind a console warning and the layer just draws in the
 * wrong place. Asserting the matrix here is the only place that gap is caught.
 */

const axis = (
  name: string,
  order: number,
  type: string,
  unit?: string | null,
): AxisLike => ({ name, order, type, unit });

// A (c, y, x) pixel grid: the shape of an uncalibrated 2D multi-channel dataset.
const CYX: AxisLike[] = [
  axis("c", 0, "CHANNEL"),
  axis("y", 1, "SPACE", "px"),
  axis("x", 2, "SPACE", "px"),
];

// A (t, z, y, x) world in micrometres: the shape of a scene's world system.
const TZYX: AxisLike[] = [
  axis("t", 0, "TIME", "s"),
  axis("z", 1, "SPACE", "µm"),
  axis("y", 2, "SPACE", "µm"),
  axis("x", 3, "SPACE", "µm"),
];

const rowFor = (rows: MappingRow[], name: string): MappingRow => {
  const row = rows.find((r) => r.source.name === name);
  if (!row) throw new Error(`no row for ${name}`);
  return row;
};

const draftOf = (over: Partial<RegistrationDraft>): RegistrationDraft => ({
  sourceSystemId: "cs-source",
  targetSystemId: "cs-target",
  rows: [],
  mode: "IDENTITY",
  ...over,
});

describe("prefillMapping", () => {
  it("maps every axis when the names match, so the common case is zero-click", () => {
    const rows = prefillMapping(TZYX, TZYX);
    expect(rows.map((r) => r.target?.name)).toEqual(["t", "z", "y", "x"]);
  });

  it("maps y and x but leaves the channel axis unmapped for (c,y,x) -> (t,z,y,x)", () => {
    // The rank-changing case. `c` has no CHANNEL counterpart in the world, and
    // leaving it unmapped is CORRECT: "the world's other axes are untouched".
    const rows = prefillMapping(CYX, TZYX);

    expect(rowFor(rows, "y").target?.name).toBe("y");
    expect(rowFor(rows, "x").target?.name).toBe("x");
    expect(rowFor(rows, "c").target).toBeNull();
  });

  it("refuses to guess when two target axes are equally plausible", () => {
    // (y,x) -> (row,col): no name matches, and each source axis has TWO
    // unclaimed SPACE candidates. A positional fallback would map y->row and
    // x->col and be right by luck here — and silently wrong the moment the
    // target's axis order differs. The honest answer is "I don't know".
    const source = [axis("y", 0, "SPACE", "px"), axis("x", 1, "SPACE", "px")];
    const target = [axis("row", 0, "SPACE", "µm"), axis("col", 1, "SPACE", "µm")];

    const rows = prefillMapping(source, target);

    expect(rows.map((r) => r.target)).toEqual([null, null]);
  });

  it("does match a lone unambiguous type candidate", () => {
    // One source SPACE axis, one unclaimed target SPACE axis: the guess is the
    // sole possible answer, so pass 2 takes it.
    const rows = prefillMapping(
      [axis("t", 0, "TIME", "s"), axis("y", 1, "SPACE", "px")],
      [axis("t", 0, "TIME", "s"), axis("row", 1, "SPACE", "µm")],
    );

    expect(rowFor(rows, "t").target?.name).toBe("t");
    expect(rowFor(rows, "y").target?.name).toBe("row");
  });

  it("never maps one target axis twice", () => {
    const rows = prefillMapping(
      [axis("y", 0, "SPACE"), axis("x", 1, "SPACE")],
      [axis("y", 0, "SPACE")],
    );

    expect(rowFor(rows, "y").target?.name).toBe("y");
    expect(rowFor(rows, "x").target).toBeNull();
  });

  it("orders rows by the source system's `order`, not by array position", () => {
    // The fragment's axes arrive in whatever order the server sent. `order` is
    // the array's dimension order and therefore inputAxes order; a shuffled
    // input array must not change what we emit.
    const shuffled = [CYX[2], CYX[0], CYX[1]];

    expect(prefillMapping(shuffled, TZYX).map((r) => r.source.name)).toEqual([
      "c",
      "y",
      "x",
    ]);
  });

  it("does not mutate the caller's frozen axes array", () => {
    const frozen = Object.freeze([...CYX].reverse());
    expect(() => prefillMapping(frozen, TZYX)).not.toThrow();
  });
});

describe("buildRegistrationInput", () => {
  it("emits inputAxes in source `order` even when the axes arrived shuffled", () => {
    const rows = prefillMapping([CYX[2], CYX[0], CYX[1]], TZYX);
    const input = buildRegistrationInput(draftOf({ rows, mode: "IDENTITY" }));

    // `c` is unmapped, so it is absent — but y still precedes x.
    expect(input.transform.inputAxes).toEqual(["y", "x"]);
    expect(input.transform.outputAxes).toEqual(["y", "x"]);
  });

  it("orders scale by inputAxes, not by the target system's axis order", () => {
    // This is the exact failure the schema docstring describes. y=0.5, x=0.25:
    // if the arrays were ever built from the target's order the two would swap,
    // and nothing downstream would notice.
    const rows = prefillMapping(CYX, TZYX);
    rowFor(rows, "y").scale = 0.5;
    rowFor(rows, "x").scale = 0.25;

    const input = buildRegistrationInput(draftOf({ rows, mode: "SCALE" }));

    expect(input.transform.inputAxes).toEqual(["y", "x"]);
    expect(input.transform.scale).toEqual([0.5, 0.25]);
  });

  it("marks the edge MANUAL and leaves valueRelation unset", () => {
    const input = buildRegistrationInput(
      draftOf({ rows: prefillMapping(CYX, TZYX) }),
    );

    expect(input.validity).toBe("MANUAL");
    expect(input).not.toHaveProperty("valueRelation");
    expect(input.transform.kind).toBe("BY_DIMENSION");
  });

  it("coerces the strings FloatField hands back into real numbers", () => {
    // FloatField renders <Input type="string"> and forwards the raw event, so
    // every parameter arrives as a string. Left uncoerced these land inside
    // [Float!] as strings and the server rejects the edge opaquely.
    const rows = prefillMapping(CYX, TZYX);
    rowFor(rows, "y").scale = "0.325";
    rowFor(rows, "x").scale = "0.325";

    const input = buildRegistrationInput(draftOf({ rows, mode: "SCALE" }));

    expect(input.transform.scale).toEqual([0.325, 0.325]);
  });

  it("builds an M x (N+1) affine with the translation in the last column", () => {
    const rows = prefillMapping(CYX, TZYX);
    rowFor(rows, "y").scale = 0.5;
    rowFor(rows, "y").translation = 10;
    rowFor(rows, "x").scale = 0.25;
    rowFor(rows, "x").translation = -4;

    const input = buildRegistrationInput(
      draftOf({ rows, mode: "SCALE_TRANSLATE" }),
    );

    // 2 mapped axes -> 2 rows x 3 columns, diagonal, translation at index N=2.
    expect(input.transform.affine).toEqual([
      [0.5, 0, 10],
      [0, 0.25, -4],
    ]);
    expect(input.transform.kind).toBe("BY_DIMENSION");
  });

  it("keeps buildAffineDiagonal square in the mapped rank, not the system rank", () => {
    // (c,y,x) into (t,z,y,x) maps 2 axes: the affine is 2x3, not 4x5. M and N
    // are independent, which is why no BY_DIMENSION wrapper is needed.
    const mapped = mappedRows(prefillMapping(CYX, TZYX));
    const affine = buildAffineDiagonal(mapped);

    expect(affine).toHaveLength(2);
    expect(affine[0]).toHaveLength(3);
  });
});

describe("the rename rule", () => {
  const renaming = (): MappingRow[] => {
    const rows = prefillMapping(
      [axis("y", 0, "SPACE", "px"), axis("x", 1, "SPACE", "px")],
      [axis("row", 0, "SPACE", "µm"), axis("col", 1, "SPACE", "µm")],
    );
    // Prefill refuses to guess here, so state the mapping the user would.
    rows[0].target = axis("row", 0, "SPACE", "µm");
    rows[1].target = axis("col", 1, "SPACE", "µm");
    return rows;
  };

  it("detects a mapping that changes an axis name", () => {
    expect(renamesAnyAxis(renaming())).toBe(true);
    expect(renamesAnyAxis(prefillMapping(TZYX, TZYX))).toBe(false);
  });

  it("withholds identity/scale/translation from a renaming mapping, but allows affine", () => {
    const rows = renaming();

    expect(isModeAvailable("IDENTITY", rows)).toBe(false);
    expect(isModeAvailable("SCALE", rows)).toBe(false);
    expect(isModeAvailable("TRANSLATION", rows)).toBe(false);
    expect(isModeAvailable("SCALE_TRANSLATE", rows)).toBe(true);
    expect(isModeAvailable("AFFINE", rows)).toBe(true);
  });

  it("blocks submit for a renaming SCALE", () => {
    const issues = validateRegistration(
      draftOf({ rows: renaming(), mode: "SCALE" }),
    );
    expect(hasBlockingIssue(issues)).toBe(true);
  });

  /**
   * The rule's justification, demonstrated rather than asserted: a renaming
   * SCALE is read by our own evaluator as a no-op. If evalTransform ever learns
   * to consult outputAxes for SCALE, this test fails and the rename rule can be
   * relaxed — which is exactly when we'd want to know.
   */
  it("is justified: evalTransform ignores outputAxes for SCALE, so a rename evaluates to identity", () => {
    const renamingScale = {
      __typename: "ScaleTransformation",
      inputAxes: ["y", "x"],
      outputAxes: ["row", "col"],
      scale: [0.5, 0.25],
    };

    const matrix = evalTransform(
      renamingScale,
      renamingScale.inputAxes,
      renamingScale.outputAxes,
      // The renderer asks for the target's spatial axes by name.
      ["col", "row", null],
    );

    // Neither 0.5 nor 0.25 survives: the scales were silently dropped.
    expect(matrix?.[0][0]).toBe(1);
    expect(matrix?.[1][1]).toBe(1);
  });
});

describe("round-trip: what we author is what evalTransform renders", () => {
  /**
   * The server materializes an authored BY_DIMENSION edge as a
   * `ByDimensionTransformation` whose children carry the payload and
   * self-describe the axis subset they act on — so that is the shape the
   * round-trip feeds back to the evaluator. The composite's own axes are the
   * FULL system orders, exactly what `composeLayerAffine`'s prefix evaluation passes.
   */
  const materialized = (
    childTypename: string,
    transform: Record<string, unknown>,
  ) => ({
    __typename: "ByDimensionTransformation",
    transformations: [{ __typename: childTypename, ...transform }],
  });

  it("renders a SCALE edge with each axis's factor on its own diagonal entry", () => {
    const rows = prefillMapping(CYX, TZYX);
    rowFor(rows, "y").scale = 0.5;
    rowFor(rows, "x").scale = 0.25;

    const input = buildRegistrationInput(draftOf({ rows, mode: "SCALE" }));

    const matrix = evalTransform(
      materialized("ScaleTransformation", input.transform),
      ["c", "y", "x"],
      ["t", "z", "y", "x"],
      // evalTransform's spatial slots are (x, y, z) — the renderer's row order.
      ["x", "y", null],
    );

    expect(matrix?.[0][0]).toBe(0.25); // x
    expect(matrix?.[1][1]).toBe(0.5); // y
    expect(matrix?.[2][2]).toBe(1); // z: untouched by this edge
  });

  it("renders a SCALE_TRANSLATE affine with scale on the diagonal and translation in column 3", () => {
    const rows = prefillMapping(CYX, TZYX);
    rowFor(rows, "y").scale = 0.5;
    rowFor(rows, "y").translation = 10;
    rowFor(rows, "x").scale = 0.25;
    rowFor(rows, "x").translation = -4;

    const input = buildRegistrationInput(
      draftOf({ rows, mode: "SCALE_TRANSLATE" }),
    );

    const matrix = evalTransform(
      materialized("AffineTransformation", input.transform),
      ["c", "y", "x"],
      ["t", "z", "y", "x"],
      ["x", "y", null],
    );

    // evalTransform reads translation at column index inputAxes.length (= 2),
    // and lands it in the 4x4's column 3. If buildAffineDiagonal ever put the
    // translation anywhere else, this is what catches it.
    expect(matrix?.[0][0]).toBe(0.25);
    expect(matrix?.[0][3]).toBe(-4); // x offset
    expect(matrix?.[1][1]).toBe(0.5);
    expect(matrix?.[1][3]).toBe(10); // y offset
  });

  it("leaves the world's unmapped axes alone on a rank-changing edge", () => {
    // (c,y,x) -> (t,z,y,x): z is not produced by this edge, so it must come
    // back as an identity row — "the world's other axes are untouched".
    const rows = prefillMapping(CYX, TZYX);
    rowFor(rows, "y").scale = 0.5;
    rowFor(rows, "x").scale = 0.5;

    const input = buildRegistrationInput(draftOf({ rows, mode: "SCALE" }));

    const matrix = evalTransform(
      materialized("ScaleTransformation", input.transform),
      ["c", "y", "x"],
      ["t", "z", "y", "x"],
      ["x", "y", "z"],
    );

    expect(matrix?.[2][2]).toBe(1);
    expect(matrix?.[2][3]).toBe(0);
  });

  it("renders an IDENTITY edge as the identity matrix", () => {
    const input = buildRegistrationInput(
      draftOf({ rows: prefillMapping(TZYX, TZYX), mode: "IDENTITY" }),
    );

    const matrix = evalTransform(
      materialized("IdentityTransformation", input.transform),
      ["t", "z", "y", "x"],
      ["t", "z", "y", "x"],
      ["x", "y", "z"],
    );

    expect(matrix).toEqual([
      [1, 0, 0, 0],
      [0, 1, 0, 0],
      [0, 0, 1, 0],
      [0, 0, 0, 1],
    ]);
  });
});

describe("validateRegistration", () => {
  it("passes a well-formed rank-changing scale", () => {
    const rows = prefillMapping(CYX, TZYX);
    rowFor(rows, "y").scale = 0.325;
    rowFor(rows, "x").scale = 0.325;

    const issues = validateRegistration(draftOf({ rows, mode: "SCALE" }));

    expect(hasBlockingIssue(issues)).toBe(false);
  });

  it("blocks a self-edge", () => {
    const issues = validateRegistration(
      draftOf({
        sourceSystemId: "cs-1",
        targetSystemId: "cs-1",
        rows: prefillMapping(TZYX, TZYX),
      }),
    );

    expect(hasBlockingIssue(issues)).toBe(true);
  });

  it("blocks a mapping with no mapped axes", () => {
    const rows = prefillMapping(CYX, TZYX);
    rows.forEach((row) => (row.target = null));

    expect(hasBlockingIssue(validateRegistration(draftOf({ rows })))).toBe(true);
  });

  it("blocks a non-injective mapping even though the UI disables taken axes", () => {
    // The disable is only an affordance; RHF state is settable programmatically.
    const rows = prefillMapping(CYX, TZYX);
    rowFor(rows, "c").target = axis("y", 2, "SPACE", "µm");

    const issues = validateRegistration(draftOf({ rows, mode: "IDENTITY" }));

    expect(hasBlockingIssue(issues)).toBe(true);
    expect(issues.some((i) => i.message.includes('"y"'))).toBe(true);
  });

  it("blocks a zero scale, which would make the edge non-invertible", () => {
    const rows = prefillMapping(CYX, TZYX);
    rowFor(rows, "y").scale = 0;
    rowFor(rows, "x").scale = 1;

    const issues = validateRegistration(draftOf({ rows, mode: "SCALE" }));

    expect(hasBlockingIssue(issues)).toBe(true);
  });

  it("blocks an empty parameter cell rather than sending null into [Float!]", () => {
    const rows = prefillMapping(CYX, TZYX);
    rowFor(rows, "y").scale = "";
    rowFor(rows, "x").scale = "0.5";

    const issues = validateRegistration(draftOf({ rows, mode: "SCALE" }));

    expect(hasBlockingIssue(issues)).toBe(true);
  });

  it("warns but does not block when a SPACE axis is left unmapped", () => {
    const rows = prefillMapping(
      [axis("y", 0, "SPACE", "px"), axis("x", 1, "SPACE", "px")],
      TZYX,
    );
    rowFor(rows, "x").target = null;

    const issues = validateRegistration(draftOf({ rows, mode: "IDENTITY" }));

    expect(hasBlockingIssue(issues)).toBe(false);
    expect(issues.some((i) => i.level === "warning" && i.message.includes('"x"'))).toBe(
      true,
    );
  });

  it("stays quiet about an unmapped CHANNEL axis, which is normal", () => {
    const issues = validateRegistration(
      draftOf({ rows: prefillMapping(CYX, TZYX), mode: "IDENTITY" }),
    );

    expect(issues.some((i) => i.message.includes('"c"'))).toBe(false);
  });

  it("warns on an axis type mismatch", () => {
    const rows = prefillMapping(CYX, TZYX);
    rowFor(rows, "c").target = axis("t", 0, "TIME", "s");

    const issues = validateRegistration(draftOf({ rows, mode: "IDENTITY" }));

    expect(
      issues.some((i) => i.level === "warning" && i.message.includes("TIME")),
    ).toBe(true);
  });

  it("blocks an affine whose shape is not M x (N+1)", () => {
    const rows = prefillMapping(CYX, TZYX);
    const issues = validateRegistration(
      draftOf({ rows, mode: "AFFINE", matrix: [[1, 0, 0]] }),
    );

    expect(hasBlockingIssue(issues)).toBe(true);
  });

  it("warns on a singular affine without blocking it", () => {
    const rows = prefillMapping(CYX, TZYX);
    const issues = validateRegistration(
      draftOf({
        rows,
        mode: "AFFINE",
        matrix: [
          [1, 1, 0],
          [1, 1, 0],
        ],
      }),
    );

    expect(hasBlockingIssue(issues)).toBe(false);
    expect(issues.some((i) => i.message.includes("singular"))).toBe(true);
  });
});

describe("num", () => {
  it("parses the strings FloatField produces", () => {
    expect(num("0.325")).toBe(0.325);
    expect(num(" -4 ")).toBe(-4);
    expect(num(2)).toBe(2);
  });

  it("throws rather than yielding NaN or null", () => {
    expect(() => num("")).toThrow();
    expect(() => num(null)).toThrow();
    expect(() => num("abc")).toThrow();
  });
});
