/**
 * Healing selection entries against what the drawing layer actually knows.
 *
 * `useCreateSceneAnnotation` auto-selects a new annotation the moment the
 * server confirms it — but on a scene's FIRST annotation the server is also
 * minting the `AnnotationLayer` that draws it, so there is no layer to name
 * yet and the entry is written with `layerId: ""`. And an annotation can
 * change (renamed, moved in another client) or disappear (deleted elsewhere)
 * while it is selected — the poll sees it, the selection did not, and every
 * panel quoting the selection then shows stale values, or a ghost that can
 * never be deleted (its delete mutation rejects, so it is never dropped).
 *
 * The layer that draws an annotation holds the authoritative entry for it, so
 * it is the one that repairs AND prunes. Kept pure and free of generated
 * imports so its suite runs in `node`.
 */

/** The selection fields this module compares; the real type carries more. */
type SelectionLike = {
  id: string;
  layerId: string;
  name?: string | null;
  kind?: string;
  systemId?: string | null;
  vectors?: readonly (readonly number[])[];
};

const differs = (entry: SelectionLike, truth: SelectionLike): boolean =>
  truth.layerId !== entry.layerId ||
  truth.name !== entry.name ||
  truth.kind !== entry.kind ||
  truth.systemId !== entry.systemId ||
  // Vectors compare by REFERENCE: the placement pass keeps a row's array
  // identity while the row is unchanged (Apollo row identity → stable roi),
  // so a differing reference means the geometry actually moved.
  truth.vectors !== entry.vectors;

/**
 * The subset of `authoritative` that should replace what is currently
 * selected: entries whose drawing layer, name, kind, geometry or system now
 * disagree with the stored copy.
 *
 * Only ever returns entries that are ALREADY selected — repairing must never
 * change WHAT is selected, only what is known about it. Empty when there is
 * nothing to fix, so the caller can skip the store write entirely (this runs
 * on every annotation poll).
 */
export function repairedSelections<A extends SelectionLike, S extends SelectionLike>(
  selected: readonly S[],
  authoritative: readonly A[],
): A[] {
  if (selected.length === 0 || authoritative.length === 0) return [];

  const byId = new Map(authoritative.map((entry) => [entry.id, entry]));
  return selected.flatMap((entry) => {
    const truth = byId.get(entry.id);
    return truth && differs(entry, truth) ? [truth] : [];
  });
}

/**
 * Selected ids this layer OWNS (`layerId` matches) that its query no longer
 * returns: the annotation was deleted elsewhere. Pruning them is what keeps a
 * ghost from staying selected forever (its own delete would reject and the
 * rejection path deliberately keeps failed entries selected).
 */
export function prunedSelections<S extends SelectionLike>(
  selected: readonly S[],
  layerId: string,
  presentIds: ReadonlySet<string>,
): string[] {
  if (selected.length === 0) return [];
  return selected
    .filter((entry) => entry.layerId === layerId && !presentIds.has(entry.id))
    .map((entry) => entry.id);
}
