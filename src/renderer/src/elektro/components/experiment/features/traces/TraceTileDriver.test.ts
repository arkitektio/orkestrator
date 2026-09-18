import { describe, expect, it, vi } from "vitest";
import type { StoreApi } from "zustand/vanilla";
import { normalizeTraceLayer, type TraceLayerLike } from "../../platform/model/layerModel";
import { createExperimentStore } from "../../platform/stores/experimentStore";
import { createRangeStore } from "../../platform/stores/rangeStore";
import { createViewerStore, type ViewerState } from "../../platform/stores/viewerStore";
import { createTraceSlice, type TraceSlice } from "./store/traceSlice";
import { TraceTileDriver, type ReadWindow } from "./TraceTileDriver";

const TIME = { name: "t", type: "TIME", order: 0 };
const world = { axes: [TIME] };

/** 10 000 samples at 0.1 per sample, one level, one 4096-sample-ish chunk per tile. */
const traceLayer = (over: Partial<TraceLayerLike> = {}): TraceLayerLike => ({
  __typename: "TraceLayer",
  id: "tr",
  placement: "PLACED",
  asAffine: { matrix: [[0.1, 0]], inputAxes: ["t"], outputAxes: ["t"], total: true },
  lens: {
    axisNames: ["t"],
    shape: [10_000],
    slices: [],
    coordinateSystem: { axes: [TIME] },
    activeAnchors: [],
    dataset: {
      name: "d",
      axisNames: ["t"],
      shape: [10_000],
      intrinsicSystem: { axes: [TIME] },
      dataArrays: [{ level: 0, shape: [10_000], store: { id: "L0" } }],
    },
  },
  ...over,
});

/** A reader whose value at sample i is i; resolves when `flush` is called. */
const deferredReader = () => {
  const pending: (() => void)[] = [];
  const read = vi.fn<ReadWindow>((_store, ranges, opts) => {
    const r = ranges[0]!;
    return new Promise((resolve, reject) => {
      opts.signal?.addEventListener("abort", () => reject(new Error("aborted")));
      pending.push(() => {
        const n = r.stop - r.start;
        resolve({ shape: [n], strides: [1], data: Float32Array.from({ length: n }, (_, i) => r.start + i) });
      });
    });
  });
  const flush = async () => {
    pending.splice(0).forEach((f) => f());
    await new Promise((r) => setTimeout(r, 0));
  };
  return { read, flush };
};

const setup = () => {
  const layer = normalizeTraceLayer(traceLayer(), world);
  const experimentApi = createExperimentStore({
    experimentId: "e",
    world,
    annotatable: true,
    layers: [layer],
    rawLayers: {},
    timeOrigin: 0,
    worldSpan: { start: 0, end: 1000 },
  });
  const rangeApi = createRangeStore({ worldSpan: { start: 0, end: 1000 }, minWidth: 1 });
  const viewerApi = createViewerStore([createTraceSlice]) as unknown as StoreApi<ViewerState & TraceSlice>;
  viewerApi.getState().setViewportPx({ width: 500, height: 100 });
  const reader = deferredReader();
  const driver = new TraceTileDriver(layer, {
    experimentApi,
    rangeApi,
    viewerApi,
    readWindow: reader.read,
    // A "frame" is a microtask: publish runs right after the scheduling call returns.
    raf: (cb) => {
      queueMicrotask(cb);
      return 1;
    },
    caf: () => undefined,
  });
  return { layer, rangeApi, viewerApi, reader, driver };
};

describe("TraceTileDriver", () => {
  it("reads the planned tiles and publishes packed lines, stats, probe and scale", async () => {
    const { viewerApi, reader } = setup();
    expect(reader.read).toHaveBeenCalled();
    await reader.flush();
    const state = viewerApi.getState();
    expect(state.packed.tr.channels[0].segmentCount).toBeGreaterThan(0);
    expect(state.stats.tr.loading).toBe(false);
    expect(state.stats.tr.coverage).toBeCloseTo(1, 5);
    expect(state.probeSources.get("tr")).toBeDefined();
    expect(state.clims.tr).toBeDefined();
  });

  it("replans on the committed window only, aborting what it no longer wants", async () => {
    const { rangeApi, reader } = setup();
    const before = reader.read.mock.calls.length;
    rangeApi.getState().setLiveRange({ start: 0, end: 10 });
    expect(reader.read.mock.calls.length).toBe(before);
    rangeApi.getState().commitRange();
    // Same single-level tiles cover the new window: nothing new to read.
    expect(reader.read.mock.calls.length).toBe(before);
  });

  it("withdraws its packed lines on dispose and never publishes after", async () => {
    const { viewerApi, reader, driver } = setup();
    driver.dispose();
    await reader.flush();
    expect(viewerApi.getState().packed.tr).toBeUndefined();
  });

  it("applies the persisted clim as the scale before any tile lands", async () => {
    const layer = normalizeTraceLayer(traceLayer({ climMin: -1, climMax: 1 }), world);
    const { viewerApi, driver } = setup();
    driver.update(layer);
    expect(viewerApi.getState().clims.tr).toEqual({ lo: -1, hi: 1 });
  });
});
