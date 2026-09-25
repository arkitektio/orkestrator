import { createStore } from "zustand/vanilla";
import { createScopedStoreHooks } from "@/core/lib/generic/createScopedStore";
import type { CoordinateSystemLike } from "../coords/timeAxis";
import type { LayerState, PersistedLayer } from "../model/layerModel";
import { rawLayerOf, type ExperimentLayerFragment, type LayerFragments } from "./layerFragments";
import {
  addPatch,
  foldPatches,
  overlay,
  rollbackPatch,
  type LayerPatches,
} from "./layerPatch";

/**
 * The experiment as the renderer sees it: its world, its normalized layers, and
 * the origin the GPU works relative to.
 *
 * Two lists, as in mikro's `sceneStore`, and they are not interchangeable:
 *  - `layers` — NORMALIZED (`LayerState`): placement resolved, pyramid built,
 *    pending edits laid over. What the layer components and the panel read.
 *  - `rawLayers` — the fragments as they arrived, by id. What a
 *    `source: "fragment"` card reads (an annotation layer is drawn straight from
 *    its collection; a picker editor needs the whole picker list).
 *
 * Edits are OPTIMISTIC (`layerPatch.ts`): `patchLayer` lays the edit over the
 * server's layer at once and hands back a rollback for the caller to run if the
 * mutation fails; a refetch folds away whatever the server now agrees with.
 * Visibility is one of those edits — it is persisted now, not a session toggle.
 */

export type ExperimentStoreState = {
  experimentId: string;
  world: CoordinateSystemLike | null;
  /** Whether marks can be drawn on this scene (only a real experiment can be). */
  annotatable: boolean;
  /** Normalized, pending edits applied, display order. */
  layers: LayerState[];
  /** Normalized as the server last sent them. */
  serverLayers: LayerState[];
  /** Pending optimistic edits, by layer id. */
  patches: LayerPatches;
  /** Raw layer fragments, by id — narrow with `rawLayerOf` / `useRawLayer`. */
  rawLayers: Record<string, ExperimentLayerFragment>;
  /** `layers` by id: O(1) for the per-layer hooks, rebuilt with `layers`. */
  layerIndex: Map<string, LayerState>;
  /** Subtracted from every world time before a float32 cast. Fixed per scope. */
  timeOrigin: number;
  /**
   * Union of every placed layer's extent: what folding the fragment knows
   * (traces, spike rasters) plus what layers REPORT once they have read
   * (an event table's first and last time).
   */
  worldSpan: { start: number; end: number } | null;
  /** The fold's own part of `worldSpan`. */
  foldedSpan: { start: number; end: number } | null;
  /** Extents layers reported after reading, by layer id. */
  reportedSpans: Record<string, { start: number; end: number }>;
  /** A layer's extent, known only after its read (events). Null withdraws it. */
  reportSpan: (layerId: string, span: { start: number; end: number } | null) => void;
  /** Finest sample period across placed layers — the smallest sensible window. */
  finestPeriod: number;

  syncLayers: (
    layers: LayerState[],
    rawLayers: Record<string, ExperimentLayerFragment>,
    worldSpan: { start: number; end: number } | null,
  ) => { addedIds: string[]; removedIds: string[] };
  /** Lay an edit over a layer now; returns the rollback for a failed write. */
  patchLayer: (id: string, patch: Partial<PersistedLayer>) => () => void;
};

/** Whether a layer is hidden right now (its persisted flag, pending edits applied). */
export const isLayerHidden = (layer: Pick<LayerState, "visible">): boolean => !layer.visible;

type Span = { start: number; end: number };

const unionSpan = (folded: Span | null, reported: Record<string, Span>): Span | null => {
  let start = folded?.start ?? Infinity;
  let end = folded?.end ?? -Infinity;
  for (const span of Object.values(reported)) {
    if (span.start < start) start = span.start;
    if (span.end > end) end = span.end;
  }
  return end > start ? { start, end } : null;
};

const indexOf = (layers: readonly LayerState[]) => new Map(layers.map((l) => [l.id, l]));

/** `layers` and its index, always written together. */
const withIndex = (layers: LayerState[]) => ({ layers, layerIndex: indexOf(layers) });

const finestPeriodOf = (layers: readonly LayerState[]): number => {
  let finest = Infinity;
  for (const layer of layers) {
    const p = layer.source?.levels[0]?.period;
    if (p && Math.abs(p) < finest) finest = Math.abs(p);
  }
  return Number.isFinite(finest) ? finest : 0;
};

