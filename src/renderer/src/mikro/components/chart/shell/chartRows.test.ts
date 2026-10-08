import { describe, expect, it } from "vitest";
import { stackLayout } from "@/core/data/plot/layout/stackLayout";
import { bandKey, type LayoutMode } from "@/core/data/plot/stores/viewerStore";
import type { ChartLayerState } from "../platform/model/chartLayerModel";
import { rowOf } from "./chartRows";

const layer = (overrides: Partial<ChartLayerState> = {}) =>
  ({
    id: "a",
    kind: "trace",
    label: "Spectra",
    color: "#f00",
    visible: true,
    valueUnit: null,
    rowGroup: "dataset:d1",
    placeability: { drawable: true },
    source: {},
    series: null,
    channelCount: 3,
    channelLabels: ["GFP", "c 1", "DAPI"],
    ...overrides,
  }) as unknown as ChartLayerState;

describe("rowOf", () => {
  it("gives a trace a band per line, in every layout mode", () => {
    const row = rowOf(layer())!;
    expect(row.channelCount).toBe(3);
    for (const mode of ["SHARED", "OVERLAY", "STACKED"] as LayoutMode[]) {
      const { bands } = stackLayout([row], mode);
      // A line with no band is hidden: this is what draws lines 1 and 2.
      expect(Object.keys(bands).sort(), mode).toEqual([0, 1, 2].map((c) => bandKey("a", c)));
    }
  });

  it("names the lines of a stacked row", () => {
    const { rows } = stackLayout([rowOf(layer())!], "STACKED");
    expect(rows[0].channelLabels).toEqual(["GFP", "c 1", "DAPI"]);
  });

  it("gives no row to a trace whose data cannot be read", () => {
    expect(rowOf(layer({ source: null }))).toBeNull();
  });
});
