/**
 * What an experiment IS, structurally — the two signatures its provider keys on.
 *
 * Transposed from mikro's `platform/model/sceneStructure.ts`, with the same
 * three-tier contract:
 *
 *  1. **Rebuild** on `experimentScopeSignature` — the experiment's identity and its
 *     world. A different world is a different timeline, and nothing built against
 *     the old one is reusable.
 *  2. **Reconcile** on `experimentLayerSignature` — the set of layers, what each
 *     reads, and each one's path to the world. A layer arriving, leaving, being
 *     re-placed or re-pointed at other data folds into the live stores WITHOUT a
 *     rebuild.
 *  3. **Ignore** everything else. `visible`, `name`, `order`, `opacity`, colour,
 *     clim, pickers are content, folded at their call sites — which is what makes
 *     an optimistic edit free: it never moves a signature, so no tile refetches.
 *
 * The load-bearing consequence, enforced by the provider: the scope's `phase` is
 * computed from the SCOPE signature alone. `createAnnotation(experiment:)` mints
 * an annotation collection AND a layer on first draw — if a layer change could
 * push the phase back to "initializing", drawing the first annotation would
 * unmount the `<Canvas>` and throw away the GPU state.
 *
 * No generated imports, so this runs in node.
 */

export type PlacementStepLike = {
  inverted?: boolean | null;
  transformation?: { id?: string | null; version?: number | null } | null;
};

export type LayerStructureLike = {
  __typename?: string;
  id: string;
  order?: number | null;
  pathToWorld?: readonly PlacementStepLike[] | null;
  /** A session-chosen coordinate for a CONDITIONAL placement. */
  at?: readonly { name: string; value: number }[] | null;
  // What the layer reads — one of these, per kind. Re-pointing a layer at other
  // data (`updateTraceLayer(lens:)`, `updateSpikesLayer(sparseDataset:)`) is a
  // structural change: everything resident was read from the old source.
  lens?: { id: string } | null;
  sparseDataset?: { id: string } | null;
  tableDataset?: { id: string } | null;
  annotationCollection?: { id: string } | null;
  /** Which channel a trace reads: a different one is a different read. */
  channelIndex?: number | null;
};

export type ExperimentScopeLike = {
  id: string;
  world?: { id: string } | null;
};

export type ExperimentStructureLike = ExperimentScopeLike & {
  layers?: readonly LayerStructureLike[] | null;
};

export const experimentScopeSignature = (e: ExperimentScopeLike): string =>
  JSON.stringify({ id: e.id, world: e.world?.id ?? null });

/** Which data a layer reads, whatever its kind. */
export const layerSourceId = (l: LayerStructureLike): string | null =>
  l.lens?.id ?? l.sparseDataset?.id ?? l.tableDataset?.id ?? l.annotationCollection?.id ?? null;

/**
 * One layer's structural identity: which layer, of what kind, reading what, and
 * reached by which path.
 *
 * The path is keyed by edge id AND version, so editing an edge in place (a
 * re-placement: `updateTransformation` on a clock→world edge) moves the key even
 * though the edge id is unchanged. `at` is included because a different
 * CONDITIONAL coordinate is a different path.
 */
export const layerStructureKey = (l: LayerStructureLike): string =>
  JSON.stringify({
    id: l.id,
    kind: l.__typename ?? null,
    source: layerSourceId(l),
    channel: l.channelIndex ?? null,
    at: l.at ?? null,
    path:
      l.pathToWorld?.map((step) => [
        step.transformation?.id ?? null,
        step.transformation?.version ?? null,
        step.inverted ?? false,
      ]) ?? null,
  });

/** Kind rank — the tie-break of the structural sort, never of display. */
export const LAYER_KIND_RANK: Record<string, number> = {
  TraceLayer: 0,
  SpikesLayer: 1,
  EventsLayer: 2,
  AnnotationLayer: 3,
};

const byId = (a: { id: string }, b: { id: string }) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

/**
 * Display order: the layers' own `order`, then id — so server-side array order,
 * which nothing promises to keep stable, never reorders the stack.
 */
export const orderedLayers = <L extends LayerStructureLike>(
  layers: readonly L[] | null | undefined,
): L[] => [...(layers ?? [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || byId(a, b));

/**
 * Sorted by (kind, id) ONLY — not by `order`. Reordering layers is content, and
 * must not move the structural signature; `orderedLayers` is for display.
 */
export const experimentLayerSignature = (e: ExperimentStructureLike): string =>
  JSON.stringify(
    [...(e.layers ?? [])]
      .sort(
        (a, b) =>
          (LAYER_KIND_RANK[a.__typename ?? ""] ?? 9) - (LAYER_KIND_RANK[b.__typename ?? ""] ?? 9) ||
          byId(a, b),
      )
      .map(layerStructureKey),
  );
