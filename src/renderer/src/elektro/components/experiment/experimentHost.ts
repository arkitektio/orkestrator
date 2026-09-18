import { useCallback, useMemo } from "react";
import { timeAxis } from "./platform/coords/timeAxis";
import { useLayerWrite } from "./platform/edits/useLayerWrite";
import {
  isLayerHidden,
  useExperimentStore,
  useExperimentStoreApi,
} from "./platform/stores/experimentStore";
import {
  useRangeStore,
  useRangeStoreApi,
  type TimeWindow,
} from "./platform/stores/rangeStore";
import {
  useViewerStore,
  useViewerStoreApi,
  type InteractionMode,
} from "./platform/stores/viewerStore";

export { ExperimentGuard as ExperimentHostGuard } from "./platform/stores/experimentScope";

/**
 * The experiment's HOST API — what a workflow composed over the timeline may DO
 * and KNOW.
 *
 * Mirrors mikro's `sceneHost.ts`: every hook returns PLAIN DATA (arrays, tuples,
 * strings, numbers) — never a store, a fragment, or a three.js object — so a host
 * can be written, tested and reasoned about without knowing how the renderer is
 * built. A workflow with its own lifecycle (an "align this run by eye" page, say)
 * lives OUTSIDE `experiment/`, on its own page, and talks to the renderer only
 * through this file.
 *
 * Every hook must be used under `ExperimentHostGuard`.
 */

export type HostLayer = {
  id: string;
  kind: "trace" | "spikes" | "events" | "annotation";
  label: string;
  color: string;
  valueUnit: string | null;
  hidden: boolean;
  drawable: boolean;
  /** World-time extent, or null when the layer is not placed. */
  span: TimeWindow | null;
  /** How many pyramid levels the layer has. 0 for everything but traces. */
  levelCount: number;
};

/** Every layer, in display order, as plain data. */
export const useExperimentHostLayers = (): HostLayer[] => {
  const layers = useExperimentStore((s) => s.layers);
  return useMemo(
    () =>
      layers.map((l) => ({
        id: l.id,
        kind: l.kind,
        label: l.label,
        color: l.color,
        valueUnit: l.valueUnit,
        hidden: isLayerHidden(l),
        drawable: l.placeability.drawable,
        span: l.span,
        levelCount: l.source?.levels.length ?? 0,
      })),
    [layers],
  );
};

/** The timeline's world: its identity, time axis and unit. */
export const useExperimentWorld = (): {
  id: string | null;
  name: string | null;
  timeAxis: string | null;
  unit: string | null;
  span: TimeWindow | null;
} => {
  const world = useExperimentStore((s) => s.world) as
    | { id?: string; name?: string; axes?: { name: string; type?: string | null; unit?: string | null }[] }
    | null;
  const span = useExperimentStore((s) => s.worldSpan);
  const axis = timeAxis(world);
  return {
    id: world?.id ?? null,
    name: world?.name ?? null,
    timeAxis: axis?.name ?? null,
    unit: axis?.unit ?? null,
    span,
  };
};

/**
 * The committed window and a setter. UI cadence only — this is the settled window,
 * so a host re-renders once per gesture, not per pointer move. Setting it is a
 * deliberate jump and goes into the zoom history.
 */
export const useExperimentTimeRange = (): [TimeWindow, (w: TimeWindow) => void] => {
  const range = useRangeStore((s) => s.committedRange);
  const api = useRangeStoreApi();
  const set = useCallback((w: TimeWindow) => api.getState().jumpTo(w), [api]);
  return [range, set];
};

/** Call-time read of the LIVE window, with no subscription — for handlers, not renders. */
export const useTimeRangeGetter = (): (() => TimeWindow) => {
  const api = useRangeStoreApi();
  return useCallback(() => api.getState().liveRange, [api]);
};

/**
 * Show or hide a layer. Persisted (`updateLayer(visible:)`) and optimistic: the
 * layer hides on the call, and comes back with a toast if the write fails.
 */
export const useLayerVisibility = (): {
  isHidden: (id: string) => boolean;
  setHidden: (id: string, hidden: boolean) => void;
} => {
  const api = useExperimentStoreApi();
  const write = useLayerWrite();
  return useMemo(
    () => ({
      isHidden: (id: string) => {
        const layer = api.getState().layers.find((l) => l.id === id);
        return layer ? isLayerHidden(layer) : false;
      },
      setHidden: (id: string, hidden: boolean) => void write(id, { visible: !hidden }),
    }),
    [api, write],
  );
};

/** What a drag does, and a setter. */
export const useExperimentInteractionMode = (): [
  InteractionMode,
  (mode: InteractionMode) => void,
] => {
  const mode = useViewerStore((s) => s.interactionMode);
  const api = useViewerStoreApi();
  const set = useCallback((m: InteractionMode) => api.getState().setInteractionMode(m), [api]);
  return [mode, set];
};

/** The hovered world time, or null. UI cadence (one write per frame at most). */
export const useExperimentHoverTime = (): number | null =>
  useViewerStore((s) => s.hoverTime);
