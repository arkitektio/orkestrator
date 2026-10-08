import { createStore, type StoreApi } from "zustand/vanilla";
import { createScopedStoreHooks } from "@/core/util/createScopedStore";
import {
  addPatch,
  foldPatches,
  overlay,
  rollbackPatch,
  type LayerPatches,
  type WithPersisted,
} from "./layerPatch";

/**
 * A composition along one axis, as its renderer sees it: its normalized layers,
 * their extent, and the origin the GPU works relative to.
 *
 * The store behind elektro's experiment timeline and mikro's chart. What a layer
 * IS belongs to the module (`L`, its persisted fields `P`, its raw fragment
 * `Raw`, and whatever else the scope holds, `Extra`); this file owns only what
 * is the same for both.
 *
 * Two lists, as in mikro's `sceneStore`, and they are not interchangeable:
 *  - `layers` — NORMALIZED: placement resolved, source built, pending edits laid
 *    over. What the layer components and the panel read.
 *  - `rawLayers` — the fragments as they arrived, by id. What a card that edits
 *    the server's own shape reads.
 *
 * Edits are OPTIMISTIC (`layerPatch.ts`): `patchLayer` lays the edit over the
 * server's layer at once and hands back a rollback for the caller to run if the
 * mutation fails; a refetch folds away whatever the server now agrees with.
 */

export type Span = { start: number; end: number };

/** What the plot engine itself reads off a layer, whatever its kind. */
export type PlotLayerBase<P = unknown> = {
  id: string;
  /** The GraphQL typename: the key of the module's registries. */
  typename: string;
  /** A stable per-kind word, part of the drawn-layers key. */
  kind: string;
  order: number;
  visible: boolean;
  /** The resolved CSS colour the layer is drawn in. */
  color: string;
  placeability: { drawable: boolean };
  /** Extent along the axis of the data this layer shows. Null when not placed. */
  span: Span | null;
  persisted: P;
};

export type PlotStoreState<L extends PlotLayerBase<P>, P, Raw> = {
  /** Normalized, pending edits applied, display order. */
  layers: L[];
  /** Normalized as the server last sent them. */
  serverLayers: L[];
  /** Pending optimistic edits, by layer id. */
  patches: LayerPatches<P>;
  /** Raw layer fragments, by id. */
  rawLayers: Record<string, Raw>;
  /** `layers` by id: O(1) for the per-layer hooks, rebuilt with `layers`. */
  layerIndex: Map<string, L>;
  /**
   * Subtracted from every axis position before a float32 cast. Fixed per scope:
   * GPU-resident buffers were packed relative to it. (Named for the timeline it
   * was first built for; on a chart it is the origin along the chart's axis.)
   */
  timeOrigin: number;
  /**
   * Union of every placed layer's extent: what folding the fragment knows plus
   * what layers REPORT once they have read (a table's first and last position).
   */
  worldSpan: Span | null;
  /** The fold's own part of `worldSpan`. */
  foldedSpan: Span | null;
  /** Extents layers reported after reading, by layer id. */
  reportedSpans: Record<string, Span>;
  /** A layer's extent, known only after its read. Null withdraws it. */
  reportSpan: (layerId: string, span: Span | null) => void;
  /** Finest sample step across placed layers — the smallest sensible window. */
  finestPeriod: number;

  syncLayers: (
    layers: L[],
    rawLayers: Record<string, Raw>,
    worldSpan: Span | null,
  ) => { addedIds: string[]; removedIds: string[] };
  /** Lay an edit over a layer now; returns the rollback for a failed write. */
  patchLayer: (id: string, patch: Partial<P>) => () => void;
};

/** Whether a layer is hidden right now (its persisted flag, pending edits applied). */
export const isLayerHidden = (layer: { visible: boolean }): boolean => !layer.visible;

const unionSpan = (folded: Span | null, reported: Record<string, Span>): Span | null => {
  let start = folded?.start ?? Infinity;
  let end = folded?.end ?? -Infinity;
  for (const span of Object.values(reported)) {
    if (span.start < start) start = span.start;
    if (span.end > end) end = span.end;
  }
  return end > start ? { start, end } : null;
};

/**
 * The extent every placed layer covers together, and the origin the GPU works
 * relative to.
 *
 * `timeOrigin` is subtracted from every position BEFORE it is cast to float32.
 * A world anchored at a Unix epoch in seconds puts times near 1.8e9, where
 * float32's resolution is ~128 — every trace would collapse to a staircase.
 * Taking the origin at the data's own start keeps the float32 values small. It
 * is fixed per scope build and never moves mid-session, so nothing GPU-resident
 * needs rewriting when a layer arrives.
 */
export const worldExtentOf = (
  layers: readonly { span: Span | null }[],
): { span: Span | null; timeOrigin: number } => {
  let start = Infinity;
  let end = -Infinity;
  for (const layer of layers) {
    if (!layer.span) continue;
    if (layer.span.start < start) start = layer.span.start;
    if (layer.span.end > end) end = layer.span.end;
  }
  if (!(end > start)) return { span: null, timeOrigin: 0 };
  return { span: { start, end }, timeOrigin: start };
};

