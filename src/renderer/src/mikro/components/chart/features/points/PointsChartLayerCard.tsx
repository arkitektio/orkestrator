import { useMemo, useState } from "react";
import type { LayerCardProps } from "@/core/data/plot/layerui/cardShell";
import { useViewerStore } from "@/core/data/plot/stores/viewerStore";
import { Badge } from "@/core/data/scene/layerui/cardControls";
import { isNumericColumn } from "@/mikro/lib/tables/columnKinds";
import { ChartFact, ChartFacts, ChartLayerCardShell } from "../../platform/edits/ChartLayerCardShell";
import { ChartLayerStyle } from "../../platform/edits/ChartLayerStyle";
import { BindingRow, BindingSection } from "../../platform/edits/ColumnBinding";
import { useChartLayerRetune } from "../../platform/edits/useChartLayerRetune";
import type { ChartLayerState } from "../../platform/model/chartLayerModel";
import { useRawChartLayer } from "../../platform/stores/chartStore";

/**
 * The card for a points layer: which columns are x, y and colour -- each
 * changed in place, as a scene layer's columns are -- how it is drawn, and how
 * many rows.
 */
export const PointsChartLayerCard = ({ layer, hidden, onToggleHidden }: LayerCardProps<ChartLayerState>) => {
  const readout = useViewerStore((s) => s.readouts[layer.id]);
  const raw = useRawChartLayer(layer.id, "PointsChartLayer");
  const retune = useChartLayerRetune();
  const [busy, setBusy] = useState(false);
  const values = layer.values?.kind === "points" ? layer.values : null;
  const numeric = useMemo(
    () => (raw?.tableDataset.columns ?? []).filter(isNumericColumn).map((c) => ({ name: c.name, unit: c.unit ?? null })),
    [raw],
  );

  const commit = async (patch: { xColumn?: string; yColumn?: string; zColumn?: string; clearZColumn?: boolean }) => {
    setBusy(true);
    await retune.points(layer.label, { id: layer.id, ...patch });
    setBusy(false);
  };

  const rows =
    readout?.total != null
      ? readout.count != null && readout.count < readout.total
        ? `${readout.count.toLocaleString()} of ${readout.total.toLocaleString()}`
        : readout.total.toLocaleString()
      : null;
  const x = raw?.xColumn ?? values?.x ?? null;
  const y = raw?.yColumn ?? values?.y ?? null;
  const z = raw ? (raw.zColumn ?? null) : (values?.z ?? null);
  return (
    <ChartLayerCardShell
      layer={layer}
      hidden={hidden}
      onToggleHidden={onToggleHidden}
      badges={values?.filters.length ? <Badge>{values.filters.length} filter{values.filters.length === 1 ? "" : "s"}</Badge> : null}
    >
      <BindingSection>
        <BindingRow label="x" value={x} columns={numeric.filter((c) => c.name !== y && c.name !== z)} disabled={busy} onCommit={(v) => v && void commit({ xColumn: v })} />
        <BindingRow label="y" value={y} columns={numeric.filter((c) => c.name !== x && c.name !== z)} disabled={busy} onCommit={(v) => v && void commit({ yColumn: v })} />
        <BindingRow
          label="Colour"
          value={z}
          optional
          columns={numeric.filter((c) => c.name !== x && c.name !== y)}
          disabled={busy}
          onCommit={(v) => void commit(v ? { zColumn: v } : { clearZColumn: true })}
        />
      </BindingSection>
      {values && (
        <>
          <ChartLayerStyle layer={layer} />
          <ChartFacts error={readout?.error}>
            <ChartFact label="Rows" value={rows ? `${rows}${readout?.loading ? " …" : ""}` : readout?.loading ? "…" : null} />
            {readout?.note && <div className="text-[10px] text-foreground/40">{readout.note}</div>}
            {layer.sourceFailure && <div className="text-[10px] text-amber-300/70">{layer.sourceFailure}</div>}
          </ChartFacts>
        </>
      )}
    </ChartLayerCardShell>
  );
};
