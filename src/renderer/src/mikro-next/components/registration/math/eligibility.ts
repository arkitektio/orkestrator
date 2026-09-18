/**
 * Which edge an interactive registration may rewrite — and when it may not.
 *
 * A session edits exactly ONE edge: the FINAL step of a layer's `pathToWorld`,
 * the one landing in the scene's world. That restriction is what makes the
 * preview honest without a client path walk: with the last step `S`, the
 * placement is `S · (rest)`, so a world-space delta `D` gives `D·S · (rest)` —
 * every layer looking through that edge moves by the same `D`, and nothing
 * upstream needs evaluating.
 *
 * But "lands in the world" is not the same as "is a registration".
 * `CoordinateSystem.registrations` also lists lens crops and derived children
 * landing in a container's own grid, and a scene bootstrapped from a dataset
 * uses that grid AS its world. Rewriting one of those would edit a fact about
 * the data, so the checks below are about what the edge IS, not where it ends.
 *
 * Two stages share this function: the scene fragment carries enough for the
 * first pass (kind, validity, endpoints); `selector` / `valueRelation` arrive
 * with the dedicated edge query and are only judged when present.
 */
import { namedAffineOf } from "../../../lib/coords/namedAffine";
import type { TransformLike } from "@/lib/scene/coords/transformGraph";

export type RegistrationEdgeLike = NonNullable<TransformLike> & {
  id: string;
  version?: number | null;
  validity?: string | null;
  /** undefined = not fetched yet; null = holds everywhere. */
  selector?: unknown | null;
  /** undefined = not fetched yet; null = a placement, not a derivation. */
  valueRelation?: string | null;
};

export type RegistrationStepLike = {
  inverted: boolean;
  transformation: RegistrationEdgeLike | null;
};

export type PlacementClassification =
  | {
      status: "editable";
      edgeId: string;
      version: number | null;
      inverted: boolean;
      /** Set when saving changes what the edge CLAIMS; the UI must confirm. */
      confirm: string | null;
    }
  /** No path at all: seed an edge through the Register form first. */
  | { status: "unregistered" }
  | { status: "refused"; reason: string };

export const finalStep = (
  pathToWorld: readonly RegistrationStepLike[] | null | undefined,
): RegistrationStepLike | null => pathToWorld?.at(-1) ?? null;

export const classifyPlacement = (layer: {
  pathToWorld?: readonly RegistrationStepLike[] | null;
  asAffine?: unknown | null;
  worldId: string;
}): PlacementClassification => {
  if (layer.pathToWorld == null) return { status: "unregistered" };

  if (layer.pathToWorld.length === 0) {
    return {
      status: "refused",
      reason:
        "This layer's own space IS the scene's world, so there is no registration between them to adjust. Create a scene over a shared world and register the data into it.",
    };
  }

  if (layer.asAffine == null) {
    return {
      status: "refused",
      reason:
        "The server could not compose this layer's placement into one matrix, so there is nothing to preview an adjustment against.",
    };
  }

  const step = finalStep(layer.pathToWorld);
  const edge = step?.transformation;
  if (!step || !edge) return { status: "refused", reason: "The placement path has no final edge." };

  const worldSide = step.inverted ? edge.input : edge.output;
  if (worldSide?.id !== layer.worldId) {
    return { status: "refused", reason: "The last edge of this layer's path does not land in the scene's world." };
  }

  if (edge.valueRelation != null) {
    return {
      status: "refused",
      reason:
        "The edge placing this layer records how the data was DERIVED (a crop, a processing step), not where it sits. It is a fact about the data and cannot be dragged.",
    };
  }

  if (edge.selector != null) {
    return {
      status: "refused",
      reason:
        "This registration applies only at one index of an axis (a per-channel or per-timepoint correction). Adjusting piecewise registrations interactively is not supported.",
    };
  }

  if (edge.validity === "VALIDATED") {
    return {
      status: "refused",
      reason: "This edge was derived or checked by the server (VALIDATED); it is not an authored registration.",
    };
  }

  if (!namedAffineOf(edge)) {
    return {
      status: "refused",
      reason:
        "The edge placing this layer is not an affine map (a displacement field, an axis mapping or a declared non-correspondence), so it has no matrix to adjust.",
    };
  }

  return {
    status: "editable",
    edgeId: edge.id,
    version: edge.version ?? null,
    inverted: step.inverted,
    confirm:
      edge.validity === "INFERRED"
        ? "This placement was read from the data's metadata. Saving replaces it with your manual registration."
        : null,
  };
};

/**
 * Every layer that looks through the same final edge — they all move together,
 * and the session previews them together.
 */
export const layersThroughEdge = <L extends { id: string; pathToWorld?: readonly RegistrationStepLike[] | null }>(
  layers: readonly L[],
  edgeId: string,
): L[] => layers.filter((layer) => finalStep(layer.pathToWorld)?.transformation?.id === edgeId);
