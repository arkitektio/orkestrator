import { useCallback } from "react";

import { useSceneStore } from "../stores/sceneStore";

/**
 * Preview locally, persist on commit — the write every layer card makes.
 *
 * The fold is not optional: `SceneProvider` reconciles layers by STRUCTURE, so
 * a `GetScene` re-emission that changed only this layer's content keeps the
 * stored object as it was. Without the local patch a slider snaps back until
 * the next structural change.
 *
 * The cast is load-bearing and deliberate. The two sides have different
 * nullability on purpose: the mutation INPUT lets a field be null to mean
 * "reset to the server's default", while the FRAGMENT types some of those same
 * fields non-null because that is what comes back. So the local preview takes
 * the patch as-is and the authoritative value arrives with the mutation's own
 * result. Widening the store's patch type instead would lose that check at
 * every call site.
 *
 * NOT for the dirty/save cards (`MeshLayerCard`, `LabelLayerCard`): those fold
 * locally and set a dirty flag rather than writing through, and giving this a
 * mode flag to cover them is the anti-pattern.
 */
export function useOptimisticLayerPatch<P extends object>(
  layerId: string,
  mutate: (options: { variables: { input: { id: string } & P } }) => Promise<unknown>,
  logTag: string,
): (patch: P) => void {
  const patchSceneLayer = useSceneStore((s) => s.patchSceneLayer);
  return useCallback(
    (patch: P) => {
      patchSceneLayer(layerId, patch as Parameters<typeof patchSceneLayer>[1]);
      void mutate({ variables: { input: { id: layerId, ...patch } } }).catch(
        (error: unknown) => {
          console.warn(`${logTag} could not save layer settings`, error);
        },
      );
    },
    [layerId, patchSceneLayer, mutate, logTag],
  );
}
