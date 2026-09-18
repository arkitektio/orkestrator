/**
 * The scene's HOST API — the second public entry, next to `Scene.tsx`.
 *
 * `Scene.tsx` is what a host RENDERS (provider, viewport, panels). This is what
 * a host workflow composed over the scene may DO and KNOW: list the layers and
 * how they are placed, preview a placement, pick a world point, read the
 * modes. Everything here must be called under a `Scene.Provider`.
 *
 * It exists so that a workflow with its own lifecycle — the interactive
 * registration workspace (`mikro-next/components/registration`) is the first —
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
import { createRafCoalescer } from "@/lib/scene/perf/rafCoalesce";
import { hostLayersKey, toHostLayers, type HostLayer } from "./platform/model/hostLayers";
import { useModeStore, useModeStoreApi, type DisplayMode, type InteractionMode } from "./platform/stores/modeStore";
import { useSceneStore, useSceneStoreApi, type SceneLayer } from "./platform/stores/sceneStore";
import { useViewerStoreApi } from "./platform/stores/viewerStore";
import { spatialAxisTriple } from "@/lib/scene/coords/transformGraph";

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
