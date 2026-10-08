import { useMemo, type FC } from "react";
import { drawnLayersKey, isLayerHidden, usePlotStore, usePlotStoreApi } from "../stores/plotStore";

export type LayerRendererProps = { layerId: string };
/** One layer kind's drawing component, or null for a kind that draws nothing. */
export type LayerRenderers = { Layer: FC<LayerRendererProps> | null };

/**
 * Dispatches every drawn layer to its component — and is the ONE place placement
 * is gated (R1). A layer that is not drawable never mounts, so no layer kind has
 * to re-check.
 *
 * Which component draws which typename is the module's registry, passed in: the
 * engine knows the protocol, not the kinds.
 *
 * Textbook two-plane: it subscribes to one SCALAR key (`drawnLayersKey`) and reads
 * the array through `getState()` in a memo keyed on it — the idiom mikro's
 * `LayerRenderer` uses. Subscribing to `layers` itself would re-render this on
 * every reconcile, including ones that change nothing it draws.
 */
export const PlotLayerRenderer = ({
  renderers,
}: {
  renderers: Readonly<Record<string, LayerRenderers>>;
}) => {
  const key = usePlotStore(drawnLayersKey);
  const api = usePlotStoreApi();

  const drawn = useMemo(() => {
    const state = api.getState();
    return state.layers.filter((layer) => layer.placeability.drawable && !isLayerHidden(layer));
    // The key STANDS FOR the array.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, api]);

  return (
    <group>
      {drawn.map((layer) => {
        const Layer = renderers[layer.typename]?.Layer;
        return Layer ? <Layer key={layer.id} layerId={layer.id} /> : null;
      })}
    </group>
  );
};
