import { Color } from "three";
import type { StoreApi } from "zustand/vanilla";
import type { ParquetQueryEngine } from "@/lib/parquet/parquetEngine";
import { sampleColorMapRgb, type ColorMap } from "@/lib/scene/gpu/colormaps";
import type { SparseBlock, SparseLayoutHandle } from "@/lib/sparse/sparseReader";
import type { LayerDriver } from "../../platform/drivers/layerDriver";
import type { LayerState } from "../../platform/model/layerModel";
import { activeEntries, rulesKeep } from "../../platform/pickers/pickerModel";
import type { PickerSlice } from "../../platform/pickers/pickerSlice";
import type { PickerValuesService } from "../../platform/pickers/pickerValuesService";
import { laneCountOf, packSpikes, unitLanes, type SpikeSource } from "../../platform/sources/spikeSource";
import { unitIdColumn, unitOrderSql } from "../../platform/sources/unitTable";
import type { ExperimentStoreState } from "../../platform/stores/experimentStore";
import { rawLayerOf, type LayerFragments } from "../../platform/stores/layerFragments";
import type { RangeState } from "../../platform/stores/rangeStore";
import type { ViewerState } from "../../platform/stores/viewerStore";
import {
  amplitudeTickColors,
  colorByTickColors,
  spikeDrawFor,
  type SpikeRaster,
} from "./spikeDraw";
import type { SpikesSlice } from "./store/spikesSlice";

/** Nonzeros (spikes) read per layer before stopping — ~32 MB of int64 + values. */
export const SPIKE_BUDGET = 2_000_000;

/** The sparse reads a raster needs — `@/lib/sparse/sparseReader`, injected. */
export type SparseReader = {
  open: (choice: SpikeSource["choice"]) => Promise<SparseLayoutHandle>;
  block: (handle: SparseLayoutHandle, from: number, to: number) => Promise<SparseBlock>;
  nnz: (handle: SparseLayoutHandle, from: number, to: number) => number;
};

export type SpikesDriverEnv = {
  experimentApi: StoreApi<ExperimentStoreState>;
  rangeApi: StoreApi<RangeState>;
  viewerApi: StoreApi<ViewerState & SpikesSlice & PickerSlice>;
  sparse: () => SparseReader | null;
  engine: () => ParquetQueryEngine | null;
  pickers: () => PickerValuesService | null;
};

type Read = { block: SparseBlock; unitCount: number; readUnits: number; total: number };

/**
 * One spikes layer's pipeline, in stages that each re-run only what changed:
 *
 *  1. **read** (the source): open the unit-indexed layout through the shared
 *     sparse reader and read one contiguous block of units within the spike
 *     budget — two ranged reads, on the worker runner. Cached; nothing else
 *     re-reads it.
 *  2. **order** (`rowOrderColumn`): one parquet read of the unit table.
 *  3. **pickers** (the active entries): maps from the shared service.
 *  4. **pack**: lanes from order and filters, ticks, colours — CPU only, from
 *     the cached block. A filter or colour change costs no read.
 *  5. **draw**: density vs ticks, and the rate histogram, for the COMMITTED
 *     window and canvas width.
 */
export class SpikeRasterDriver implements LayerDriver {
  private layer: LayerState;
  private raw: LayerFragments["SpikesLayer"] | undefined;
  private sourceKey: string | null = null;
  private orderKey = "";
  private pickerKey = "";
  private read: Read | null = null;
  private order: number[] | null = null;
  private maps: Record<string, Map<unknown, unknown>> = {};
  private raster: SpikeRaster | null = null;
  private colors: Float32Array | null = null;
  private generation = 0;
  private disposed = false;
  private readonly unsubscribes: (() => void)[] = [];

  constructor(
    layer: LayerState,
    private readonly env: SpikesDriverEnv,
  ) {
    this.layer = layer;
    this.unsubscribes.push(
      env.rangeApi.subscribe((state, previous) => {
        if (state.committedRange !== previous.committedRange) this.draw();
      }),
      env.viewerApi.subscribe((state, previous) => {
        if (state.viewportPx.width !== previous.viewportPx.width) this.draw();
      }),
    );
    this.update(layer, true);
  }

