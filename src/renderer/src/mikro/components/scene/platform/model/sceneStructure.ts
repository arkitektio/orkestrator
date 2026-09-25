/**
 * The scene's two structural keys — the provider's REBUILD key and its
 * RECONCILE key. They exist because the two questions have different answers:
 *
 * - `sceneScopeSignature` — what a store scope IS: which scene, in which world
 *   frame. These cannot be absorbed in place. The world system is what
 *   `transformContext`, `spatialUnit`, every `composeLayerAffine` and
 *   `resolveSceneCameraFrame` hang off, so swapping it changes what a live
 *   camera pose MEANS; rebuilding is the honest answer.
 * - `sceneLayerSignature` — which layers, in which order, placed how. A change
 *   here is folded into the LIVE stores by `platform/model/layerReconcile.ts` while the
 *   canvas keeps rendering. Layers arriving dynamically (the AnnotationLayer
 *   the server mints on a scene's first annotation, and one day a subscription
 *   delivering layers) must never blank the viewport.
 *
 * Everything else the fragment carries — render graphs, opacity, visibility,
 * preferredView, animations, snapshots — is CONTENT: every mutation of it
 * already folds its result into the right store at the call site
 * (`updateLayer`, `setPreferredView`, `upsertAnimation`, ROI selection), so a
 * cache re-emission that only changes content must move NEITHER signature.
 * Apollo hands out a fresh `scene` object identity on ANY normalized write the
 * query selects, which is exactly why `SceneProvider` keys on these signatures
 * and never on identity — keying on identity reloaded the whole scene on
 * every contrast save.
 *
 * `(transformation.id, version)` detects registration refinements: the server
 * rewrites the edge in place and bumps `version` (selected by the
 * PlacementStep fragment for this purpose). That is a per-LAYER fact, so it
 * lives in the layer key and re-normalizes just that layer.
 *
 * Kept free of generated imports so its suite runs in `node` — the same
 * discipline as `transformGraph.ts`.
 */

/** What the scope signature reads: the scene's identity and its world frame. */
export type SceneScopeLike = {
  id: string;
  worldCoordinateSystem?: { id: string } | null;
};

/** What a layer's structural key reads: its identity and its placement path. */
export type LayerStructureLike = {
  id: string;
  pathToWorld?:
    | readonly {
        transformation?: { id?: string; version?: number | null } | null;
        inverted: boolean;
      }[]
    | null;
};

/** Structural subset of the `Scene` fragment the signatures read. */
export type SceneStructureLike = SceneScopeLike & {
  layers: readonly LayerStructureLike[];
};

/**
 * What the store scope is built around. Changing this must REMOUNT (the scope
 * is rebuilt and `SceneGuard` keys children on the scene id), not reconcile.
 */
export const sceneScopeSignature = (scene: SceneScopeLike): string =>
  JSON.stringify({
    id: scene.id,
    world: scene.worldCoordinateSystem?.id ?? null,
  });

/**
 * One layer's structural identity: who it is and where it sits. The reconcile
 * keeps a layer's stored object (and every session-only field on it) when this
 * is unchanged, and re-derives the layer when it moves.
 */
export const layerStructureKey = (layer: LayerStructureLike): string =>
  JSON.stringify({
    id: layer.id,
    path:
      layer.pathToWorld?.map((step) => [
        step.transformation?.id ?? null,
        step.transformation?.version ?? null,
        step.inverted,
      ]) ?? null,
  });

/**
 * The ordered layer set. Changing this schedules an in-place reconcile — it
 * must NEVER gate `SceneScopeStatus.phase`, or the viewport falls back to its
 * "Initializing scene data…" frame and the canvas unmounts anyway.
 */
export const sceneLayerSignature = (scene: {
  layers: readonly LayerStructureLike[];
}): string => JSON.stringify(scene.layers.map(layerStructureKey));
