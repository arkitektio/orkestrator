import type { StoreApi } from "zustand";

/**
 * Render-plane subscriptions to a scene store.
 *
 * ## Why these are functions and not hooks
 *
 * P17 (`ARCHITECTURE.md`) splits the scene in two: a RENDER plane that reads
 * stores imperatively, mutates three objects and calls `invalidate()`, and a
 * UI plane that re-renders. The hot fields — `dimSelections`, `currentZ`,
 * `cameraMoving` — change at frame cadence, so a React subscription to any of
 * them re-renders a layer per frame.
 *
 * A hook invites exactly that. A plain function returning an unsubscribe can
 * only be called from an effect body and can only mutate, so the shape itself
 * enforces the rule. `apply` must never call `setState` or a React setter.
 *
 * ## Why the selector must be SCALAR
 *
 * `select` runs on EVERY store write, so keep it a property read. More
 * importantly, selecting an OBJECT turns the change test into an identity
 * latch, and a store that republishes `{...state.dimSelections}` on every
 * scrub then re-applies for dims the caller does not even carry. That was a
 * real bug: `TracksLayer` latched on `dimSelections` itself and wrote two
 * uniforms plus an `invalidate()` on any dim's scrub, while `PointsLayer` —
 * the layer it was copied from — compared `[TIME_DIM]` and did not.
 */

/**
 * Apply once at bind time, then whenever `select(state)` changes by `Object.is`.
 *
 * The first call passes `previous === undefined`, which is what lets an
 * edge-triggered caller (`if (previous && !next)`) be a no-op on bind without
 * needing an `immediate: false` option.
 *
 * Returns the unsubscribe; call it in effect cleanup.
 */
export function bindField<S, T>(
  api: StoreApi<S>,
  select: (state: S) => T,
  apply: (value: T, previous: T | undefined) => void,
): () => void {
  let last = select(api.getState());
  apply(last, undefined);
  return api.subscribe((state) => {
    const next = select(state);
    if (Object.is(next, last)) return;
    const previous = last;
    last = next;
    apply(next, previous);
  });
}

/**
 * `bindField` over several scalars at once: re-apply when ANY of them changes.
 *
 * For a binder that reads more of the state than one field but still must not
 * re-apply on unrelated churn — a vector layer watching only the dims its own
 * lens collapses, say. Compares in place against a reused array, so it
 * allocates nothing per store write.
 */
export function bindFields<S>(
  api: StoreApi<S>,
  selects: readonly ((state: S) => unknown)[],
  apply: (state: S) => void,
): () => void {
  const last = selects.map((select) => select(api.getState()));
  apply(api.getState());
  return api.subscribe((state) => {
    let changed = false;
    for (let i = 0; i < selects.length; i += 1) {
      const next = selects[i](state);
      if (!Object.is(next, last[i])) {
        last[i] = next;
        changed = true;
      }
    }
    if (changed) apply(state);
  });
}

/**
 * Apply now and on ANY store write.
 *
 * For binders that read enough of the state that a change test would cost more
 * than the apply — the probe markers, whose position depends on the probe, the
 * layer's affine and the camera all at once. Deliberately the blunt option:
 * reach for `bindField` first.
 */
export function bindAll<S>(api: StoreApi<S>, apply: (state: S) => void): () => void {
  apply(api.getState());
  return api.subscribe(apply);
}
