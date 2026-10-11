import { useCallback, useRef } from "react";

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
 *
 * `toInput` is for a patch whose stored form is not its wire form: a picker
 * edit is held as drafts and sent as lens ids (`entryInputs.ts`), and getting
 * the ids may take a round trip. The local patch still lands at once. The
 * WRITES are then sent one after another, in the order they were made: a
 * picker is a whole-array replace, so a write that resolved late and arrived
 * after a newer one would put the older picker back.
 */
export function useOptimisticLayerPatch<P extends object, I extends object = P>(
  layerId: string,
  mutate: (options: { variables: { input: { id: string } & I } }) => Promise<unknown>,
  logTag: string,
  toInput?: (patch: P) => Promise<I> | I,
): (patch: P) => void {
  const patchSceneLayer = useSceneStore((s) => s.patchSceneLayer);
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  return useCallback(
    (patch: P) => {
      patchSceneLayer(layerId, patch as Parameters<typeof patchSceneLayer>[1]);
      const write = async () => {
        const input = toInput ? await toInput(patch) : (patch as unknown as I);
        await mutate({ variables: { input: { id: layerId, ...input } } });
      };
      const report = (error: unknown) => {
        console.warn(`${logTag} could not save layer settings`, error);
      };
      if (!toInput) {
        void write().catch(report);
        return;
      }
      queue.current = queue.current.then(write).catch(report);
    },
    [layerId, patchSceneLayer, mutate, logTag, toInput],
  );
}
