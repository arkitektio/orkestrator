import { useEffect, useMemo } from "react";
import { createRafCoalescer } from "@/core/data/scene/perf/rafCoalesce";
import { useSceneStore, useSceneStoreApi } from "../platform/stores/sceneStore";
import { useViewerStoreApi } from "../platform/stores/viewerStore";
import type { ViewAxes } from "@/core/data/scene/coords/viewAxes";
import { useSceneDisplayRemap } from "../platform/stores/sceneDisplayRemap";
import { remapViewPoint, unremapViewPoint, type DisplayRemap } from "../platform/model/displayRemap";

/**
 * Pushes the session's display remap into the CURRENT scene store. Mounted
 * inside the scope, so a rebuilt scope (a view change) gets it on mount.
 *
 * At most one store write per animation frame: a remap re-places every layer
 * (the cost class of a camera move), and a slider drag fires far faster.
 */
export const DisplayRemapSync = () => {
  const api = useSceneStoreApi();
  const viewerApi = useViewerStoreApi();
  const sceneId = useSceneStore((state) => state.id);
  const remap = useSceneDisplayRemap(sceneId);
  const coalescer = useMemo(
    () =>
      createRafCoalescer<DisplayRemap | null>((latest) => {
        const { displayRemap: previous, transformContext } = api.getState();
        const view = transformContext.viewAxes as ViewAxes | null;
        // The flat view's slice is a three-space depth. Carried through the
        // change (old remap undone, new one applied) it stays on the same
        // PHYSICAL slice instead of jumping when the depth axis is remapped.
        const viewer = viewerApi.getState();
        const physical = unremapViewPoint([0, 0, viewer.currentZ], previous, view);
        const drawn = remapViewPoint(physical, latest, view)[2];
        api.getState().setDisplayRemap(latest);
        if (drawn !== viewer.currentZ) viewer.setCurrentZ(drawn);
      }),
    [api, viewerApi],
  );
  useEffect(() => () => coalescer.cancel(), [coalescer]);
  useEffect(() => {
    if (api.getState().displayRemap === remap) return;
    coalescer.schedule(remap);
  }, [api, coalescer, remap]);
  return null;
};
