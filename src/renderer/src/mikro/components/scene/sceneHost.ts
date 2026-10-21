/**
 * The scene's HOST API — the second public entry, next to `Scene.tsx`.
 *
 * `Scene.tsx` is what a host RENDERS (provider, viewport, panels). This is what
 * a host workflow composed over the scene may DO and KNOW: list the layers and
 * how they are placed, preview a placement, pick a world point, read the
 * modes. Everything here must be called under a `Scene.Provider`.
 *
 * It exists so that a workflow with its own lifecycle — the interactive
 * registration workspace (`mikro/components/registration`) is the first —
 * lives OUTSIDE `scene/` and never imports `platform/`, `features/` or
 * `shell/`. The scene stays a renderer that draws what it is told; the
 * workflow owns its session, math and UI. Keep this file registration-
 * agnostic: if a name here only makes sense for one host, it belongs in that
 * host.
 *
 * Narrow on purpose. Every hook returns plain data (arrays, tuples, strings),
 * never a store, a fragment or a three.js object, so nothing behind it becomes
 * public by accident.
 */
import { useCallback, useEffect, useMemo, useRef } from "react";
import { computeSceneWorldBox } from "./platform/camera/sceneFit";
import { createRafCoalescer } from "@/core/data/scene/perf/rafCoalesce";
import { hostLayersKey, toHostLayers, type HostLayer } from "./platform/model/hostLayers";
import { useModeStore, useModeStoreApi, type DisplayMode, type InteractionMode } from "./platform/stores/modeStore";
import { useSceneStore, useSceneStoreApi, type SceneLayer } from "./platform/stores/sceneStore";
import { useViewerStoreApi } from "./platform/stores/viewerStore";
import { spatialAxisTriple } from "@/core/data/scene/coords/transformGraph";
import { useMikro } from "@/mikro/api/funcs";
import { useWatchSceneLayersSubscription } from "@/mikro/api/graphql";
import { useSceneEventsApi } from "./platform/events/sceneEvents";
import {
  drawnPayload,
  isPick,
  layersKey,
  layersPayload,
  pickPayload,
  probeLens,
  selectionPayload,
  type SceneAnnotationPayload,
  type SceneLayersPayload,
  type ScenePickPayload,
  type SceneSelectPayload,
} from "./platform/events/eventPayloads";
import { useRoiSelectionStoreApi } from "./features/annotations/roiSelectionStore";

export type { DisplayMode, InteractionMode };

/**
 * Renders children only once the scene's store scope is ready (and remounts
 * them per scene). Every hook below needs that scope, so a host panel living
 * in the page's sidebar — a SIBLING of the viewport, alive through every scope
 * phase — wraps itself in this.
 */
export { SceneGuard as SceneHostGuard } from "./platform/stores/sceneScope";
export type SceneHostLayer = HostLayer<SceneLayer["pathToWorld"]>;
export type HostBox = { min: [number, number, number]; max: [number, number, number] };
export type ScenePick = { layerId: string; world: [number, number, number] };

/**
 * The scene's layers as a host sees them. Re-renders only when something a
 * host can see moves (`hostLayersKey`) — not on contrast ticks, and not on the
 * placement-preview frames the host itself is producing.
 */
export const useSceneHostLayers = (): SceneHostLayer[] => {
  const api = useSceneStoreApi();
  const read = useCallback(() => {
    const { sceneLayers, layers } = api.getState();
    return toHostLayers(sceneLayers, new Map(layers.map((layer) => [layer.id, layer.visible])));
  }, [api]);
  const key = useSceneStore(() => hostLayersKey(read()));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(read, [read, key]);
};

/** The world every layer is placed in: its id, axes and [x, y, z] axis names. */
export const useSceneWorld = () => {
  const world = useSceneStore((state) => state.transformContext.worldCoordinateSystem);
  const unit = useSceneStore((state) => state.spatialUnit);
  return useMemo(
    () => ({
      id: world?.id ?? null,
      name: world?.name ?? null,
      axes: (world?.axes ?? []).map((axis) => axis.name),
      spatialTriple: spatialAxisTriple(world),
      unit,
    }),
    [world, unit],
  );
};

