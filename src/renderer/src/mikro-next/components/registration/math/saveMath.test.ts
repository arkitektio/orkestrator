import { describe, expect, it } from "vitest";
import { buildRegistrationInput, prefillMapping } from "../../../forms/registration/mapping";
import { placementToSpatialAffine } from "@/lib/scene/coords/transformGraph";
import { classifyPlacement, layersThroughEdge, type RegistrationEdgeLike } from "./eligibility";
import { aboutPivot, identity, mul, rotationAxisAngle, scaling, type Mat4 } from "./mat4";
import { planSave } from "./saveMath";

const WORLD = { id: "world", name: "World" };
const GRID = { id: "grid", name: "Grid" };
const SPATIAL = ["x", "y", "z"];
const I4 = identity();

const IN_PLANE: Mat4 = aboutPivot(mul(rotationAxisAngle([0, 0, 1], 0.5), scaling([2, 2, 1])), [50, 60, 0]);
const TILT: Mat4 = aboutPivot(rotationAxisAngle([1, 0, 0], 0.3), [0, 0, 0]);

const bareAffine: RegistrationEdgeLike = {
  __typename: "AffineTransformation",
  id: "e1",
  version: 3,
  validity: "MANUAL",
  input: GRID,
  output: WORLD,
  inputAxes: ["z", "y", "x"],
  outputAxes: ["z", "y", "x"],
  affine: [
    [4, 0, 0, 0],
    [0, 0.5, 0, 10],
    [0, 0, 0.5, 20],
  ],
};

const byDimension: RegistrationEdgeLike = {
  __typename: "ByDimensionTransformation",
  id: "e2",
  version: 1,
  validity: "MANUAL",
  input: GRID,
  output: WORLD,
  inputAxes: ["t", "y", "x"],
  outputAxes: ["t", "y", "x"],
  transformations: [
    { __typename: "ScaleTransformation", inputAxes: ["t"], scale: [60] },
    {
      __typename: "AffineTransformation",
      inputAxes: ["y", "x"],
      outputAxes: ["y", "x"],
      affine: [
        [0.5, 0, 10],
        [0, 0.5, 20],
      ],
    },
  ],
};

const reduce = (affine: { matrix: number[][]; inputAxes: readonly string[]; outputAxes: readonly string[] }) =>
  placementToSpatialAffine(affine, SPATIAL, SPATIAL) ?? I4;

const expectClose = (a: number[][], b: number[][]) =>
  a.forEach((row, r) => row.forEach((v, c) => expect(v).toBeCloseTo(b[r][c], 9)));

describe("planSave", () => {
  const base = { worldSpatial: SPATIAL, dataSpatial: SPATIAL };

  it("is a no-op for an untouched session", () => {
    expect(planSave({ ...base, step: { inverted: false, transformation: bareAffine }, delta: I4 }).kind).toBe("noop");
  });

  it("UPDATES a bare affine in place, in the edge's own axis order", () => {
    const plan = planSave({
      ...base,
      step: { inverted: false, transformation: bareAffine },
      delta: IN_PLANE,
      name: "  interactive (similarity)  ",
    });
    if (plan.kind !== "update") throw new Error(plan.kind);
    expect(plan.variables.id).toBe("e1");
    expect(plan.variables.validity).toBe("MANUAL");
    expect(plan.variables.name).toBe("interactive (similarity)");
    expect(plan.affine.inputAxes).toEqual(["z", "y", "x"]);
    expect(plan.variables.affine[0]).toEqual([4, 0, 0, 0]); // z untouched
    expectClose(reduce(plan.affine), mul(IN_PLANE, reduce({ ...bareAffine, matrix: bareAffine.affine as number[][] } as never)));
  });

  it("REPLACES a BY_DIMENSION wrapper, keeping the non-spatial axis", () => {
    const plan = planSave({
      ...base,
      step: { inverted: false, transformation: byDimension },
      delta: IN_PLANE,
      inputOrder: ["t", "y", "x"],
      outputOrder: ["t", "z", "y", "x"],
    });
    if (plan.kind !== "replace") throw new Error(plan.kind);
    expect(plan.deleteId).toBe("e2");
    expect(plan.because).toMatch(/per-dimension/);
    expect(plan.create.input).toBe("grid");
    expect(plan.create.output).toBe("world");
    expect(plan.create.validity).toBe("MANUAL");
    expect(plan.create.transform.kind).toBe("BY_DIMENSION");
    expect(plan.create.transform.inputAxes).toEqual(["t", "y", "x"]);
    expect(plan.create.transform.affine?.[0]).toEqual([60, 0, 0, 0]); // the t row survived
  });

  it("replaces, never updates, when the delta needs an axis the edge lacks", () => {
    const flat: RegistrationEdgeLike = {
      ...bareAffine,
      id: "e3",
      inputAxes: ["y", "x"],
      outputAxes: ["y", "x"],
      affine: [
        [0.5, 0, 10],
        [0, 0.5, 20],
      ],
    };
    const plan = planSave({
      ...base,
      step: { inverted: false, transformation: flat },
      delta: TILT,
      inputOrder: ["z", "y", "x"],
      outputOrder: ["z", "y", "x"],
    });
    if (plan.kind !== "replace") throw new Error(plan.kind);
    expect(plan.because).toMatch(/did not cover/);
    // Re-ordered into the systems' axis order, not left appended.
    expect(plan.create.transform.inputAxes).toEqual(["z", "y", "x"]);
    expect(plan.create.transform.outputAxes).toEqual(["z", "y", "x"]);
    expectClose(reduce(plan.affine), mul(TILT, reduce({ inputAxes: flat.inputAxes!, outputAxes: flat.outputAxes!, matrix: flat.affine as number[][] })));
  });

  it("replaces a rotation edge rather than storing a non-rotation in it", () => {
    const rotation: RegistrationEdgeLike = { ...bareAffine, __typename: "RotationTransformation", id: "e4" };
    const plan = planSave({ ...base, step: { inverted: false, transformation: rotation }, delta: IN_PLANE });
    expect(plan.kind).toBe("replace");
  });

  it("keeps an INVERTED edge's direction and endpoints", () => {
    const worldToData: RegistrationEdgeLike = { ...bareAffine, id: "e5", input: WORLD, output: GRID };
    const plan = planSave({ ...base, step: { inverted: true, transformation: worldToData }, delta: IN_PLANE });
    if (plan.kind !== "update") throw new Error(plan.kind);
    expect(plan.variables.id).toBe("e5");
  });

  it("refuses singular and non-finite deltas, and non-affine edges", () => {
    const step = { inverted: false, transformation: bareAffine };
    expect(planSave({ ...base, step, delta: scaling([1, 0, 1]) }).kind).toBe("refuse");
    const broken = identity();
    broken[0][3] = Number.NaN;
    expect(planSave({ ...base, step, delta: broken }).kind).toBe("refuse");
    expect(
      planSave({
        ...base,
        step: { inverted: false, transformation: { __typename: "FieldTransformation", id: "f" } },
        delta: IN_PLANE,
      }).kind,
    ).toBe("refuse");
  });

  it("emits the same edge shape the Register form does", () => {
    // Guards the contract with forms/registration/mapping.ts: a replacement is
    // indistinguishable in SHAPE from a hand-authored affine registration.
    const axes = [
      { name: "y", order: 0, type: "SPACE" },
      { name: "x", order: 1, type: "SPACE" },
    ];
    const authored = buildRegistrationInput({
      sourceSystemId: "grid",
      targetSystemId: "world",
      rows: prefillMapping(axes, axes),
      mode: "AFFINE",
      matrix: [
        [1, 0, 0],
        [0, 1, 0],
      ],
    });
    const plan = planSave({ ...base, step: { inverted: false, transformation: byDimension }, delta: IN_PLANE });
    if (plan.kind !== "replace") throw new Error(plan.kind);
    expect(Object.keys(plan.create).sort()).toEqual(Object.keys(authored).sort());
    expect(Object.keys(plan.create.transform).sort()).toEqual(Object.keys(authored.transform).sort());
  });
});