  update(layer: LayerState, first = false): void {
    const previous = this.layer;
    this.layer = layer;
    this.raw = rawLayerOf(this.env.experimentApi.getState().rawLayers, layer.id, "SpikesLayer");
    const source = layer.spikes;

    const sourceKey = source
      ? `${source.datasetId}:${source.choice.layout.path}:${source.timeMap.period}:${source.timeMap.t0}`
      : null;
    if (sourceKey !== this.sourceKey) {
      this.sourceKey = sourceKey;
      void this.readRaster();
    }
    const orderKey = this.raw?.unitTable && layer.raster?.rowOrderColumn
      ? `${this.raw.unitTable.id}:${layer.raster.rowOrderColumn}`
      : "";
    if (orderKey !== this.orderKey) {
      this.orderKey = orderKey;
      void this.readOrder();
    }
    const active = this.raw ? activeEntries(this.raw) : { colorBy: null, filters: [] };
    const pickerKey = JSON.stringify([active.colorBy, active.filters]);
    if (pickerKey !== this.pickerKey) {
      this.pickerKey = pickerKey;
      void this.loadPickers();
    } else if (
      !first &&
      (previous.color !== layer.color ||
        previous.raster?.valueMode !== layer.raster?.valueMode ||
        previous.raster?.colormap !== layer.raster?.colormap ||
        previous.climSeed !== layer.climSeed ||
        previous.raster?.rateBin !== layer.raster?.rateBin)
    ) {
      this.pack();
    }
  }

  dispose(): void {
    this.disposed = true;
    this.generation++;
    for (const unsubscribe of this.unsubscribes) unsubscribe();
    const viewer = this.env.viewerApi.getState();
    viewer.setSpikeDraw(this.layer.id, null);
    viewer.setPickerProblems(this.layer.id, null);
  }

  // --- stages ---------------------------------------------------------------

  private patch(patch: Parameters<ViewerState["patchReadout"]>[1]): void {
    if (!this.disposed) this.env.viewerApi.getState().patchReadout(this.layer.id, patch);
  }

  private async readRaster(): Promise<void> {
    const mine = ++this.generation;
    const source = this.layer.spikes;
    this.read = null;
    this.raster = null;
    this.env.viewerApi.getState().setSpikeDraw(this.layer.id, null);
    const sparse = this.env.sparse();
    if (!source) return;
    if (!sparse) {
      this.patch({ loading: false, error: "the sparse reader is not ready" });
      return;
    }
    this.patch({ loading: true, error: null });
    try {
      const handle = await sparse.open(source.choice);
      if (this.disposed || mine !== this.generation) return;
      const unitCount = Math.min(source.unitCount, handle.indptr.length - 1);
      // A contiguous block of units, in index order, within the budget.
      let to = unitCount;
      if (sparse.nnz(handle, 0, unitCount) > SPIKE_BUDGET) {
        let lo = 0;
        let hi = unitCount;
        while (lo < hi) {
          const mid = Math.ceil((lo + hi) / 2);
          if (sparse.nnz(handle, 0, mid) <= SPIKE_BUDGET) lo = mid;
          else hi = mid - 1;
        }
        to = Math.max(1, lo);
      }
      const block = await sparse.block(handle, 0, to);
      if (this.disposed || mine !== this.generation) return;
      this.read = { block, unitCount, readUnits: to, total: sparse.nnz(handle, 0, unitCount) };
      this.patch({ loading: false, total: this.read.total, truncated: to < unitCount });
      this.pack();
    } catch (error) {
      if (!this.disposed && mine === this.generation) this.patch({ loading: false, error: errorText(error) });
    }
  }

