import { describe, expect, it, vi } from "vitest";
import type { StoreApi } from "zustand/vanilla";
import { normalizeSpikesLayer, type SpikesLayerLike } from "../../platform/model/layerModel";
import { createPickerSlice, type PickerSlice } from "../../platform/pickers/pickerSlice";
import { createExperimentStore } from "../../platform/stores/experimentStore";
import { createRangeStore } from "../../platform/stores/rangeStore";
import { createViewerStore, type ViewerState } from "../../platform/stores/viewerStore";
import { createSpikesSlice, type SpikesSlice } from "./store/spikesSlice";
import { SpikeRasterDriver, type SparseReader } from "./SpikeRasterDriver";

const world = { axes: [{ name: "t", type: "TIME", order: 0 }] };
const fragment = {
  __typename: "SpikesLayer",
  id: "sp",
  placement: "PLACED",
  asAffine: { matrix: [[0, 1, 0]], inputAxes: ["unit", "t"], outputAxes: ["t"], total: true },
  sparseDataset: {
    id: "d",
    name: "units",
    axisNames: ["unit", "t"],
    shape: [3, 100],
    coordinateSystem: { axes: [{ name: "unit", type: "INDEX" }, { name: "t", type: "TIME" }] },
    arrays: [
      {
        path: "layouts/axis0",
        indexedAxis: 0,
        store: {
          id: "s",
          key: "k",
          layouts: [{ path: "layouts/axis0", indexedAxis: 0, indexOrder: [1], rangeReadable: false }],
        },
      },
    ],
  },
  unitTable: null,
  colorBys: [],
  filterBys: [],
  activeColorBy: null,
  activeFilterBys: [],
};

const settle = () => new Promise((r) => setTimeout(r, 0));

const setup = () => {
  const layer = normalizeSpikesLayer(fragment as unknown as SpikesLayerLike, world);
  const experimentApi = createExperimentStore({
    experimentId: "e",
    world,
    annotatable: true,
    layers: [layer],
    rawLayers: { sp: fragment } as never,
    timeOrigin: 0,
    worldSpan: { start: 0, end: 100 },
  });
  const rangeApi = createRangeStore({ worldSpan: { start: 0, end: 100 }, minWidth: 1 });
  const viewerApi = createViewerStore([createSpikesSlice, createPickerSlice]) as unknown as StoreApi<
    ViewerState & SpikesSlice & PickerSlice
  >;
  viewerApi.getState().setViewportPx({ width: 1000, height: 100 });
  // Unit 0: spikes at 10, 20; unit 1: none; unit 2: at 50.
  const handle = { indptr: Int32Array.from([0, 2, 2, 3]) } as never;
  const sparse: SparseReader = {
    open: vi.fn(async () => handle),
    block: vi.fn(async () => ({
      from: 0,
      to: 3,
      offsets: Float64Array.from([0, 2, 2, 3]),
      indices: [10, 20, 50],
      values: [1, 2, 3],
    })),
    nnz: () => 3,
  };
  const driver = new SpikeRasterDriver(layer, {
    experimentApi,
    rangeApi,
    viewerApi,
    sparse: () => sparse,
    engine: () => null,
    pickers: () => null,
  });
  return { layer, viewerApi, sparse, driver };
};

describe("SpikeRasterDriver", () => {
  it("reads the unit block once and publishes one lane per unit", async () => {
    const { viewerApi, sparse } = setup();
    await settle();
    const draw = viewerApi.getState().spikeDraws.sp;
    expect(sparse.block).toHaveBeenCalledTimes(1);
    expect(Array.from(draw.xs)).toEqual([10, 20, 50]);
    expect(Array.from(draw.lanes)).toEqual([0, 0, 2]);
    expect(draw.laneCount).toBe(3);
    expect(viewerApi.getState().readouts.sp).toMatchObject({ count: 3, total: 3, loading: false });
  });

  it("recolours from the cached block without reading again", async () => {
    const { layer, sparse, driver, viewerApi } = setup();
    await settle();
    driver.update({ ...layer, color: "#ff0000", raster: { ...layer.raster!, valueMode: "AMPLITUDE" } });
    expect(sparse.block).toHaveBeenCalledTimes(1);
    expect(viewerApi.getState().spikeDraws.sp.colors).not.toBeNull();
  });

  it("withdraws its draw on dispose", async () => {
    const { viewerApi, driver } = setup();
    await settle();
    driver.dispose();
    expect(viewerApi.getState().spikeDraws.sp).toBeUndefined();
  });
});