export type PlacementPreviewFailure = { layerId: string; reason: string };

/**
 * Draw layers with a world-space delta on top of their server placement
 * (`sceneStore.setPlacementPreview`, COORDINATE_SYSTEMS.md §1 R1a). Session-
 * only; `clear` on unmount is the caller's job — a host that leaves a preview
 * behind leaves the scene lying about where things are.
 */
export const usePlacementPreview = () => {
  const api = useSceneStoreApi();
  const handle = useMemo(() => {
    type Request = {
      layerIds: readonly string[];
      worldDelta: readonly (readonly number[])[] | null;
      onResult?: (failures: PlacementPreviewFailure[]) => void;
    };
    const coalescer = createRafCoalescer<Request>((latest) => {
      latest.onResult?.(api.getState().setPlacementPreview(latest.layerIds, latest.worldDelta).failures);
    });
    return {
      set: (layerIds: readonly string[], worldDelta: readonly (readonly number[])[] | null) =>
        api.getState().setPlacementPreview(layerIds, worldDelta),
      /**
       * The drag path: at most ONE store write per animation frame, always with
       * the latest delta. A preview write replans the affected layers — the
       * cost class of a camera move — so pointer-rate writes would replan
       * several times per frame for positions nobody ever sees.
       */
      schedule: (request: Request) => coalescer.schedule(request),
      clear: () => {
        coalescer.cancel();
        return api.getState().setPlacementPreview([], null);
      },
      cancelScheduled: () => coalescer.cancel(),
      /** Layers currently drawn with a preview. */
      previewedLayerIds: () => Object.keys(api.getState().placementPreviewBases),
    };
  }, [api]);
  // A frame scheduled by a host that has since unmounted must not land.
  useEffect(() => () => handle.cancelScheduled(), [handle]);
  return handle;
};

export const useSceneInteractionMode = (): [InteractionMode, (mode: InteractionMode) => void] => [
  useModeStore((state) => state.interactionMode),
  useModeStore((state) => state.setInteractionMode),
];

export const useSceneDisplayMode = (): DisplayMode => useModeStore((state) => state.displayMode);

/**
 * World-space box of some layers, read at CALL time (no subscription): the
 * caller asks when it needs a pivot or a fit, not every frame. Lens-backed
 * layers only — a collection's extent lives in parquet the client has not
 * necessarily read — so null means "no box known", not "empty".
 */
export const useLayerWorldBoxGetter = () => {
  const api = useSceneStoreApi();
  return useCallback(
    (layerIds: readonly string[]): HostBox | null => {
      const wanted = new Set(layerIds);
      const box = computeSceneWorldBox(api.getState().layers.filter((layer) => wanted.has(layer.id)));
      if (!box) return null;
      return { min: [box.min.x, box.min.y, box.min.z], max: [box.max.x, box.max.y, box.max.z] };
    },
    [api],
  );
};

/**
 * Session-only VISIBILITY of a layer — what a host toggles to compare layers
 * (blink, solo) without it ever reaching the server. Writes the list the layer
 * actually renders from: normalized for lens-backed layers, raw for the rest
 * (`cardRegistry.tsx` explains why that distinction is load-bearing).
 *
 * Visibility only, on purpose. Opacity is not one thing across layer kinds —
 * a label layer has `opacity`, an image layer's lives per channel in its
 * render graph — so a generic "fade this layer" would silently do nothing for
 * most of them.
 */
