import { useMemo, useState } from "react";
import type { LayerCardProps } from "@/core/data/plot/layerui/cardShell";
import { useViewerStore } from "@/core/data/plot/stores/viewerStore";
import { Badge } from "@/core/data/scene/layerui/cardControls";
import { isGroupColumn, isNumericColumn } from "@/mikro/lib/tables/columnKinds";
import { ChartFact, ChartFacts, ChartLayerCardShell } from "../../platform/edits/ChartLayerCardShell";
import { ChartLayerStyle } from "../../platform/edits/ChartLayerStyle";
import { BindingRow, BindingSection } from "../../platform/edits/ColumnBinding";
import { useChartLayerRetune } from "../../platform/edits/useChartLayerRetune";
import type { ChartLayerState } from "../../platform/model/chartLayerModel";
import { useRawChartLayer } from "../../platform/stores/chartStore";

/**
 * The card for a distribution layer: the column summarised, what it is
 * grouped by and how finely a histogram is binned -- each changed in place --
 * and how it is drawn.
 */
export const DistributionChartLayerCard = ({ layer, hidden, onToggleHidden }: LayerCardProps<ChartLayerState>) => {
  const readout = useViewerStore((s) => s.readouts[layer.id]);
  const raw = useRawChartLayer(layer.id, "DistributionChartLayer");
  const retune = useChartLayerRetune();
  const [busy, setBusy] = useState(false);
  const values = layer.values?.kind === "distribution" ? layer.values : null;
  const columns = useMemo(() => raw?.tableDataset.columns ?? [], [raw]);
  const numeric = useMemo(() => columns.filter(isNumericColumn).map((c) => ({ name: c.name, unit: c.unit ?? null })), [columns]);
  const groups = useMemo(() => columns.filter(isGroupColumn).map((c) => ({ name: c.name })), [columns]);

  const commit = async (patch: { valueColumn?: string; groupColumn?: string; clearGroupColumn?: boolean; bins?: number; clearBins?: boolean }) => {
    setBusy(true);
    await retune.distribution(layer.label, { id: layer.id, ...patch });
    setBusy(false);
  };

  const value = raw?.valueColumn ?? values?.value ?? null;
  const group = raw ? (raw.groupColumn ?? null) : (values?.group ?? null);
  const bins = raw ? (raw.bins ?? null) : (values?.bins ?? null);
  return (
    <ChartLayerCardShell
      layer={layer}
      hidden={hidden}
      onToggleHidden={onToggleHidden}
      badges={layer.valueUnit && <Badge>{layer.valueUnit}</Badge>}
    >
      <BindingSection>
        <BindingRow label="Of" value={value} columns={numeric.filter((c) => c.name !== group)} disabled={busy} onCommit={(v) => v && void commit({ valueColumn: v })} />
        <BindingRow
          label="Per"
          value={group}
          optional
          noneLabel="every row"
          columns={groups.filter((c) => c.name !== value)}
          disabled={busy}
          onCommit={(v) => void commit(v ? { groupColumn: v } : { clearGroupColumn: true })}
        />
        {layer.mark === "HISTOGRAM" && <BinsInput key={bins ?? "auto"} bins={bins} disabled={busy} onCommit={(n) => void commit(n == null ? { clearBins: true } : { bins: n })} />}
      </BindingSection>
      {values && (
        <>
          <ChartLayerStyle layer={layer} />
          <ChartFacts error={readout?.error}>
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

/** The bin count, committed on Enter or blur; empty lets the viewer choose. */
const BinsInput = ({ bins, disabled, onCommit }: { bins: number | null; disabled: boolean; onCommit: (bins: number | null) => void }) => {
  const [text, setText] = useState(bins == null ? "" : String(bins));
  const commit = () => {
    const trimmed = text.trim();
    const next = trimmed === "" ? null : Number.parseInt(trimmed, 10);
    if (next !== null && !(next >= 1)) return setText(bins == null ? "" : String(bins));
    if (next !== bins) onCommit(next);
  };
  return (
    <div className="flex items-center gap-2">
      <span className="shrink-0 text-[9px] font-medium uppercase tracking-[0.08em] text-foreground/35">Bins</span>
      <input
        className="ml-auto h-5 w-16 rounded border border-foreground/10 bg-background/30 px-1.5 text-right font-mono text-[10px] text-foreground/70"
        inputMode="numeric"
        placeholder="auto"
        value={text}
        disabled={disabled}
        onChange={(event) => setText(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => event.key === "Enter" && commit()}
      />
    </div>
  );
};
