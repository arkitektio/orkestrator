/**
 * Placement PREVIEW: draw some layers with a world-space delta applied on top
 * of their server placement, for the length of a session and no longer.
 *
 * The scene knows nothing about WHY a host wants this (an interactive
 * registration, today). What it guarantees is the rule in
 * COORDINATE_SYSTEMS.md §1 R1a:
 *
 *  - `asAffine` stays the only placement authority. A preview is that same
 *    placement LEFT-MULTIPLIED by a world delta — `D · asAffine`, in named
 *    axes — never a second way of deriving where a layer sits, and never a
 *    walk of `pathToWorld`.
 *  - It rewrites the STORED layer's `asAffine`, which is what every placement
 *    route already reduces (`composeLayerAffine`, `collectionPlacement`,
 *    `annotationBounds`, points, tracks). So images, meshes, networks, points,
 *    tracks and annotations all follow with no per-feature code, and the
 *    planner / culling / probe / ray uniforms see an ordinary placement.
 *  - The server original is kept in `bases`, so a preview is always computed
 *    from the TRUTH and never from the previous preview (no drift), and
 *    clearing restores it exactly.
 *  - It is session-only and never persisted. `syncSceneLayers` keeps a stored
 *    layer while its structure key (edge id + version) is unchanged — the
 *    preview survives unrelated refetches — and re-derives it from the server
 *    when the key moves, which is precisely when a saved registration lands:
 *    the preview drops in the same `set` the new placement arrives in.
 *
 * Pure and generic (the `layerReconcile.ts` discipline): generated GraphQL is
 * never imported, so the suite runs in `node`.
 */
import {
  isIdentityDelta,
  leftMultiplyWorldDelta,
  type SpatialTriple,
} from "@/mikro-next/lib/coords/namedAffine";

export type PreviewPlacement = {
  matrix: readonly (readonly number[])[];
  inputAxes: readonly string[];
  outputAxes: readonly string[];
  total?: boolean;
};

type Placed = { id: string; asAffine?: PreviewPlacement | null };

export type PlacementPreviewArgs<Raw extends Placed, S extends Placed> = {
  sceneLayers: readonly Raw[];
  layers: readonly S[];
  /** Server placements of the layers currently previewed, by layer id. */
  bases: Readonly<Record<string, PreviewPlacement>>;
  /** The layers to preview. Anything previewed before and absent here is restored. */
  layerIds: readonly string[];
  /** Row-major 4×4 in world [x, y, z] slots. Null or identity = clear. */
  worldDelta: readonly (readonly number[])[] | null;
  worldSpatial: SpatialTriple;
  /**
   * The [x, y, z] names on a layer's DATA side — only consulted when the delta
   * moves along a world axis the placement does not constrain (a partial
   * registration tilted out of its plane).
   */
  dataSpatialOf: (layer: Raw) => SpatialTriple;
  /** Re-derive a normalized layer's world matrix for a new placement. */
  placeImage: (state: S, asAffine: PreviewPlacement) => S;
};

export type PlacementPreviewResult<Raw, S> = {
  sceneLayers: Raw[];
  layers: S[];
  bases: Record<string, PreviewPlacement>;
  changed: boolean;
  /** Layers the delta could not be applied to, and why. They keep their base. */
  failures: { layerId: string; reason: string }[];
};

export function applyPlacementPreview<Raw extends Placed, S extends Placed>(
  args: PlacementPreviewArgs<Raw, S>,
): PlacementPreviewResult<Raw, S> {
  const clearing = args.worldDelta === null || isIdentityDelta(args.worldDelta);
  const targets = clearing ? new Set<string>() : new Set(args.layerIds);
  const bases: Record<string, PreviewPlacement> = { ...args.bases };
  const failures: { layerId: string; reason: string }[] = [];
  const placements = new Map<string, PreviewPlacement>();

  const sceneLayers = args.sceneLayers.map((layer) => {
    const base = bases[layer.id] ?? null;

    if (!targets.has(layer.id)) {
      if (!base) return layer;
      // Previewed before, not any more: back to the server's placement.
      delete bases[layer.id];
      placements.set(layer.id, base);
      return { ...layer, asAffine: base };
    }

    const truth = base ?? layer.asAffine ?? null;
    // An unplaceable layer has no placement to preview against, and giving it
    // one here would draw a layer the server says has no position.
    if (!truth) {
      failures.push({ layerId: layer.id, reason: "The layer is not placed in this scene." });
      return layer;
    }

    const result = leftMultiplyWorldDelta(
      { inputAxes: truth.inputAxes, outputAxes: truth.outputAxes, matrix: truth.matrix.map((row) => [...row]) },
      args.worldDelta!,
      { worldSpatial: args.worldSpatial, dataSpatial: args.dataSpatialOf(layer) },
    );
    if (!result.ok) {
      failures.push({ layerId: layer.id, reason: result.reason });
      if (!base) return layer;
      delete bases[layer.id];
      placements.set(layer.id, base);
      return { ...layer, asAffine: base };
    }

    bases[layer.id] = truth;
    const preview: PreviewPlacement = { ...truth, ...result.affine };
    placements.set(layer.id, preview);
    return { ...layer, asAffine: preview };
  });

  const layers = args.layers.map((state) => {
    const placement = placements.get(state.id);
    return placement ? args.placeImage(state, placement) : state;
  });

  return { sceneLayers, layers, bases, changed: placements.size > 0, failures };
}

/**
 * Forget the bases of layers the server has since re-placed or removed.
 *
 * Called from `syncSceneLayers` with the layers it re-derived: their stored
 * `asAffine` is the server's again, so a lingering base would make the next
 * preview compute from — and a later clear RESTORE — a placement that no
 * longer exists.
 */
export function prunePreviewBases(
  bases: Readonly<Record<string, PreviewPlacement>>,
  keptLayerIds: ReadonlySet<string>,
): Record<string, PreviewPlacement> | null {
  const ids = Object.keys(bases);
  if (ids.every((id) => keptLayerIds.has(id))) return null;
  const next: Record<string, PreviewPlacement> = {};
  for (const id of ids) if (keptLayerIds.has(id)) next[id] = bases[id];
  return next;
}
