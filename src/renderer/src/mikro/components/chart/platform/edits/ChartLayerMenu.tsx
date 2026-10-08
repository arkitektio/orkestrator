import type { ReactNode } from "react";
import { LayerMenu } from "@/core/data/plot/layerui/layerControls";
import { useDeleteChartLayerMutation } from "@/mikro/api/graphql";

/**
 * The per-layer menu, bound to the chart's delete: the plot engine's menu and
 * confirm, with the chart's mutation and its own wording for what goes.
 */
export const ChartLayerMenu = ({
  layerId,
  label,
  children,
}: {
  layerId: string;
  label: string;
  children?: ReactNode;
}) => {
  const [remove, { loading }] = useDeleteChartLayerMutation({ refetchQueries: ["GetChart"] });
  return (
    <LayerMenu
      label={label}
      deleting={loading}
      onDelete={() => remove({ variables: { id: layerId } })}
      consequence="The layer leaves this chart, with its colour and style. The data it draws is kept."
    >
      {children}
    </LayerMenu>
  );
};
