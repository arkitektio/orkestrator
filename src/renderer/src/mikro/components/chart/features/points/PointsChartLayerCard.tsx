import type { LayerCardProps } from "@/core/data/plot/layerui/cardShell";
import { useViewerStore } from "@/core/data/plot/stores/viewerStore";
import { Badge } from "@/core/data/scene/layerui/cardControls";
import { ChartFact, ChartFacts, ChartLayerCardShell } from "../../platform/edits/ChartLayerCardShell";
import { ChartLayerStyle } from "../../platform/edits/ChartLayerStyle";
import type { ChartLayerState } from "../../platform/model/chartLayerModel";

/** The card for a points layer: which columns are x, y and colour, how it is drawn, how many rows. */
export const PointsChartLayerCard = ({ layer, hidden, onToggleHidden }: LayerCardProps<ChartLayerState>) => {
  const readout = useViewerStore((s) => s.readouts[layer.id]);
  const values = layer.values?.kind === "points" ? layer.values : null;
  const rows =
    readout?.total != null
      ? readout.count != null && readout.count < readout.total
        ? `${readout.count.toLocaleString()} of ${readout.total.toLocaleString()}`
        : readout.total.toLocaleString()
      : null;
  return (
    <ChartLayerCardShell
      layer={layer}
      hidden={hidden}
      onToggleHidden={onToggleHidden}
      badges={values?.filters.length ? <Badge>{values.filters.length} filter{values.filters.length === 1 ? "" : "s"}</Badge> : null}
    >
      {values && (
        <>
          <ChartLayerStyle layer={layer} />
          <ChartFacts error={readout?.error}>
            <ChartFact label="x" value={values.x} />
            <ChartFact label="y" value={values.y} />
            <ChartFact label="Colour" value={values.z} />
            <ChartFact label="Rows" value={rows ? `${rows}${readout?.loading ? " …" : ""}` : readout?.loading ? "…" : null} />
            {readout?.note && <div className="text-[10px] text-foreground/40">{readout.note}</div>}
            {layer.sourceFailure && <div className="text-[10px] text-amber-300/70">{layer.sourceFailure}</div>}
          </ChartFacts>
        </>
      )}
    </ChartLayerCardShell>
  );
};