  private async readOrder(): Promise<void> {
    const key = this.orderKey;
    const table = this.raw?.unitTable ?? null;
    const column = this.layer.raster?.rowOrderColumn ?? null;
    const engine = this.env.engine();
    if (!key || !table || !column || !engine) {
      this.order = null;
      this.pack();
      return;
    }
    const idColumn = unitIdColumn(table, this.layer.spikes?.unitAxis ?? null);
    if (!idColumn) return;
    try {
      const columns = await engine.readColumnsTyped(
        [table.store],
        (urlOf) => unitOrderSql(urlOf(table.store.id), idColumn, column),
        ["__unit"],
      );
      if (this.disposed || key !== this.orderKey) return;
      this.order = columns ? Array.from(columns.__unit as ArrayLike<number>, Number) : null;
      this.pack();
    } catch (error) {
      if (!this.disposed && key === this.orderKey) this.patch({ error: errorText(error) });
    }
  }

  private async loadPickers(): Promise<void> {
    const key = this.pickerKey;
    const service = this.env.pickers();
    const table = this.raw?.unitTable ?? null;
    const active = this.raw ? activeEntries(this.raw) : { colorBy: null, filters: [] };
    const entries = [...(active.colorBy ? [active.colorBy] : []), ...active.filters];
    if (!service || !table || entries.length === 0) {
      this.maps = {};
      this.env.viewerApi.getState().setPickerProblems(this.layer.id, null);
      this.pack();
      return;
    }
    const values = await service.values(table, entries, 0);
    if (this.disposed || key !== this.pickerKey) return;
    this.maps = values.maps;
    this.env.viewerApi.getState().setPickerProblems(this.layer.id, values.problems);
    this.pack();
  }

  /** Lanes, ticks and colours from the cached block — no read. */
  private pack(): void {
    const read = this.read;
    const source = this.layer.spikes;
    if (this.disposed || !read || !source) return;
    const active = this.raw ? activeEntries(this.raw) : { colorBy: null, filters: [] };
    const rules = active.filters
      .filter((f) => this.maps[f.key])
      .map((f) => ({ filter: f.entry, valueOf: (unit: unknown) => this.maps[f.key].get(unit) }));
    const lanesOfUnit = unitLanes(
      read.unitCount,
      this.order,
      rules.length > 0 ? (unit: number) => rulesKeep(rules, unit) : null,
    );
    const timeOrigin = this.env.experimentApi.getState().timeOrigin;
    const packed = packSpikes(read.block, (u) => lanesOfUnit[u], source.timeMap, timeOrigin);
    const laneCount = laneCountOf(lanesOfUnit);
    const unitOfLane = new Int32Array(laneCount).fill(-1);
    lanesOfUnit.forEach((lane, unit) => {
      if (lane >= 0) unitOfLane[lane] = unit;
    });
    this.raster = { ...packed, laneCount, unitOfLane };

    const sample = (colormap: string | null, t: number) => sampleColorMapRgb(colormap as ColorMap | null, t);
    const colorMap = active.colorBy ? this.maps[active.colorBy.key] : undefined;
    const base = new Color().setStyle(this.layer.color);
    this.colors =
      active.colorBy && colorMap
        ? colorByTickColors(this.raster, active.colorBy.entry, colorMap, [base.r, base.g, base.b], sample)
        : this.layer.raster?.valueMode === "AMPLITUDE"
          ? amplitudeTickColors(this.raster, this.layer.raster.colormap, this.layer.climSeed, sample)
          : null;

    this.patch({
      note:
        read.readUnits < read.unitCount
          ? `${read.readUnits.toLocaleString()} of ${read.unitCount.toLocaleString()} units`
          : `${laneCount.toLocaleString()} unit${laneCount === 1 ? "" : "s"}`,
    });
    this.draw();
  }

  /** Ticks or rate histogram, for the committed window. */
  private draw(): void {
    const raster = this.raster;
    if (this.disposed || !raster) return;
    const timeOrigin = this.env.experimentApi.getState().timeOrigin;
    const committed = this.env.rangeApi.getState().committedRange;
    const viewer = this.env.viewerApi.getState();
    const draw = spikeDrawFor(
      raster,
      this.colors,
      { start: committed.start - timeOrigin, end: committed.end - timeOrigin },
      viewer.viewportPx.width,
      this.layer.raster?.rateBin ?? null,
    );
    viewer.setSpikeDraw(this.layer.id, draw);
    this.patch({ count: draw.count, density: draw.density });
  }
}

const errorText = (error: unknown) => (error instanceof Error ? error.message : String(error));
