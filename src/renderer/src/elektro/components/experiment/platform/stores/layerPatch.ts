import { withPersisted, type LayerState, type PersistedLayer } from "../model/layerModel";

/**
 * The optimistic overlay for layer edits — mikro's `useOptimisticLayerPatch`,
 * as pure functions over the store's state.
 *
 * An edit (toggle, recolour, reorder, rescale) lands in `patches` at once and
 * the layer is drawn from `server ⊕ patch` while the mutation is in flight:
 *
 *  - **apply**   — `overlay(server, patches)`: every patched layer re-derived
 *    through `withPersisted`, the list re-sorted by (order, id) because `order`
 *    is patchable. Content only: no structural key moves, so no tile refetches.
 *  - **fold**    — `foldPatches(patches, server)`: when a refetch arrives, a
 *    patched field the server now AGREES with is dropped; one it does not agree
 *    with yet (the refetch raced the write) stays until it does or rolls back.
 *  - **rollback** — `rollbackPatch(patches, id, previous)`: a failed write puts
 *    back exactly what that one write replaced, leaving later edits alone.
 *
 * Pure — runs in node.
 */

export type LayerPatches = Record<string, Partial<PersistedLayer>>;

const sameValue = (a: unknown, b: unknown): boolean => {
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((v, i) => v === b[i]);
  }
  return a === b;
};

const byOrder = (a: LayerState, b: LayerState) =>
  a.order - b.order || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

/** The layers as drawn: the server's, with every pending edit laid over. */
export const overlay = (server: readonly LayerState[], patches: LayerPatches): LayerState[] => {
  if (Object.keys(patches).length === 0) return [...server];
  const patched = server.map((layer) => {
    const patch = patches[layer.id];
    return patch ? withPersisted(layer, patch) : layer;
  });
  return patched.sort(byOrder);
};

/** Drop what the server now agrees with, and patches for layers that are gone. */
export const foldPatches = (patches: LayerPatches, server: readonly LayerState[]): LayerPatches => {
  const byId = new Map(server.map((l) => [l.id, l]));
  const out: LayerPatches = {};
  for (const [id, patch] of Object.entries(patches)) {
    const layer = byId.get(id);
    if (!layer) continue;
    const pending: Partial<PersistedLayer> = {};
    for (const [field, value] of Object.entries(patch) as [keyof PersistedLayer, unknown][]) {
      if (!sameValue(layer.persisted[field], value)) {
        (pending as Record<string, unknown>)[field] = value;
      }
    }
    if (Object.keys(pending).length > 0) out[id] = pending;
  }
  return out;
};

/**
 * Lay a patch over any pending one. Returns the new patches and what the
 * patched fields held before, which is what a rollback restores.
 */
export const addPatch = (
  patches: LayerPatches,
  id: string,
  patch: Partial<PersistedLayer>,
): { patches: LayerPatches; previous: Partial<Record<keyof PersistedLayer, unknown>> } => {
  const current = patches[id] ?? {};
  const previous: Partial<Record<keyof PersistedLayer, unknown>> = {};
  for (const field of Object.keys(patch) as (keyof PersistedLayer)[]) {
    previous[field] = field in current ? current[field] : NOT_PATCHED;
  }
  return { patches: { ...patches, [id]: { ...current, ...patch } }, previous };
};

/** Marks a field that had no pending patch before an edit. */
export const NOT_PATCHED = Symbol("not-patched");

/** Undo one failed write: restore exactly the fields it replaced. */
export const rollbackPatch = (
  patches: LayerPatches,
  id: string,
  previous: Partial<Record<keyof PersistedLayer, unknown>>,
): LayerPatches => {
  const current = { ...(patches[id] ?? {}) } as Record<string, unknown>;
  for (const [field, value] of Object.entries(previous)) {
    if (value === NOT_PATCHED) delete current[field];
    else current[field] = value;
  }
  const out = { ...patches };
  if (Object.keys(current).length === 0) delete out[id];
  else out[id] = current as Partial<PersistedLayer>;
  return out;
};
