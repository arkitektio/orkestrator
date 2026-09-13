import { identityOf } from "./objectIdentity";
import { buildSliceSignature } from "./sliceSignature";
import type { LayerState } from "./layerModel";

/**
 * Value signature over exactly the LAYER fields the node planner and the
 * visibility computation read — the guard that lets their `layers`-array
 * subscriptions ignore window-only layer replacements (a clim/gamma drag
 * rewrites `channels`/`sources` and the flat transfer fields sixty times a
 * second, and none of that is a planning input).
 *
 * The sibling of `gpu/channelDataSignature.ts`'s structure/window split, and
 * under the same contract: **if the planner or the visibility walk starts
 * reading a NEW layer field, it MUST be added here** — or edits to it will
 * silently stop replanning. The reads today, enumerated from
 * `nodePlanTracker.recompute` (both passes), `platform/visibility/visibility.ts`
 * and the helpers they call:
 *
 *  - `visible` — the plannable filter and the trackable walk.
 *  - `__typename` — label pools (`poolValueSemantics`, `resolveLayerDataRange`,
 *    `exactValues`).
 *  - everything under `lens` — `dataset.dataArrays` (level sources),
 *    `dataset.axisNames`, `lens.axisNames`/`shape`/`slices` (geometry,
 *    collapsible dims), `activeAnchors[].valueHistogram` (the pool's data
 *    range). Captured as ONE identity: the stores replace `lens` immutably,
 *    and the per-tick layer spreads (`pushChannels`, `pushPreview`) carry the
 *    reference through unchanged.
 *  - `affineMatrix` — placement (per-class plan signature, the voxel camera,
 *    the visibility box). By VALUE: a re-minted equal matrix must not replan.
 *  - `fixedLOD` — the per-class plan signature and the planner's clamp.
 *  - the axis mapping and the phasor recipe — `xAxis`/`yAxis`/`zAxis`/
 *    `intensityAxis`/`phasorAxis`, `phasors[].{harmonic,intensityIndex}`,
 *    captured via `buildSliceSignature(layer)` (no dim selections: those are
 *    a viewerStore input the trackers already subscribe to separately, and a
 *    selection must not enter a signature cached per layer object).
 *
 * Cached per layer OBJECT (WeakMap): during a drag only the edited layer
 * re-stringifies; untouched siblings hit their cache entries.
 */

const cache = new WeakMap<LayerState, string>();

export function layerPlanSignature(layer: LayerState): string {
  const hit = cache.get(layer);
  if (hit !== undefined) return hit;
  let signature: string;
  try {
    signature = JSON.stringify({
      id: layer.id,
      visible: layer.visible !== false,
      typename: layer.__typename,
      lens: identityOf(layer.lens),
      affine: layer.affineMatrix ?? null,
      fixedLOD: layer.fixedLOD ?? null,
      slice: buildSliceSignature(layer),
    });
  } catch {
    // Unserializable state (should not happen for store data): fall back to
    // always-replan rather than serving a stale plan.
    signature = `unserializable:${++unserializableCounter}`;
  }
  cache.set(layer, signature);
  return signature;
}

let unserializableCounter = 0;

/**
 * The whole list's planning identity, order included.
 *
 * Memoized on the ARRAY's identity: half a dozen components use this as a raw
 * zustand selector, and zustand runs every selector on every store write, so
 * without the memo a contrast drag (which republishes `layers` per tick) ran
 * six map+join passes per tick.
 */
const layersKeyCache = new WeakMap<readonly LayerState[], string>();
export const layersPlanKey = (layers: readonly LayerState[]): string => {
  let key = layersKeyCache.get(layers);
  if (key === undefined) {
    key = layers.map(layerPlanSignature).join("\n");
    layersKeyCache.set(layers, key);
  }
  return key;
};

/**
 * `id -> index` for a published `layers` array, memoized on the array's
 * identity, for selectors that look members up per store write.
 */
const layerIndexCache = new WeakMap<readonly LayerState[], Map<string, number>>();
export const layerIndexOf = (layers: readonly LayerState[]): Map<string, number> => {
  let index = layerIndexCache.get(layers);
  if (!index) {
    index = new Map();
    for (let i = 0; i < layers.length; i++) index.set(layers[i].id, i);
    layerIndexCache.set(layers, index);
  }
  return index;
};

/**
 * Whether two published `layers` arrays hold the SAME elements in the same
 * order. `sceneStore.touchImageLayers` republishes identical elements in a
 * fresh array precisely to request a replan when a zarr store opened late —
 * that TOUCH must schedule even though every plan signature is unchanged, so
 * a tracker guard tests this FIRST and compares signatures only for a real
 * element replacement.
 */
export const sameLayerElements = (
  a: readonly LayerState[],
  b: readonly LayerState[],
): boolean => a.length === b.length && a.every((layer, index) => layer === b[index]);
