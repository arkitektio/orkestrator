import { describe, expect, it, vi } from "vitest";
import type { StoreApi } from "zustand/vanilla";
import { normalizeEventsLayer, type EventsLayerLike } from "../platform/model/layerModel";
import { createExperimentStore } from "../platform/stores/experimentStore";
import { createRangeStore } from "../platform/stores/rangeStore";
import { createViewerStore, type ViewerState } from "../platform/stores/viewerStore";
import { createExperimentSystem } from "./experimentSystem";
import { FEATURE_SLICES } from "./featureSlices";

const world = { axes: [{ name: "t", type: "TIME", order: 0 }] };
const fragment = {
  __typename: "EventsLayer",
  id: "ev",
  placement: "PLACED",
  asAffine: { matrix: [[1, 0]], inputAxes: ["t"], outputAxes: ["t"], total: true },
  tableDataset: {
    id: "tbl",
    name: "trials",
    store: { id: "s1" },
    coordinateSystem: world,
    columns: [{ name: "t", role: "COORDINATE", axisType: "TIME" }],
  },
  colorBys: [],
  filterBys: [],
  activeColorBy: null,
  activeFilterBys: [],
};

const settle = () => new Promise((r) => setTimeout(r, 0));

describe("createExperimentSystem", () => {
  it("does not move the committed window while it is being disposed", async () => {
    // The world is known ONLY from what the event table reports, so its driver
    // withdrawing that report on dispose would shrink it — and a range write at
    // teardown is a navigation back onto the experiment (TimeRangeUrlSync).
    const layer = normalizeEventsLayer(fragment as unknown as EventsLayerLike, world);
    const experiment = createExperimentStore({
      experimentId: "e",
      world,
      annotatable: true,
      layers: [layer],
      rawLayers: { ev: fragment } as never,
      timeOrigin: 0,
      worldSpan: null,
    });
    const range = createRangeStore({ worldSpan: null, minWidth: 0 });
    const viewer = createViewerStore(FEATURE_SLICES) as unknown as StoreApi<ViewerState>;
    viewer.getState().setViewportPx({ width: 1000, height: 100 });
    const engine = {
      warmUp: vi.fn(),
      readAcross: vi.fn(async () => [{ n: 3 }]),
      readColumnsTyped: vi.fn(async () => ({ __t: Float64Array.from([10, 20, 30]) })),
    };

    const system = createExperimentSystem(
      { experiment, range, viewer },
      {
        readWindow: vi.fn() as never,
        engine: () => engine as never,
        sparse: () => null,
        fetchTable: async () => null,
      },
    );
    await settle();
    expect(experiment.getState().worldSpan).toEqual({ start: 10, end: 30 });

    const committed = range.getState().committedRange;
    const writes = vi.fn();
    range.subscribe(writes);
    system.dispose();

    expect(writes).not.toHaveBeenCalled();
    expect(range.getState().committedRange).toBe(committed);
  });
});
