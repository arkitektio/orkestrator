/**
 * The id-keyed layer diff behind `sceneStore.syncSceneLayers`.
 *
 * A scene's layer set is DYNAMIC: the server mints an `AnnotationLayer` the
 * first time anyone annotates a scene, layers are added and deleted from the
 * layer panel, and a registration refinement rewrites a layer's placement path
 * in place. None of that may tear the store scope down — the canvas, the
 * WebGPU renderer and every brick atlas have to survive it (see
 * `SceneProvider`'s rebuild contract).
 *
 * The whole point is **identity preservation**: a layer that did not
 * structurally change keeps its exact stored object, so
 * - session-only state on it survives (`fixedLOD`, `defaultVolumeLOD`, local
 *   `visible` edits, `MeshLayerSessionState`), and
 * - the layer-keyed caches downstream stay warm — `nodePlanTracker` compares
 *   `cached.layer === layer`, and `brickResidency` keys its derivation cache
 *   the same way. Re-deriving an untouched layer would replan and repack it
 *   for nothing.
 *
 * The two change flags are separate on purpose. Appending an `AnnotationLayer`
 * — the case this module exists for — publishes a new `sceneLayers` array and
 * leaves `layers` (the normalized image layers) untouched: no replan, no
 * visibility recompute, one `LayerRenderer` render that mounts the new
 * annotation renderer.
 *
 * Generated GraphQL is imported for TYPES only (the callers inject
 * `normalizeLayer` and `planDefaultVolumeLods`, which carry value imports), so
 * this module's suite runs in `node` — the `sceneStructure.ts` discipline.
 */

export type LayerReconcileArgs<
  Raw extends { id: string },
  Img extends Raw,
  S extends { id: string },
> = {
  /** The polymorphic layers currently in the store. */
  previousSceneLayers: readonly Raw[];
  /** The normalized image layers currently in the store. */
  previousLayers: readonly S[];
  /** The fragment's layers, in server order — the target state. */
  nextLayers: readonly Raw[];
  isImage: (layer: Raw) => layer is Img;
  /** `layerStructureKey` — decides keep-as-is vs re-derive. */
  structureKey: (layer: Raw) => string;
  /**
   * The GLOBAL default-LOD budget split. Called with the FULL next image set
   * (never just the newcomers), but its answer is applied only where no
   * previous state survives — see `reconcileSceneLayers`.
   */
  planDefaultLods: (images: readonly Img[]) => Map<string, number>;
  normalize: (layer: Img, defaultVolumeLod: number | null) => S;
  /**
   * Carry session-only fields from a surviving normalized state onto its
   * freshly derived replacement. MUST return a NEW object — the stored one is
   * very likely immer-frozen from an earlier `updateLayer`.
   */
  carryImageSession: (previous: S, next: S) => S;
  /** The same, for a polymorphic layer's `MeshLayerSessionState`. */
  carryRawSession: (previous: Raw, next: Raw) => Raw;
};

export type LayerReconcileResult<Raw, S> = {
  sceneLayers: Raw[];
  layers: S[];
  /** The polymorphic set/order/element identity moved. */
  sceneLayersChanged: boolean;
  /** The normalized image set/order/element identity moved. */
  layersChanged: boolean;
  addedLayerIds: string[];
  removedLayerIds: string[];
};

/** Element-wise identity comparison — the only equality this module trusts. */
const sameElements = <T>(a: readonly T[], b: readonly T[]): boolean =>
  a.length === b.length && a.every((item, index) => item === b[index]);

export function reconcileSceneLayers<
  Raw extends { id: string },
  Img extends Raw,
  S extends { id: string },
>(args: LayerReconcileArgs<Raw, Img, S>): LayerReconcileResult<Raw, S> {
  const {
    previousSceneLayers,
    previousLayers,
    nextLayers,
    isImage,
    structureKey,
    planDefaultLods,
    normalize,
    carryImageSession,
    carryRawSession,
  } = args;

  const previousRawById = new Map(
    previousSceneLayers.map((layer) => [layer.id, layer]),
  );
  const previousRawKeyById = new Map(
    previousSceneLayers.map((layer) => [layer.id, structureKey(layer)]),
  );
  const previousStateById = new Map(
    previousLayers.map((layer) => [layer.id, layer]),
  );

  const nextImages = nextLayers.filter(isImage);
  // Over the FULL next image set: a newcomer budgeted as if the scene were
  // empty would claim the whole device budget.
  const plannedLods = planDefaultLods(nextImages);

  const sceneLayers: Raw[] = [];
  const layers: S[] = [];
  const addedLayerIds: string[] = [];

  for (const next of nextLayers) {
    const previousRaw = previousRawById.get(next.id);
    const unchanged =
      previousRaw !== undefined &&
      previousRawKeyById.get(next.id) === structureKey(next);

    if (previousRaw === undefined) addedLayerIds.push(next.id);

    // --- polymorphic list -------------------------------------------------
    sceneLayers.push(
      unchanged
        ? previousRaw
        : previousRaw
          ? carryRawSession(previousRaw, next)
          : next,
    );

    // --- normalized image list -------------------------------------------
    if (!isImage(next)) continue;

    const previousState = previousStateById.get(next.id);
    if (unchanged && previousState) {
      layers.push(previousState);
      continue;
    }

    if (previousState) {
      // Structurally moved: re-derive, but the layer is the SAME layer — its
      // default LOD and every session-only field come along. Re-running the
      // global budget over a survivor would reset the LOD of every layer in
      // the scene on every annotation.
      const derived = normalize(
        next,
        (previousState as { defaultVolumeLOD?: number | null })
          .defaultVolumeLOD ?? null,
      );
      layers.push(carryImageSession(previousState, derived));
      continue;
    }

    layers.push(normalize(next, plannedLods.get(next.id) ?? null));
  }

  const nextIds = new Set(nextLayers.map((layer) => layer.id));
  const removedLayerIds = previousSceneLayers
    .filter((layer) => !nextIds.has(layer.id))
    .map((layer) => layer.id);

  return {
    sceneLayers,
    layers,
    sceneLayersChanged: !sameElements(previousSceneLayers, sceneLayers),
    layersChanged: !sameElements(previousLayers, layers),
    addedLayerIds,
    removedLayerIds,
  };
}