export const createExperimentStore = (initial: {
  experimentId: string;
  world: CoordinateSystemLike | null;
  annotatable: boolean;
  layers: LayerState[];
  rawLayers: Record<string, ExperimentLayerFragment>;
  timeOrigin: number;
  worldSpan: { start: number; end: number } | null;
}) =>
  createStore<ExperimentStoreState>((set, get) => ({
    ...initial,
    layerIndex: indexOf(initial.layers),
    foldedSpan: initial.worldSpan,
    reportedSpans: {},
    serverLayers: initial.layers,
    patches: {},
    finestPeriod: finestPeriodOf(initial.layers),

    syncLayers: (serverLayers, rawLayers, worldSpan) => {
      const before = new Set(get().serverLayers.map((l) => l.id));
      const after = new Set(serverLayers.map((l) => l.id));
      const addedIds = [...after].filter((id) => !before.has(id));
      const removedIds = [...before].filter((id) => !after.has(id));

      // A refetch settles whatever it agrees with; the rest stays pending.
      const patches = foldPatches(get().patches, serverLayers);
      // A removed layer's reported extent goes with it.
      const reportedSpans = { ...get().reportedSpans };
      for (const id of removedIds) delete reportedSpans[id];

      // `timeOrigin` deliberately does NOT move: GPU-resident buffers were packed
      // relative to it, and a layer arriving mid-session must not force a repack
      // of every other layer. A new layer simply lands at a (small) offset from it.
      set({
        serverLayers,
        patches,
        ...withIndex(overlay(serverLayers, patches)),
        rawLayers,
        foldedSpan: worldSpan,
        reportedSpans,
        worldSpan: unionSpan(worldSpan, reportedSpans),
        finestPeriod: finestPeriodOf(serverLayers),
      });
      return { addedIds, removedIds };
    },

    reportSpan: (layerId, span) => {
      const current = get().reportedSpans[layerId];
      if (span && current && current.start === span.start && current.end === span.end) return;
      if (!span && !current) return;
      const reportedSpans = { ...get().reportedSpans };
      if (span) reportedSpans[layerId] = span;
      else delete reportedSpans[layerId];
      set({ reportedSpans, worldSpan: unionSpan(get().foldedSpan, reportedSpans) });
    },

    patchLayer: (id, patch) => {
      const { patches, previous } = addPatch(get().patches, id, patch);
      set({ patches, ...withIndex(overlay(get().serverLayers, patches)) });
      return () => {
        const rolledBack = rollbackPatch(get().patches, id, previous);
        set({ patches: rolledBack, ...withIndex(overlay(get().serverLayers, rolledBack)) });
      };
    },
  }));

export type ExperimentStoreApi = ReturnType<typeof createExperimentStore>;

const hooks = createScopedStoreHooks<ExperimentStoreState, ExperimentStoreApi>(
  "ExperimentStore",
);
export const ExperimentStoreContext = hooks.StoreContext;
export const useExperimentStore = hooks.useScopedStore;
export const useExperimentStoreApi = hooks.useStoreApi;

/** One layer's normalized state, by id — O(1), stable until a fold or an edit touches it. */
export const useLayerState = (layerId: string): LayerState | undefined =>
  useExperimentStore((s) => s.layerIndex.get(layerId));

/** One layer's raw fragment, narrowed to its kind (undefined for another kind). */
export const useRawLayer = <K extends keyof LayerFragments>(
  layerId: string,
  typename: K,
): LayerFragments[K] | undefined => useExperimentStore((s) => rawLayerOf(s.rawLayers, layerId, typename));

export type { ExperimentLayerFragment, LayerFragments } from "./layerFragments";

/**
 * The scalar key standing for "which layers are drawn".
 *
 * Mirrors mikro `LayerRenderer`'s `dispatchKey`: subscribe to THIS string, then
 * read the array through `getState()` in a memo keyed on it. Subscribing to the
 * `layers` array itself would re-render the dispatcher on every sync, even one
 * that changed nothing it draws.
 */
export const drawnLayersKey = (state: ExperimentStoreState): string =>
  state.layers
    .filter((l) => !isLayerHidden(l))
    .map((l) => `${l.id}:${l.kind}:${l.placeability.drawable ? 1 : 0}`)
    .join("|");