export type PlotStoreInitial<L, Raw, Extra> = Extra & {
  layers: L[];
  rawLayers: Record<string, Raw>;
  timeOrigin: number;
  worldSpan: Span | null;
};

export type PlotStoreDeps<L, P> = {
  /** The module's "this layer with these persisted fields replaced". */
  withPersisted: WithPersisted<L, P>;
  /** The finest sample step among these layers, or 0 when none has one. */
  finestPeriodOf: (layers: readonly L[]) => number;
};

export const createPlotStore = <L extends PlotLayerBase<P>, P, Raw, Extra extends object>(
  initial: PlotStoreInitial<L, Raw, Extra>,
  deps: PlotStoreDeps<L, P>,
): StoreApi<PlotStoreState<L, P, Raw> & Extra> => {
  const indexOf = (layers: readonly L[]) => new Map(layers.map((l) => [l.id, l]));
  /** `layers` and its index, always written together. */
  const withIndex = (layers: L[]) => ({ layers, layerIndex: indexOf(layers) });
  type State = PlotStoreState<L, P, Raw> & Extra;
  type Core = Partial<PlotStoreState<L, P, Raw>>;

  return createStore<State>((set, get) => {
    const write = (partial: Core) => set(partial as Partial<State>);
    const state: PlotStoreState<L, P, Raw> = {
      layers: initial.layers,
      rawLayers: initial.rawLayers,
      timeOrigin: initial.timeOrigin,
      worldSpan: initial.worldSpan,
      layerIndex: indexOf(initial.layers),
      foldedSpan: initial.worldSpan,
      reportedSpans: {},
      serverLayers: initial.layers,
      patches: {},
      finestPeriod: deps.finestPeriodOf(initial.layers),

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
        write({
          serverLayers,
          patches,
          ...withIndex(overlay(serverLayers, patches, deps.withPersisted)),
          rawLayers,
          foldedSpan: worldSpan,
          reportedSpans,
          worldSpan: unionSpan(worldSpan, reportedSpans),
          finestPeriod: deps.finestPeriodOf(serverLayers),
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
        write({ reportedSpans, worldSpan: unionSpan(get().foldedSpan, reportedSpans) });
      },

      patchLayer: (id, patch) => {
        const { patches, previous } = addPatch(get().patches, id, patch);
        write({ patches, ...withIndex(overlay(get().serverLayers, patches, deps.withPersisted)) });
        return () => {
          const rolledBack = rollbackPatch(get().patches, id, previous);
          write({
            patches: rolledBack,
            ...withIndex(overlay(get().serverLayers, rolledBack, deps.withPersisted)),
          });
        };
      },
    };
    // The module's own fields ride beside the engine's; `initial` carries both.
    return { ...initial, ...state } as State;
  });
};

/**
 * The plot store as the ENGINE reads it: layers by their base shape. Core
 * components (the camera, the axis, the overview strip, the layout manager) read
 * through these; a module reads its own typed view of the same store through
 * the hooks it derives with `plotStoreHooks`.
 */
export type AnyPlotLayer = PlotLayerBase<unknown>;
/** The READ side only: a module's typed store is assignable to it. */
export type AnyPlotStoreState = {
  layers: readonly AnyPlotLayer[];
  layerIndex: ReadonlyMap<string, AnyPlotLayer>;
  timeOrigin: number;
  worldSpan: Span | null;
  finestPeriod: number;
};

const hooks = createScopedStoreHooks<AnyPlotStoreState, StoreApi<AnyPlotStoreState>>("PlotStore");
export const PlotStoreContext = hooks.StoreContext;
export const usePlotStore = hooks.useScopedStore;
export const usePlotStoreApi = hooks.useStoreApi;

/**
 * A module's typed view of the ONE plot store context. Same store, same
 * context — the hook's type is what says whose layers these are.
 */
export const plotStoreHooks = <State extends object>() => ({
  StoreContext: PlotStoreContext as unknown as React.Context<StoreApi<State> | null>,
  useScopedStore: usePlotStore as unknown as {
    (): State;
    <T>(selector: (state: State) => T): T;
  },
  useStoreApi: usePlotStoreApi as unknown as () => StoreApi<State>,
});

/**
 * The scalar key standing for "which layers are drawn".
 *
 * Mirrors mikro `LayerRenderer`'s `dispatchKey`: subscribe to THIS string, then
 * read the array through `getState()` in a memo keyed on it. Subscribing to the
 * `layers` array itself would re-render the dispatcher on every sync, even one
 * that changed nothing it draws.
 */
export const drawnLayersKey = (state: { layers: readonly AnyPlotLayer[] }): string =>
  state.layers
    .filter((l) => !isLayerHidden(l))
    .map((l) => `${l.id}:${l.kind}:${l.placeability.drawable ? 1 : 0}`)
    .join("|");
