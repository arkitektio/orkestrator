import type { LayerCardProps } from "@/core/data/plot/layerui/cardShell";
import { useViewerStore } from "@/core/data/plot/stores/viewerStore";
import { Badge } from "@/core/data/scene/layerui/cardControls";
import { ChartFact, ChartFacts, ChartLayerCardShell } from "../../platform/edits/ChartLayerCardShell";
import { ChartLayerStyle } from "../../platform/edits/ChartLayerStyle";
import type { ChartLayerState } from "../../platform/model/chartLayerModel";

/** The card for a distribution layer: the column summarised, what it is grouped by, and how. */
export const DistributionChartLayerCard = ({ layer, hidden, onToggleHidden }: LayerCardProps<ChartLayerState>) => {
  const readout = useViewerStore((s) => s.readouts[layer.id]);
  const values = layer.values?.kind === "distribution" ? layer.values : null;
  return (
    <ChartLayerCardShell
      layer={layer}
      hidden={hidden}
      onToggleHidden={onToggleHidden}
      badges={layer.valueUnit && <Badge>{layer.valueUnit}</Badge>}
    >
      {values && (
        <>
          <ChartLayerStyle layer={layer} />
          <ChartFacts error={readout?.error}>
            <ChartFact label="Of" value={values.value} />
            <ChartFact label="Per" value={values.group} />
            <ChartFact label="Bins" value={layer.mark === "HISTOGRAM" ? (values.bins ?? "auto") : null} />
            <ChartFact
              label="Rows"
              value={readout?.total != null ? `${readout.total.toLocaleString()}${readout.loading ? " …" : ""}` : readout?.loading ? "…" : null}
            />
            {readout?.note && <div className="text-[10px] text-foreground/40">{readout.note}</div>}
            {layer.sourceFailure && <div className="text-[10px] text-amber-300/70">{layer.sourceFailure}</div>}
          </ChartFacts>
        </>
      )}
    </ChartLayerCardShell>
  );
};
