/**
 * Session delta → the mutation that stores it.
 *
 * The draft is a world-space delta `D` on top of the edge's current state.
 * Saving folds it INTO the edge, in the edge's own named-axis space:
 *
 *   forward step   E′ = embed(D) · E          (the edge's output is the world)
 *   inverted step  E′ = E · embed(D⁻¹)        (the edge's input is the world)
 *
 * and then picks the least destructive write that can carry `E′`:
 *
 *  - UPDATE in place — only a top-level bare `AffineTransformation` whose axes
 *    did not change. `updateTransformation` takes `affine` but cannot change
 *    kind, axes or endpoints, and an in-place refinement is what keeps the
 *    edge's id, bumps its `version` and appends to its provenance.
 *  - REPLACE — everything else: a BY_DIMENSION wrapper has no `affine` of its
 *    own to update, a Scale/Translation/Identity cannot hold a rotation, a
 *    ROTATION must stay orthonormal, and an extended edge has new axes. The
 *    replacement is authored the way `forms/registration/mapping.ts` authors
 *    every registration (BY_DIMENSION + named axes + `MANUAL`), created FIRST
 *    and the old edge deleted after — a transient rival is legal, a transient
 *    gap would un-place the layer.
 *
 * Pure, and imports nothing generated (see mapping.ts for why).
 */
import {
  isIdentityDelta,
  leftMultiplyWorldDelta,
  namedAffineOf,
  reorderAxes,
  rightMultiplyInverseDelta,
  sameAxes,
  type NamedAffine,
  type SpatialTriple,
} from "../../../lib/coords/namedAffine";
import type { CreateTransformationVariables } from "../../../forms/registration/mapping";
import type { RegistrationStepLike } from "./eligibility";
import { det3, linear3, type Mat4 } from "./mat4";

export type SavePlan =
  | { kind: "noop" }
  | {
      kind: "update";
      variables: { id: string; affine: number[][]; name: string | null; validity: "MANUAL" };
      affine: NamedAffine;
    }
  | {
      kind: "replace";
      create: CreateTransformationVariables;
      deleteId: string;
      affine: NamedAffine;
      /** Why an in-place update was not possible — shown before saving. */
      because: string;
    }
  | { kind: "refuse"; reason: string };

export type SaveContext = {
  step: RegistrationStepLike;
  delta: Mat4;
  /** [x, y, z] names of the scene's world system. */
  worldSpatial: SpatialTriple;
  /** [x, y, z] names of the edge's OTHER endpoint (the data side). */
  dataSpatial: SpatialTriple;
  /** Full axis-name order of the edge's input / output systems. */
  inputOrder?: readonly string[] | null;
  outputOrder?: readonly string[] | null;
  name?: string | null;
};

const REPLACE_REASON: Record<string, string> = {
  ByDimensionTransformation: "a per-dimension edge has no matrix of its own to refine",
  SequenceTransformation: "a sequence edge has no matrix of its own to refine",
  ScaleTransformation: "a scale edge cannot hold a rotation or an offset",
  TranslationTransformation: "a translation edge cannot hold a rotation or a scale",
  IdentityTransformation: "an identity edge has no parameters",
  RotationTransformation: "a rotation edge must stay a pure rotation",
};

export const planSave = (context: SaveContext): SavePlan => {
  const edge = context.step.transformation;
  if (!edge) return { kind: "refuse", reason: "There is no edge to save to." };
  // Before the identity test: every comparison against NaN is false, so a
  // broken delta would otherwise read as "untouched" and save as a no-op.
  if (context.delta.some((row) => row.some((value) => !Number.isFinite(value)))) {
    return { kind: "refuse", reason: "The adjustment contains a non-finite number." };
  }
  if (isIdentityDelta(context.delta)) return { kind: "noop" };
  if (Math.abs(det3(linear3(context.delta))) < 1e-12) {
    return { kind: "refuse", reason: "The adjustment collapses an axis, so it could never be walked backwards." };
  }

  const current = namedAffineOf(edge);
  if (!current) return { kind: "refuse", reason: "The edge is not an affine map." };
  if (!edge.input?.id || !edge.output?.id) {
    return { kind: "refuse", reason: "The edge does not say which systems it connects." };
  }

  const axes = { worldSpatial: context.worldSpatial, dataSpatial: context.dataSpatial };
  const result = context.step.inverted
    ? rightMultiplyInverseDelta(current, context.delta, axes)
    : leftMultiplyWorldDelta(current, context.delta, axes);
  if (!result.ok) return { kind: "refuse", reason: result.reason };

  const name = context.name?.trim() ? context.name.trim() : null;

  if (edge.__typename === "AffineTransformation" && !result.extended && sameAxes(current, result.affine)) {
    return {
      kind: "update",
      variables: { id: edge.id, affine: result.affine.matrix, name, validity: "MANUAL" },
      affine: result.affine,
    };
  }

  // A new edge is ordered the way the schema asks of every edge: `inputAxes` in
  // the INPUT SYSTEM's axis order. Extension appends, so re-order here.
  const ordered = reorderAxes(result.affine, { input: context.inputOrder, output: context.outputOrder });
  return {
    kind: "replace",
    deleteId: edge.id,
    affine: ordered,
    because: result.extended
      ? "the adjustment moves along an axis this edge did not cover"
      : (REPLACE_REASON[edge.__typename ?? ""] ?? "this kind of edge cannot be refined in place"),
    create: {
      input: edge.input.id,
      output: edge.output.id,
      name,
      validity: "MANUAL",
      transform: {
        kind: "BY_DIMENSION",
        inputAxes: [...ordered.inputAxes],
        outputAxes: [...ordered.outputAxes],
        affine: ordered.matrix,
      },
    },
  };
};
