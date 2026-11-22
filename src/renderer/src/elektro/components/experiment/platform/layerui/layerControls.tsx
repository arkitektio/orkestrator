import type { ReactNode } from "react";
import { LayerMenu as PlotLayerMenu } from "@/core/data/plot/layerui/layerControls";
import { useDeleteLayerMutation } from "@/elektro/api/graphql";
import { evictLayer } from "@/elektro/components/experiment/platform/edits/layerCache";

export { ColorInput, LineWidthSelect } from "@/core/data/plot/layerui/layerControls";

/**
 * The per-layer menu, bound to elektro's delete: the plot engine's menu and
 * confirm, with the experiment's mutation and its own wording for what goes.
 */
export const LayerMenu = ({
  layerId,
  label,
  children,
}: {
  layerId: string;
  label: string;
  children?: ReactNode;
}) => {
  // The layer leaves the cache; the rest of the scene stands as it is.
  const [remove, { loading }] = useDeleteLayerMutation({ update: (cache) => evictLayer(cache, layerId) });
  return (
    <PlotLayerMenu
      label={label}
      deleting={loading}
      onDelete={() => remove({ variables: { id: layerId } })}
      consequence="The layer leaves this experiment, with its colour, scale and pickers. The data it shows is kept."
    >
      {children}
    </PlotLayerMenu>
  );
};
