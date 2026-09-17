/**
 * What the session must do when the SCENE moves under it.
 *
 * The scene's layer list changes for reasons the session did not cause (a
 * layer deleted, another client re-registering the same edge) and for the one
 * reason it did (its own save landing). Both arrive the same way — the moving
 * layer's final edge shows a new `(id, version)` — and both need the same
 * answer: the scene store has already dropped the placement preview for that
 * layer (COORDINATE_SYSTEMS.md §1 R1a), so the draft MUST be zeroed in step or
 * it would be applied a second time on top of the new server placement.
 *
 * A pure decision so the easy-to-get-wrong ordering is tested without React.
 */
import { classifyPlacement, layersThroughEdge, type RegistrationStepLike } from "../math/eligibility";
import type { RegistrationSession } from "./registrationStore";

export type SessionLayer = {
  id: string;
  placeable: boolean;
  pathToWorld?: readonly RegistrationStepLike[] | null;
  finalStep: { edgeId: string; version: number | null; inverted: boolean } | null;
};

export type SessionAction =
  | { type: "none" }
  /** The moving layer is gone, or no longer adjustable. */
  | { type: "end"; reason: string }
  /** The edge's state moved: fold the draft and follow the new state. */
  | { type: "rebase"; edgeId: string; edgeVersion: number | null; inverted: boolean; memberLayerIds: string[] }
  /** Same edge, but a different set of layers looks through it now. */
  | { type: "members"; memberLayerIds: string[] }
  /** A seeded layer became placeable: its session can start. */
  | { type: "begin"; layerId: string };

const sameIds = (a: readonly string[], b: readonly string[]) =>
  a.length === b.length && a.every((id, index) => id === b[index]);

export const reconcileSession = (input: {
  session: RegistrationSession | null;
  pendingLayerId: string | null;
  layers: readonly SessionLayer[];
  worldId: string | null;
}): SessionAction => {
  const { session, pendingLayerId, layers, worldId } = input;

  if (!session) {
    if (!pendingLayerId || !worldId) return { type: "none" };
    const pending = layers.find((layer) => layer.id === pendingLayerId);
    if (!pending) return { type: "none" };
    const verdict = classifyPlacement({
      pathToWorld: pending.pathToWorld,
      asAffine: pending.placeable ? {} : null,
      worldId,
    });
    return verdict.status === "editable" ? { type: "begin", layerId: pending.id } : { type: "none" };
  }

  const moving = layers.find((layer) => layer.id === session.movingLayerId);
  if (!moving) return { type: "end", reason: "The layer being registered was removed from the scene." };
  if (!moving.finalStep || !moving.placeable) {
    return { type: "end", reason: "The layer being registered is no longer placed in this scene." };
  }

  const members = layersThroughEdge(layers, moving.finalStep.edgeId).map((layer) => layer.id);
  const { edgeId, version, inverted } = moving.finalStep;
  if (edgeId !== session.edgeId || version !== session.edgeVersion || inverted !== session.inverted) {
    return { type: "rebase", edgeId, edgeVersion: version, inverted, memberLayerIds: members };
  }
  return sameIds(members, session.memberLayerIds) ? { type: "none" } : { type: "members", memberLayerIds: members };
};
