import { describe, expect, it, vi } from "vitest";
import type { StoreApi } from "zustand/vanilla";
import { normalizeEventsLayer, type EventsLayerLike } from "../../platform/model/layerModel";
import { createPickerSlice, type PickerSlice } from "../../platform/pickers/pickerSlice";
import { createExperimentStore } from "../../platform/stores/experimentStore";
import { createRangeStore } from "../../platform/stores/rangeStore";
import { createViewerStore, type ViewerState } from "../../platform/stores/viewerStore";
import { createEventsSlice, type EventsSlice } from "./store/eventsSlice";
import { EventTableDriver, WHOLE_TABLE_MAX } from "./EventTableDriver";

const world = { axes: [{ name: "t", type: "TIME", order: 0 }] };
const raw = (over: Record<string, unknown> = {}) => ({
  __typename: "EventsLayer",
  id: "ev",
  placement: "PLACED",
  asAffine: { matrix: [[1, 0]], inputAxes: ["t"], outputAxes: ["t"], total: true },
  tableDataset: {
    id: "tbl",
    name: "trials",
    store: { id: "s1" },
    coordinateSystem: world,
    columns: [
      { name: "t", role: "COORDINATE", axisType: "TIME" },
      { name: "kind", role: "LABEL" },
    ],
  },
  labelColumn: "kind",
  colorBys: [],
  filterBys: [],
  activeColorBy: null,
  activeFilterBys: [],
  ...over,
});

const settle = () => new Promise((r) => setTimeout(r, 0));

const setup = (rows: number, fragment = raw()) => {
  const layer = normalizeEventsLayer(fragment as unknown as EventsLayerLike, world);
  const experimentApi = createExperimentStore({
    experimentId: "e",
    world,
    annotatable: true,
    layers: [layer],
    rawLayers: { ev: fragment } as never,
    timeOrigin: 0,
    worldSpan: { start: 0, end: 100 },
  });
  const rangeApi = createRangeStore({ worldSpan: { start: 0, end: 100 }, minWidth: 1 });
  const viewerApi = createViewerStore([createEventsSlice, createPickerSlice]) as unknown as StoreApi<
    ViewerState & EventsSlice & PickerSlice
  >;
  viewerApi.getState().setViewportPx({ width: 1000, height: 100 });
  const engine = {
    readAcross: vi.fn(async () => [{ n: rows }]),
    readColumnsTyped: vi.fn(async () => ({
      __t: Float64Array.from([10, 20, 30]),
      __label: ["cue", "go", "reward"],
      __p_f0: Float64Array.from([1, 0, 1]),
    })),
  };
  const driver = new EventTableDriver(layer, {
    experimentApi,
    rangeApi,
    viewerApi,
    engine: () => engine as never,
    pickers: () => null,
  });
  return { experimentApi, rangeApi, viewerApi, engine, driver };
};

describe("EventTableDriver", () => {
  it("reads a small table whole, publishes the draw, labels, readout and extent", async () => {
    const { experimentApi, viewerApi, engine } = setup(3);
    await settle();
    const viewer = viewerApi.getState();
    expect(engine.readColumnsTyped).toHaveBeenCalledTimes(1);
    expect(Array.from(viewer.eventDraws.ev.instants)).toEqual([10, 20, 30]);
    expect(viewer.readouts.ev).toMatchObject({ count: 3, total: 3, loading: false });
    expect(viewer.markLabels.ev.map((l) => l.text)).toEqual(["cue", "go", "reward"]);
    expect(experimentApi.getState().reportedSpans.ev).toEqual({ start: 10, end: 30 });
  });

  it("reads a big table per committed window", async () => {
    const { rangeApi, engine } = setup(WHOLE_TABLE_MAX + 1);
    await settle();
    expect(engine.readColumnsTyped).toHaveBeenCalledTimes(1);
    rangeApi.getState().jumpTo({ start: 10, end: 20 });
    await settle();
    expect(engine.readColumnsTyped).toHaveBeenCalledTimes(2);
  });

  it("counts what the filters KEEP, from a column riding on the read", async () => {
    const { viewerApi } = setup(
      3,
      raw({ filterBys: [{ table: "tbl", column: "flag", joinPath: [], min: 1 }], activeFilterBys: [0] }),
    );
    await settle();
    expect(viewerApi.getState().readouts.ev.count).toBe(2);
  });

  it("withdraws its draw and extent on dispose", async () => {
    const { experimentApi, viewerApi, driver } = setup(3);
    await settle();
    driver.dispose();
    expect(viewerApi.getState().eventDraws.ev).toBeUndefined();
    expect(experimentApi.getState().reportedSpans.ev).toBeUndefined();
  });
});

describe("EventTableDriver on commit", () => {
  it("reuses the draw arrays when only the window moved", async () => {
    const { rangeApi, viewerApi } = setup(3);
    await settle();
    const before = viewerApi.getState().eventDraws.ev;
    rangeApi.getState().jumpTo({ start: 5, end: 50 });
    const after = viewerApi.getState().eventDraws.ev;
    expect(after).not.toBe(before);
    expect(after.instants).toBe(before.instants);
    expect(after.intervalQuads).toBe(before.intervalQuads);
  });
});
