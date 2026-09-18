import type { ApolloClient, NormalizedCache } from "@apollo/client";
import { useEffect, useState } from "react";
import { useDatalayerEndpoint, useElektro } from "@/app/Arkitekt";
import { useElektroParquetEngine } from "@/elektro/components/store/parquetEngine";
import { elektroSparseAccess } from "@/elektro/components/store/sparseAccess";
import { blockNnz, openSparseLayout, readSparseBlock } from "@/lib/sparse/sparseReader";
import { laneCountOf, packSpikes, unitLanes, type SpikeSource } from "../../platform/sources/spikeSource";
import { unitIdColumn, unitOrderSql, type UnitTableLike } from "../../platform/sources/unitTable";
import { useExperimentStoreApi } from "../../platform/stores/experimentStore";
import { useViewerStoreApi } from "../../platform/stores/viewerStore";

/**
 * Reading a spike raster: every spike of the drawn units, placed on the world
 * clock, one lane per unit.
 *
 *  - The layout indexed on the unit axis is opened through the SHARED sparse
 *    reader (`@/lib/sparse`) on elektro's sparse grant; its `indptr` is held,
 *    so a block of units is one `indices` read and one `data` read, on the
 *    worker runner at exact dtype.
 *  - Rows follow `rowOrderColumn` of the unit table (one parquet read), else
 *    unit index; `keepUnit` (the active filter-bys) drops units.
 *  - Spikes are read ONCE per layer, not per window: a raster is sparse, and a
 *    pan must not re-read. A dataset too big for the budget is read in unit
 *    blocks up to it, and the card says how many units made it.
 */

/** Nonzeros (spikes) read per layer before stopping — ~32 MB of int64 + values. */
export const SPIKE_BUDGET = 2_000_000;

export type SpikeRaster = {
  xs: Float64Array;
  lanes: Uint32Array;
  values: Float32Array;
  laneCount: number;
  /** Unit index shown in each lane. */
  unitOfLane: Int32Array;
};

export const useSpikeRaster = (
  layerId: string,
  source: SpikeSource | null,
  unitTable: UnitTableLike | null,
  rowOrderColumn: string | null,
  keep: { key: string; keepUnit: ((unit: number) => boolean) | null },
): SpikeRaster | null => {
  const client = useElektro() as ApolloClient<NormalizedCache> | undefined;
  const datalayer = useDatalayerEndpoint();
  const engine = useElektroParquetEngine();
  const viewerApi = useViewerStoreApi();
  const experimentApi = useExperimentStoreApi();
  const [raster, setRaster] = useState<SpikeRaster | null>(null);

  const sourceKey = source
    ? `${source.datasetId}:${source.choice.layout.path}:${source.timeMap.period}:${source.timeMap.t0}`
    : null;
  const orderKey = unitTable && rowOrderColumn ? `${unitTable.id}:${rowOrderColumn}` : "";

  useEffect(() => {
    if (!source || !client || !datalayer) {
      setRaster(null);
      return;
    }
    let disposed = false;
    const patch = viewerApi.getState().patchReadout;
    patch(layerId, { loading: true, error: null });

    void (async () => {
      try {
        const access = elektroSparseAccess(client, datalayer);
        const handleReady = openSparseLayout(access, source.choice);

        // Row order: the unit table sorted by the chosen column.
        let order: number[] | null = null;
        const idColumn = unitTable ? unitIdColumn(unitTable, source.unitAxis) : null;
        if (unitTable && rowOrderColumn && idColumn && engine) {
          const columns = await engine.readColumnsTyped(
            [unitTable.store],
            (urlOf) => unitOrderSql(urlOf(unitTable.store.id), idColumn, rowOrderColumn),
            ["__unit"],
          );
          if (columns) order = Array.from(columns.__unit as ArrayLike<number>, Number);
        }

        const handle = await handleReady;
        if (disposed) return;
        const unitCount = Math.min(source.unitCount, handle.indptr.length - 1);
        const lanesOfUnit = unitLanes(unitCount, order, keep.keepUnit);

        // Contiguous unit blocks, in index order, until the budget runs out.
        let to = unitCount;
        if (blockNnz(handle, 0, unitCount) > SPIKE_BUDGET) {
          let lo = 0;
          let hi = unitCount;
          while (lo < hi) {
            const mid = Math.ceil((lo + hi) / 2);
            if (blockNnz(handle, 0, mid) <= SPIKE_BUDGET) lo = mid;
            else hi = mid - 1;
          }
          to = Math.max(1, lo);
        }
        const block = await readSparseBlock(handle, 0, to);
        if (disposed) return;

        const timeOrigin = experimentApi.getState().timeOrigin;
        const packed = packSpikes(block, (u) => lanesOfUnit[u], source.timeMap, timeOrigin);
        const laneCount = laneCountOf(lanesOfUnit);
        const unitOfLane = new Int32Array(laneCount).fill(-1);
        lanesOfUnit.forEach((lane, unit) => {
          if (lane >= 0) unitOfLane[lane] = unit;
        });

        setRaster({ ...packed, laneCount, unitOfLane });
        patch(layerId, {
          loading: false,
          count: packed.xs.length,
          total: blockNnz(handle, 0, unitCount),
          truncated: to < unitCount,
          note:
            to < unitCount
              ? `${to.toLocaleString()} of ${unitCount.toLocaleString()} units`
              : `${laneCount.toLocaleString()} unit${laneCount === 1 ? "" : "s"}`,
        });
      } catch (error) {
        if (disposed) return;
        patch(layerId, { loading: false, error: error instanceof Error ? error.message : String(error) });
      }
    })();

    return () => {
      disposed = true;
    };
    // The keys stand for `source`, the order inputs and the filter.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceKey, orderKey, keep.key, client, datalayer, engine, layerId, viewerApi, experimentApi]);

  return raster;
};
