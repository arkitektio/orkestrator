// @vitest-environment jsdom
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { createStore } from "zustand/vanilla";
import type { LayoutMode, ViewerStoreApi } from "@/core/data/plot/stores/viewerStore";
import type { ChartLayoutValue } from "../platform/model/chartStructure";
import type { ChartStoreApi } from "../platform/stores/chartStore";
import { ChartLayoutSync } from "./ChartLayoutSync";

afterEach(cleanup);

/** The two fields the sync touches; the rest of each store is not its business. */
const stores = (server: ChartLayoutValue) => {
  const chart = createStore<{ layout: ChartLayoutValue; other: number }>(() => ({ layout: server, other: 0 }));
  const viewer = createStore<{ layoutMode: LayoutMode; setLayoutMode: (m: LayoutMode) => void }>((set) => ({
    layoutMode: "SHARED",
    setLayoutMode: (layoutMode) => set({ layoutMode }),
  }));
  render(
    <ChartLayoutSync chart={chart as unknown as ChartStoreApi} viewer={viewer as unknown as ViewerStoreApi} />,
  );
  return { chart, viewer };
};

describe("ChartLayoutSync", () => {
  it("opens the chart in its own layout", () => {
    const { viewer } = stores("STACKED");
    expect(viewer.getState().layoutMode).toBe("STACKED");
  });

  it("leaves a local toggle alone when a refetch carries the same server layout", () => {
    const { chart, viewer } = stores("STACKED");
    viewer.getState().setLayoutMode("SHARED"); // a toggle whose write is in flight
    chart.setState({ other: 1 }); // a layer edit refetched the chart
    chart.setState({ layout: "STACKED" }); // same value: no change
    expect(viewer.getState().layoutMode).toBe("SHARED");
  });

  it("applies the server's layout when it changes", () => {
    const { chart, viewer } = stores("STACKED");
    chart.setState({ layout: "OVERLAY" }); // another window switched it
    expect(viewer.getState().layoutMode).toBe("OVERLAY");
  });
});
