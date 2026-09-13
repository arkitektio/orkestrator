import { useEffect, useMemo } from "react";
import { useSceneStore, useSceneStoreApi } from "../platform/stores/sceneStore";
import { useViewerStore } from "../platform/stores/viewerStore";
import { getInitialVolumeTextureBudgetBytes } from "../platform/quality/lodPlanning";
import { selectLayersWithinBudget } from "../platform/quality/renderCost";
import { LAYER_RENDERERS } from "./layerRegistry";
import { isPlaceable } from "../platform/model/layerModel";

// Draw-call backstop only — the primary display limit is the byte budget.
const MAX_DISPLAYABLE_LAYERS = 64;

/**
 * Dispatches each scene layer to the renderer registered for its `__typename`
 * and the current display mode. Image layers cost nothing against the byte
 * budget here: PLANNED image layers are budget-bounded by the brick pool
 * (atlas sized from a budget share), and layers whose pinned coarsest level
 * would exceed the GPU budget (no usable pyramid — P18) are refused UPSTREAM
 * by the pool-viability guard in nodePlanTracker (no plan → the brick layer
 * components render nothing; `viewerStore.unplannableLayers` carries the
 * reason). So this budget only culls non-image layer types.
 */
export const LayerRenderer = ({ mode }: { mode: "2D" | "3D" }) => {
  const sceneStoreApi = useSceneStoreApi();
  // SCALAR keys over exactly what the dispatch reads (P9c/P17): subscribing
  // to the ARRAYS re-rendered this component — and with it the whole layer
  // dispatch subtree below — on every store write, sixty times a second
  // during a contrast drag. The keys change only when a layer arrives,
  // leaves, changes kind, moves, or flips visibility; the memo then reads
  // the arrays via `getState()`. Children take only the stable `layerId`, so
  // a momentarily-stale read inside the memo is safe.
  const dispatchKey = useSceneStore((s) =>
    s.sceneLayers
      .map((layer) => `${layer.id}:${layer.__typename}:${isPlaceable(layer) ? 1 : 0}`)
      .join("|"),
  );
  const visibilityKey = useSceneStore((s) =>
    s.layers.map((layer) => (layer.visible === false ? "" : layer.id)).join("|"),
  );
  const setRenderBudget = useViewerStore((s) => s.setRenderBudget);

  const selection = useMemo(() => {
    const { sceneLayers, layers: imageLayers } = sceneStoreApi.getState();
    // Hidden image layers neither render nor consume budget (visibility
    // lives on the normalized image LayerState). Unplaceable layers — no
    // server `asAffine`, the only placement authority — are not dispatched
    // for ANY kind (bricks, labels, points, tracks, meshes, annotations…):
    // there is no world position to draw them at, and drawing them in their
    // own frame would put them somewhere wrong. The layer panel shows why.
    const imageLayerById = new Map(imageLayers.map((layer) => [layer.id, layer]));
    const candidates = sceneLayers.filter(
      (layer) => isPlaceable(layer) && imageLayerById.get(layer.id)?.visible !== false,
    );

    const entries = candidates.map((layer) => ({ id: layer.id, costBytes: 0, layer }));

    const budgetBytes = getInitialVolumeTextureBudgetBytes();
    return {
      budgetBytes,
      ...selectLayersWithinBudget(entries, budgetBytes, MAX_DISPLAYABLE_LAYERS),
    };
    // The two keys STAND FOR the arrays the getState() read returns.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatchKey, visibilityKey, mode, sceneStoreApi]);

  // Surface culling decisions so layers don't silently vanish.
  useEffect(() => {
    setRenderBudget(
      selection.culled.length > 0
        ? {
            budgetBytes: selection.budgetBytes,
            usedBytes: selection.usedBytes,
            culledLayerIds: selection.culled.map((entry) => entry.id),
          }
        : null,
    );
  }, [selection, setRenderBudget]);

  return (
    <group>
      {selection.displayed.map(({ layer }) => {
        const renderers = LAYER_RENDERERS[layer.__typename];
        const Component = mode === "2D" ? renderers?.Layer2D : renderers?.Layer3D;
        return Component ? <Component key={layer.id} layerId={layer.id} /> : null;
      })}
    </group>
  );
};
