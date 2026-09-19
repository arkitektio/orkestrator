import { describe, expect, it } from "vitest";
import { ROW_PADDING, stackLayout, type StackableLayer } from "./stackLayout";
import { valueToY } from "../../platform/coords/rowMap";
import { bandKey, effectiveClim } from "../../platform/stores/viewerStore";

const view = (id: string, extra: Partial<StackableLayer> = {}): StackableLayer => ({
  id,
  label: `v${id}`,
  color: "red",
  valueUnit: "mV",
  valueDimension: "voltage",
  channelCount: 1,
  ...extra,
});

describe("stackLayout STACKED", () => {
  it("gives each view its own row, top down", () => {
    const layout = stackLayout([view("a"), view("b")], "STACKED");
    expect(layout.rowCount).toBe(2);
    const a = layout.bands[bandKey("a", 0)];
    const b = layout.bands[bandKey("b", 0)];
    // Row 0 sits above row 1.
    expect(a.bottom).toBeGreaterThan(b.top);
    // Padding keeps rows from touching.
    expect(a.top).toBeCloseTo(-ROW_PADDING, 9);
  });

  it("splits a multi-channel view's row into sub-bands", () => {
    const layout = stackLayout([view("a", { channelCount: 4 })], "STACKED");
    const bands = [0, 1, 2, 3].map((c) => layout.bands[bandKey("a", c)]);
    for (let i = 1; i < bands.length; i++) {
      expect(bands[i].top).toBeLessThanOrEqual(bands[i - 1].bottom + 1e-12);
    }
    // All four stay inside row 0.
    expect(bands[3].bottom).toBeGreaterThanOrEqual(-1);
  });

  it("scales every view to its own clim", () => {
    const layout = stackLayout([view("a"), view("b")], "STACKED");
    expect(layout.bands[bandKey("a", 0)].climIds).toEqual(["a"]);
  });
});

describe("stackLayout SHARED", () => {
  it("overlays views of the same dimension in one row on ONE scale", () => {
    const layout = stackLayout(
      [view("a"), view("b"), view("c", { valueDimension: "current", valueUnit: "pA" })],
      "SHARED",
    );
    expect(layout.rowCount).toBe(2);
    expect(layout.bands[bandKey("a", 0)]).toEqual(layout.bands[bandKey("b", 0)]);
    expect(layout.bands[bandKey("a", 0)].climIds).toEqual(["a", "b"]);
  });

  it("does not guess a dimensionless view into someone else's row", () => {
    const layout = stackLayout(
      [view("a", { valueDimension: null }), view("b", { valueDimension: null })],
      "SHARED",
    );
    expect(layout.rowCount).toBe(2);
  });

  it("makes shared amplitudes comparable via the union clim", () => {
    const layout = stackLayout([view("a"), view("b")], "SHARED");
    const band = layout.bands[bandKey("a", 0)];
    const clim = effectiveClim({ a: { lo: -70, hi: 10 }, b: { lo: -80, hi: 40 } }, band);
    expect(clim).toEqual({ lo: -80, hi: 40 });
  });
});

describe("valueToY", () => {
  it("maps the clim onto the band exactly", () => {
    const band = { bottom: -0.9, top: -0.1 };
    const { scale, offset } = valueToY(band, { lo: -80, hi: 40 });
    expect(scale * -80 + offset).toBeCloseTo(-0.9, 12);
    expect(scale * 40 + offset).toBeCloseTo(-0.1, 12);
  });
});

describe("effectiveClim", () => {
  it("is null until something is seeded, so nothing is drawn at a guessed scale", () => {
    expect(effectiveClim({}, { climIds: ["a"] })).toBeNull();
  });

  it("pads a flat range so it can be drawn", () => {
    const clim = effectiveClim({ a: { lo: 5, hi: 5 } }, { climIds: ["a"] })!;
    expect(clim.hi).toBeGreaterThan(clim.lo);
  });
});

describe("stackLayout OVERLAY", () => {
  const trace = (id: string, extra: Partial<StackableLayer> = {}) => view(id, { overlayable: true, ...extra });

  it("puts every trace in one row, whatever its dimension", () => {
    const layout = stackLayout(
      [trace("a"), trace("b", { valueDimension: "current", valueUnit: "pA" }), trace("c", { channelCount: 3 })],
      "OVERLAY",
    );
    expect(layout.rowCount).toBe(1);
    expect(layout.rows[0]).toMatchObject({ layerIds: ["a", "b", "c"], overlay: true, unit: null });
    // Every channel fills the whole row.
    expect(layout.bands[bandKey("c", 2)].top).toBeCloseTo(layout.bands[bandKey("a", 0)].top, 9);
    expect(layout.bands[bandKey("c", 2)].bottom).toBeCloseTo(layout.bands[bandKey("a", 0)].bottom, 9);
  });

  it("keeps each layer on its OWN scale", () => {
    const layout = stackLayout([trace("a"), trace("b")], "OVERLAY");
    expect(layout.bands[bandKey("a", 0)].climIds).toEqual(["a"]);
    expect(layout.bands[bandKey("b", 0)].climIds).toEqual(["b"]);
  });

  it("names the unit only when every line shares it", () => {
    expect(stackLayout([trace("a"), trace("b")], "OVERLAY").rows[0].unit).toBe("mV");
  });

  it("gives rasters and event tables rows of their own, below the plot", () => {
    const layout = stackLayout(
      [view("spikes", { overlayable: false, valueUnit: null, valueDimension: null }), trace("a")],
      "OVERLAY",
    );
    expect(layout.rowCount).toBe(2);
    expect(layout.rows.map((row) => row.layerIds)).toEqual([["a"], ["spikes"]]);
  });
});
