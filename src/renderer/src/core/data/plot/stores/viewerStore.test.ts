import { describe, expect, it } from "vitest";
import { createViewerStore, type ViewerSliceOf } from "./viewerStore";

const stats = (over: Record<string, unknown> = {}) => ({
  levelIndex: 0,
  level: 0,
  levelCount: 1,
  centerLevelIndex: 0,
  targetLevelIndex: 0,
  centerFactor: 1,
  tilesPlanned: 1,
  tilesResident: 1,
  coverage: 1,
  residentBytes: 0,
  valueMin: -2,
  valueMax: 3,
  loading: false,
  error: null,
  ...over,
});

describe("viewerStore composition", () => {
  it("composes feature slices into the same store, with the same set", () => {
    type Extra = { extra: number; bumpExtra: () => void };
    const extraSlice: ViewerSliceOf<Extra> = (set) => ({
      extra: 0,
      bumpExtra: () => set((s) => ({ extra: s.extra + 1, rowCount: 7 })),
    });
    const store = createViewerStore([extraSlice]);
    const state = store.getState() as unknown as Extra & { rowCount: number };
    state.bumpExtra();
    expect((store.getState() as unknown as Extra).extra).toBe(1);
    expect(store.getState().rowCount).toBe(7);
  });

  it("keeps the identity of bands that did not move", () => {
    const store = createViewerStore();
    const band = { top: 0, bottom: -1, climIds: ["a"] };
    store.getState().setLayout({ rowCount: 1, rows: [], bands: { "a:0": band } });
    const kept = store.getState().bands["a:0"];
    store.getState().setLayout({ rowCount: 1, rows: [], bands: { "a:0": { ...band, climIds: ["a"] } } });
    expect(store.getState().bands["a:0"]).toBe(kept);
  });

  it("autoscales from the stats and returns what it set", () => {
    const store = createViewerStore();
    store.getState().setStats("a", stats());
    expect(store.getState().autoscale("a")).toEqual({ a: { lo: -2, hi: 3 } });
    expect(store.getState().clims.a).toEqual({ lo: -2, hi: 3 });
  });

  it("tracks a scalar anyLoading across stats and readouts", () => {
    const store = createViewerStore();
    store.getState().setStats("a", stats({ loading: true }));
    expect(store.getState().anyLoading).toBe(true);
    store.getState().patchReadout("b", { loading: true });
    store.getState().setStats("a", stats());
    expect(store.getState().anyLoading).toBe(true);
    store.getState().patchReadout("b", { loading: false });
    expect(store.getState().anyLoading).toBe(false);
  });

  it("clears everything a layer left behind in one write", () => {
    const store = createViewerStore();
    const s = store.getState();
    s.setStats("a", stats({ loading: true }));
    s.patchReadout("a", { count: 3 });
    s.setMarkLabels("a", [{ time: 1, text: "x", lane: 0, laneCount: 1 }]);
    s.setClim("a", { lo: 0, hi: 1 });
    s.publishProbe("a", [{ xs: [0], ys: [1] }]);
    let writes = 0;
    const unsubscribe = store.subscribe(() => writes++);
    store.getState().clearLayer("a");
    unsubscribe();
    const after = store.getState();
    expect(writes).toBe(1);
    expect(after.stats.a).toBeUndefined();
    expect(after.readouts.a).toBeUndefined();
    expect(after.markLabels.a).toBeUndefined();
    expect(after.clims.a).toBeUndefined();
    expect(after.probeSources.has("a")).toBe(false);
    expect(after.anyLoading).toBe(false);
  });

  it("bumps the probe version when what is drawn changes", () => {
    const store = createViewerStore();
    store.getState().publishProbe("a", [{ xs: [0], ys: [1] }]);
    expect(store.getState().probeVersion).toBe(1);
    store.getState().publishProbe("missing", null);
    expect(store.getState().probeVersion).toBe(1);
  });
});