describe("classifyPlacement", () => {
  const placed = (edge: RegistrationEdgeLike, inverted = false) => ({
    worldId: "world",
    asAffine: {},
    pathToWorld: [{ inverted: false, transformation: { ...bareAffine, id: "upstream", output: GRID } }, { inverted, transformation: edge }],
  });

  it("accepts an authored affine landing in the world", () => {
    expect(classifyPlacement(placed(bareAffine))).toEqual({
      status: "editable",
      edgeId: "e1",
      version: 3,
      inverted: false,
      confirm: null,
    });
  });

  it("routes an unregistered layer to the seed flow, not to a refusal", () => {
    expect(classifyPlacement({ worldId: "world", pathToWorld: null, asAffine: null })).toEqual({
      status: "unregistered",
    });
  });

  it("refuses when the layer's own space is the world", () => {
    const result = classifyPlacement({ worldId: "world", pathToWorld: [], asAffine: {} });
    expect(result.status).toBe("refused");
  });

  it("refuses an uncomposable placement", () => {
    expect(classifyPlacement({ ...placed(bareAffine), asAffine: null }).status).toBe("refused");
  });

  it("checks the WORLD side of an inverted step", () => {
    const worldToData = { ...bareAffine, input: WORLD, output: GRID };
    expect(classifyPlacement(placed(worldToData, true)).status).toBe("editable");
    expect(classifyPlacement(placed(worldToData, false)).status).toBe("refused");
  });

  it("refuses derivation facts, scoped edges, validated edges and non-affine kinds", () => {
    expect(classifyPlacement(placed({ ...bareAffine, valueRelation: "IDENTICAL" })).status).toBe("refused");
    expect(classifyPlacement(placed({ ...bareAffine, selector: { axis: "c", index: 2 } })).status).toBe("refused");
    expect(classifyPlacement(placed({ ...bareAffine, validity: "VALIDATED" })).status).toBe("refused");
    expect(
      classifyPlacement(placed({ __typename: "FieldTransformation", id: "f", input: GRID, output: WORLD })).status,
    ).toBe("refused");
  });

  it("does not judge fields the scene fragment has not fetched", () => {
    const { ...sparse } = bareAffine;
    delete sparse.selector;
    delete sparse.valueRelation;
    expect(classifyPlacement(placed(sparse)).status).toBe("editable");
  });

  it("asks before overwriting a metadata-inferred placement", () => {
    const result = classifyPlacement(placed({ ...bareAffine, validity: "INFERRED" }));
    expect(result.status).toBe("editable");
    if (result.status === "editable") expect(result.confirm).toMatch(/metadata/);
  });

  it("finds every layer looking through the edge", () => {
    const layers = [
      { id: "a", pathToWorld: placed(bareAffine).pathToWorld },
      { id: "b", pathToWorld: placed(bareAffine).pathToWorld },
      { id: "c", pathToWorld: placed({ ...bareAffine, id: "other" }).pathToWorld },
      { id: "d", pathToWorld: null },
    ];
    expect(layersThroughEdge(layers, "e1").map((layer) => layer.id)).toEqual(["a", "b"]);
  });
});
