import { SharedChunkCache } from "@/core/data/zarr/caches/sharedChunkCache";
import { getDecodedChunkCacheBytes } from "../octree/poolBudget";

/**
 * The decoded-chunk budget, ONE for every scene in this window.
 *
 * It used to be per scene: each residency manager built a cache of the full
 * size (`getDecodedChunkCacheBytes`, up to 4 GiB), and up to four scene tabs
 * stay warm, so the window could pin four budgets. Now every scene shares one
 * cache of that size, and the planner gives each VISIBLE scene an equal share
 * of it to plan against (`decodeCacheBytesPerScene`). A hidden scene plans
 * nothing and reads nothing, so the LRU evicts its chunks first; it takes its
 * share back when it is shown again, and the others replan to make room.
 *
 * One scene on screen plans against the whole budget, exactly as before.
 */
let cache: SharedChunkCache | undefined;

/** The shared cache, sized at first use (the size is frozen per session, P24). */
export const sceneChunkCache = (): SharedChunkCache => (cache ??= new SharedChunkCache(getDecodedChunkCacheBytes()));

const visibleScenes = new Set<object>();
const listeners = new Set<() => void>();

const notify = () => {
  for (const listener of listeners) listener();
};

/** Whether `scene` is on screen. A new scene counts as visible until told otherwise. */
export function setSceneVisible(scene: object, visible: boolean): void {
  const changed = visible ? !visibleScenes.has(scene) : visibleScenes.has(scene);
  if (!changed) return;
  if (visible) visibleScenes.add(scene);
  else visibleScenes.delete(scene);
  notify();
}

/** `scene` closed: it no longer takes a share. */
export function forgetScene(scene: object): void {
  if (visibleScenes.delete(scene)) notify();
}

/**
 * What one scene's plans may spend: the budget split evenly between the
 * scenes on screen. The planner splits it again between the scene's pools
 * (`resolveDecodeCacheShareBytes`).
 */
export function decodeCacheBytesPerScene(): number {
  return getDecodedChunkCacheBytes() / Math.max(1, visibleScenes.size);
}

/** Called whenever the per-scene share changes; returns the unsubscribe. */
export function onDecodeShareChange(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Test seam. */
export function resetSceneDecodeBudgetForTests(): void {
  cache = undefined;
  visibleScenes.clear();
  listeners.clear();
}