export const useLayerSessionVisibility = () => {
  const api = useSceneStoreApi();
  return useMemo(() => {
    const set = (layerId: string, visible: boolean) => {
      const state = api.getState();
      const normalized = state.layers.find((layer) => layer.id === layerId);
      if (normalized) state.updateLayer({ ...normalized, visible });
      else state.patchSceneLayer(layerId, { visible });
    };
    const get = (layerId: string): boolean | null => {
      const state = api.getState();
      const layer =
        state.layers.find((entry) => entry.id === layerId) ??
        state.sceneLayers.find((entry) => entry.id === layerId);
      return layer ? layer.visible !== false : null;
    };
    return { set, get };
  }, [api]);
};

/**
 * Pick world points by clicking ONE layer.
 *
 * Built entirely from what the scene already has: the probe pin
 * (`viewerStore.probeLayerId` — exactly one layer answers, the rest decline
 * without stopping propagation, `probeTargeting.ts`) and PROBE mode's click
 * probes. While `enabled`, the mode is PROBE and the pin is `layerId`; both
 * are restored afterwards. `worldPos` is the hit under whatever placement the
 * layer is DRAWN with, preview included.
 *
 * Known costs of riding the probe, accepted for now: the click also updates
 * the probe readout, and shift-click still saves a point annotation. Layers
 * that emit no probes (points, tracks, annotations) cannot be picked this way,
 * and `ModeCompatGuard` coerces PROBE away in a scene with no probeable layer
 * — `active` reports whether picking is actually live.
 */
export const useScenePick = (options: {
  enabled: boolean;
  layerId: string | null;
  onPick: (pick: ScenePick) => void;
}): { active: boolean } => {
  const { enabled, layerId } = options;
  const modeApi = useModeStoreApi();
  const viewerApi = useViewerStoreApi();
  const interactionMode = useModeStore((state) => state.interactionMode);
  const onPick = useRef(options.onPick);
  onPick.current = options.onPick;

  useEffect(() => {
    if (!enabled || !layerId) return;
    const previousMode = modeApi.getState().interactionMode;
    const previousPin = viewerApi.getState().probeLayerId;
    modeApi.getState().setInteractionMode("PROBE");
    viewerApi.getState().setProbeLayerId(layerId);

    const unsubscribe = viewerApi.subscribe((state, previous) => {
      const probe = state.probedCoordinate;
      if (!probe || probe === previous.probedCoordinate) return;
      // Hover sweeps update the same field; only a deliberate click is a pick.
      if (probe.origin !== "click" || probe.layerId !== layerId || !probe.worldPos) return;
      onPick.current({ layerId, world: [...probe.worldPos] });
    });

    return () => {
      unsubscribe();
      viewerApi.getState().setProbeLayerId(previousPin);
      // Only undo OUR mode: if the user left PROBE meanwhile, that was them.
      if (modeApi.getState().interactionMode === "PROBE") {
        modeApi.getState().setInteractionMode(previousMode);
      }
    };
  }, [enabled, layerId, modeApi, viewerApi]);

  return { active: enabled && layerId !== null && interactionMode === "PROBE" };
};

export type {
  SceneAnnotationPayload,
  SceneLayersPayload,
  ScenePickPayload,
  SceneSelectPayload,
  StructureRef,
} from "./platform/events/eventPayloads";

export type SceneEventHandlers = {
  /** A shape was drawn here. */
  onAnnotation?: (payload: SceneAnnotationPayload) => void;
  /** The selection changed by the user (a draw's auto-selection is the draw's, not reported). */
  onSelect?: (payload: SceneSelectPayload) => void;
  /** A deliberate click read a voxel (probe readout, not a vertex being placed). */
  onPick?: (payload: ScenePickPayload) => void;
  /** A layer came, went, or now draws another lens. */
  onLayersChange?: (payload: SceneLayersPayload) => void;
};

/**
 * What happens in THIS mounted scene, told to a host as plain data (structure
 * references slot straight into action ports). Only the handlers passed are
 * listened for; the latest handlers are always the ones called.
 *
 * A host that runs an action on `onLayersChange` which itself writes layers is
 * told again: `added` names the new ones, so it can tell its own run's apart.
 */
