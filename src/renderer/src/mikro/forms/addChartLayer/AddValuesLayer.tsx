import { useState } from "react";
import { ChartMark, useCreateDistributionChartLayerMutation, useCreatePointsChartLayerMutation } from "../../api/graphql";
import { useLensRegistry } from "../../lib/lenses/useLensRegistry";
import { PlotColumnsPicker, type PlotSpec } from "../plotColumns/PlotColumnsPicker";
import type { TableCandidate } from "./candidates";

const REFETCH = ["GetChart", "ChartAddLayerCandidates"];

/**
 * What a chart of VALUES can add: the tables whose rows live in its world, each
 * with the column picker. A chart holds one kind (points or distributions), so
 * once it has a layer the picker offers only that kind.
 */
export const AddValuesLayer = ({
  chart,
  tables,
  only,
  preselect,
  lens,
  run,
}: {
  chart: string;
  tables: readonly TableCandidate[];
  only: "POINTS" | "DISTRIBUTION" | null;
  preselect?: string;
  /** A windowed lens of `preselect`: the layer then draws that selection of it. */
  lens?: string;
  run: (fn: () => Promise<unknown>) => void;
}) => {
  const [open, setOpen] = useState<string | null>(preselect ?? tables[0]?.id ?? null);
  const [addPoints, points] = useCreatePointsChartLayerMutation({ refetchQueries: REFETCH });
  const [addDistribution, distribution] = useCreateDistributionChartLayerMutation({ refetchQueries: REFETCH });
  const registry = useLensRegistry();
  const busy = points.loading || distribution.loading;

  if (tables.length === 0) {
    return (
      <div className="text-xs text-muted-foreground">
        No table’s rows live in this chart’s world yet. A chart of values draws the rows of its world; plot a table to make one over its own space.
      </div>
    );
  }

  const add = (table: TableCandidate, spec: PlotSpec) =>
    run(async () => {
      const through = lens && table.id === preselect ? lens : (table.wholeLens ?? (await registry.ensureWholeLens({ tableDataset: table.id })));
      if (spec.kind === "POINTS") {
        return addPoints({ variables: { input: { chart, lens: through, xColumn: spec.x, yColumn: spec.y, zColumn: spec.z, mark: spec.mark as ChartMark } } });
      }
      return addDistribution({
        variables: { input: { chart, lens: through, valueColumn: spec.value, groupColumn: spec.group, bins: spec.bins, mark: spec.mark as ChartMark } },
      });
    });

  return (
    <div className="flex flex-col gap-2">
      {tables.map((table) => (
        <div key={table.id} className="rounded-md border border-border/60">
          <button
            type="button"
            className="flex w-full items-center justify-between px-3 py-2 text-left text-sm"
            onClick={() => setOpen((current) => (current === table.id ? null : table.id))}
          >
            <span className="truncate">{table.name}</span>
            <span className="text-[11px] text-muted-foreground">{table.valueColumns.length} numeric columns</span>
          </button>
          {open === table.id && (
            <div className="border-t border-border/60 p-3">
              <PlotColumnsPicker
                numeric={table.valueColumns}
                groups={table.groupColumns}
                only={only}
                busy={busy}
                submitLabel="Add"
                onSubmit={(spec) => add(table, spec)}
              />
            </div>
          )}
        </div>
      ))}
    </div>
  );
};
