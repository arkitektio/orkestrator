import { unplacedMessage, type ChartLayerState } from "../model/chartLayerModel";

/**
 * Why a layer is not drawn, when it is not: the server's placement verdict, or
 * what its data cannot be read for. Renders nothing for a layer that draws.
 */
export const ChartLayerPlacement = ({ layer }: { layer: ChartLayerState }) => {
  const message = unplacedMessage(layer.placeability);
  if (!message && !layer.sourceFailure) return null;
  return (
    <div
      className="text-[11px] text-amber-500"
      title={!layer.placeability.drawable ? (layer.placeability.detail ?? undefined) : undefined}
    >
      {message ?? "Cannot be drawn"}
      {layer.sourceFailure ? ` — ${layer.sourceFailure}` : ""}
    </div>
  );
};
