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

  it("does not guess a view of no stated kind into someone else's row", () => {
    const layout = stackLayout(
      [
        view("a", { valueDimension: null, valueUnit: null }),
        view("b", { valueDimension: null, valueUnit: null }),
      ],
      "SHARED",
    );
    expect(layout.rowCount).toBe(2);
  });

  it("falls back to the UNIT when the dimension is unknown", () => {
    // Same unit is a stronger test than same dimension, so this is not a guess —
    // and a trace that took its unit from an anchor has no dimension at all.
    const layout = stackLayout(
      [view("a", { valueDimension: null }), view("b", { valueDimension: null })],
      "SHARED",
    );
    expect(layout.rowCount).toBe(1);
    expect(layout.bands[bandKey("a", 0)].climIds).toEqual(["a", "b"]);
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

  it("overlays traces that measure the same thing, and only those", () => {
    const layout = stackLayout(
      [
        trace("a"),
        trace("b", { valueDimension: "current", valueUnit: "pA" }),
        trace("c"),
      ],
      "OVERLAY",
    );
    expect(layout.rowCount).toBe(2);
    expect(layout.rows.map((row) => row.layerIds)).toEqual([["a", "c"], ["b"]]);
  });

  it("keeps each layer on its OWN scale — the difference from SHARED", () => {
    const layout = stackLayout([trace("a"), trace("b")], "OVERLAY");
    expect(layout.bands[bandKey("a", 0)].climIds).toEqual(["a"]);
    expect(layout.bands[bandKey("b", 0)].climIds).toEqual(["b"]);
  });

  it("gives every channel of every member the whole row", () => {
    const layout = stackLayout([trace("a"), trace("c", { channelCount: 3 })], "OVERLAY");
    expect(layout.rowCount).toBe(1);
    expect(layout.bands[bandKey("c", 2)].top).toBeCloseTo(layout.bands[bandKey("a", 0)].top, 9);
    expect(layout.bands[bandKey("c", 2)].bottom).toBeCloseTo(
      layout.bands[bandKey("a", 0)].bottom,
      9,
    );
  });

  it("joins a dimensionless trace to its unit's group", () => {
    // "b" has no dimension, but "a" shows that mV means voltage.
    const layout = stackLayout([trace("a"), trace("b", { valueDimension: null })], "OVERLAY");
    expect(layout.rowCount).toBe(1);
    expect(layout.rows[0].layerIds).toEqual(["a", "b"]);
  });

  it("joins two dimensionless traces that at least share a unit", () => {
    const layout = stackLayout(
      [trace("a", { valueDimension: null }), trace("b", { valueDimension: null })],
      "OVERLAY",
    );
    expect(layout.rowCount).toBe(1);
  });

  it("does not join traces that only share a unit with nothing to say what it is", () => {
    // Different units, no dimension anywhere: nothing licenses putting them together.
    const layout = stackLayout(
      [
        trace("a", { valueDimension: null }),
        trace("b", { valueDimension: null, valueUnit: "pA" }),
      ],
      "OVERLAY",
    );
    expect(layout.rowCount).toBe(2);
  });

  it("gives a trace of no stated kind a row of its own", () => {
    const layout = stackLayout(
      [trace("a"), trace("b", { valueDimension: null, valueUnit: null })],
      "OVERLAY",
    );
    expect(layout.rowCount).toBe(2);
    expect(layout.rows.map((row) => row.layerIds)).toEqual([["a"], ["b"]]);
  });

  it("names the unit only when every line in the group shares it", () => {
    expect(stackLayout([trace("a"), trace("b")], "OVERLAY").rows[0].unit).toBe("mV");
    // Same dimension, different unit: the legend has to say each.
    const mixed = stackLayout([trace("a"), trace("b", { valueUnit: "V" })], "OVERLAY");
    expect(mixed.rowCount).toBe(1);
    expect(mixed.rows[0].unit).toBeNull();
  });

  it("flags a group as an overlay only when it holds more than one layer", () => {
    const layout = stackLayout(
      [trace("a"), trace("b"), trace("c", { valueDimension: "current", valueUnit: "pA" })],
      "OVERLAY",
    );
    // A lone layer is an ordinary row, not a one-entry legend.
    expect(layout.rows[0].overlay).toBe(true);
    expect(layout.rows[1].overlay).toBeUndefined();
  });

  it("gives rasters and event tables rows of their own, below every plot", () => {
    const layout = stackLayout(
      [
        view("spikes", { overlayable: false, valueUnit: null, valueDimension: null }),
        trace("a"),
        trace("b", { valueDimension: "current", valueUnit: "pA" }),
      ],
      "OVERLAY",
    );
    expect(layout.rowCount).toBe(3);
    expect(layout.rows.map((row) => row.layerIds)).toEqual([["a"], ["b"], ["spikes"]]);
  });

  it("lays out the rest cleanly when there is no trace at all", () => {
    const layout = stackLayout(
      [view("spikes", { overlayable: false, valueUnit: null, valueDimension: null })],
      "OVERLAY",
    );
    expect(layout.rowCount).toBe(1);
    expect(layout.rows[0].layerIds).toEqual(["spikes"]);
    expect(layout.bands[bandKey("spikes", 0)]).toBeDefined();
  });
});