export const useSceneEvents = (handlers: SceneEventHandlers): void => {
  const events = useSceneEventsApi();
  const sceneApi = useSceneStoreApi();
  const viewerApi = useViewerStoreApi();
  const selectionApi = useRoiSelectionStoreApi();
  const current = useRef(handlers);
  current.current = handlers;
  // The shape a draw just auto-selected: that selection is the draw's.
  const drawn = useRef<string | null>(null);

  const wantsSelect = !!handlers.onSelect;
  const wantsPick = !!handlers.onPick;
  const wantsLayers = !!handlers.onLayersChange;

  // Always heard: the selection filter below needs to know what a draw selected.
  useEffect(
    () =>
      events.subscribeDrawn((event) => {
        drawn.current = event.annotation;
        current.current.onAnnotation?.(drawnPayload(event));
      }),
    [events],
  );

  useEffect(() => {
    if (!wantsSelect) return;
    return selectionApi.subscribe((state, previous) => {
      if (state.selectedRois === previous.selectedRois) return;
      const ids = state.selectedRois.map((roi) => roi.id);
      if (ids.join(",") === previous.selectedRois.map((roi) => roi.id).join(",")) return;
      if (ids.length === 1 && ids[0] === drawn.current) {
        drawn.current = null;
        return;
      }
      const layers = sceneApi.getState().sceneLayers;
      current.current.onSelect?.(selectionPayload(ids, probeLens(layers, viewerApi.getState().probeLayerId)));
    });
  }, [wantsSelect, selectionApi, sceneApi, viewerApi]);

  useEffect(() => {
    if (!wantsPick) return;
    return viewerApi.subscribe((state, previous) => {
      const probe = state.probedCoordinate;
      if (!probe || probe === previous.probedCoordinate || !isPick(probe)) return;
      current.current.onPick?.(pickPayload(probe, sceneApi.getState().sceneLayers));
    });
  }, [wantsPick, viewerApi, sceneApi]);

  const key = useSceneStore((state) => layersKey(state.sceneLayers));
  const seen = useRef<Set<string> | null>(null);
  useEffect(() => {
    const layers = sceneApi.getState().sceneLayers;
    const previous = seen.current;
    seen.current = new Set(layers.map((layer) => layer.id));
    // The first answer is what the scene opened with, not a change.
    if (!wantsLayers || previous === null) return;
    current.current.onLayersChange?.(layersPayload(layers, previous));
  }, [key, wantsLayers, sceneApi]);
};

/** How long layer events are gathered before the scene is fetched again. */
const LIVE_REFETCH_AFTER_MS = 250;

/**
 * Follow the scene as others change it: an action writing a layer or a shape
 * into it shows up here without a reload. Layers through `WatchSceneLayers`
 * (any event refetches `GetScene`, debounced, the same store-free path a layer
 * made here takes), shapes through each annotation collection's live list.
 */
export const useLiveScene = (sceneId: string, enabled = true): void => {
  const client = useMikro();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  useWatchSceneLayersSubscription({
    variables: { scene: sceneId },
    skip: !enabled,
    onData: () => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        timer.current = null;
        void client.refetchQueries({ include: ["GetScene"] });
      }, LIVE_REFETCH_AFTER_MS);
    },
    onError: (error) => console.error(`Live layers of scene ${sceneId} failed:`, error),
  });
};

/** The scene's annotation collections, as a stable comma-joined key (the store-selector rule). */
export const useSceneAnnotationCollections = (): string[] => {
  const key = useSceneStore((state) =>
    [
      ...new Set(
        state.sceneLayers.flatMap((layer) =>
          layer.__typename === "AnnotationLayer" && layer.annotationCollection ? [layer.annotationCollection.id] : [],
        ),
      ),
    ].join(","),
  );
  return useMemo(() => (key ? key.split(",") : []), [key]);
};
