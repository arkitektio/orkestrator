// @vitest-environment jsdom
// (networkStyling reaches `paletteRowFor` → colormaps.tsx → app modules that touch `window`)
import { describe, expect, it } from "vitest";
import type { NetworkValueAppearance } from "./konnektionManager";
import {
  composeNetworkAppearance,
  networkAppearanceKeyOf,
  networkDataKeyOf,
  type NetworkPickerColorBy,
  type NetworkPickerFilterBy,
} from "./networkStyling";

const colorBy = (over: Partial<NetworkPickerColorBy> = {}): NetworkPickerColorBy => ({
  kind: "COLUMN",
  table: "t1",
  column: "intensity",
  colormap: "VIRIDIS",
  min: 0,
  max: 10,
  ...over,
});

const rule = (over: Partial<NetworkPickerFilterBy> = {}): NetworkPickerFilterBy => ({
  kind: "COLUMN",
  table: "t1",
  column: "area",
  min: 1,
  max: 5,
  ...over,
});

describe("networkDataKeyOf", () => {
  it("is stable under appearance-only edits of the colouring", () => {
    const base = networkDataKeyOf(colorBy(), [rule()]);
    // Another CONTINUOUS colormap: same rank-vs-measure class, same buffers.
    expect(networkDataKeyOf(colorBy({ colormap: "INFERNO" }), [rule()])).toBe(base);
    expect(networkDataKeyOf(colorBy({ min: -3 }), [rule()])).toBe(base);
    expect(networkDataKeyOf(colorBy({ max: 99 }), [rule()])).toBe(base);
  });

  it("changes when the colormap crosses the qualitative/measure class line", () => {
    const base = networkDataKeyOf(colorBy(), []);
    // HUES is qualitative: the build's rank branch writes RANKS into the
    // buffers, so this is a data change, not an appearance one.
    expect(networkDataKeyOf(colorBy({ colormap: "HUES" }), [])).not.toBe(base);
    // ...but qualitative -> qualitative is appearance again.
    expect(networkDataKeyOf(colorBy({ colormap: "HUES" }), [])).toBe(
      networkDataKeyOf(colorBy({ colormap: "VIVID" }), []),
    );
  });

  it("changes on anything that changes what is read or packed", () => {
    const base = networkDataKeyOf(colorBy(), [rule()]);
    expect(networkDataKeyOf(colorBy({ column: "other" }), [rule()])).not.toBe(base);
    expect(networkDataKeyOf(colorBy({ table: "t2" }), [rule()])).not.toBe(base);
    expect(networkDataKeyOf(colorBy({ target: "EDGE" }), [rule()])).not.toBe(base);
    expect(
      networkDataKeyOf(colorBy({ joinPath: [{ table: "t2", column: "fk" }] }), [rule()]),
    ).not.toBe(base);
    expect(networkDataKeyOf(colorBy({ kind: "GRAPH", attribute: "strahler" }), [rule()])).not.toBe(
      base,
    );
    expect(networkDataKeyOf(null, [rule()])).not.toBe(base);
  });

  it("keeps rules IN FULL: their bounds are pack-time visibility bits", () => {
    const base = networkDataKeyOf(colorBy(), [rule()]);
    expect(networkDataKeyOf(colorBy(), [rule({ min: 2 })])).not.toBe(base);
    expect(networkDataKeyOf(colorBy(), [rule({ max: 6 })])).not.toBe(base);
    expect(networkDataKeyOf(colorBy(), [rule({ exclude: true })])).not.toBe(base);
    expect(networkDataKeyOf(colorBy(), [rule({ values: ["a"] })])).not.toBe(base);
    expect(networkDataKeyOf(colorBy(), [rule({ target: "EDGE" })])).not.toBe(base);
    expect(networkDataKeyOf(colorBy(), [rule(), rule({ column: "b" })])).not.toBe(base);
    expect(networkDataKeyOf(colorBy(), [])).not.toBe(base);
  });
});

describe("networkAppearanceKeyOf", () => {
  it("tracks exactly colormap and clims", () => {
    const base = networkAppearanceKeyOf(colorBy());
    expect(networkAppearanceKeyOf(colorBy({ colormap: "INFERNO" }))).not.toBe(base);
    expect(networkAppearanceKeyOf(colorBy({ min: -1 }))).not.toBe(base);
    expect(networkAppearanceKeyOf(colorBy({ max: 11 }))).not.toBe(base);
    // A data edit leaves the appearance key alone — the data effect owns it.
    expect(networkAppearanceKeyOf(colorBy({ column: "other" }))).toBe(base);
    expect(networkAppearanceKeyOf(null)).not.toBe(base);
  });
});

describe("composeNetworkAppearance", () => {
  const dataDerived: NetworkValueAppearance = {
    palette: null,
    climMin: 0,
    climMax: 10,
    colorize: true,
    applyToGlyphs: false,
    valueSource: "edge",
  };

  it("keeps the data-derived facts and re-derives palette and clims", () => {
    const next = composeNetworkAppearance(dataDerived, false, colorBy({ min: -5, max: 5 }));
    expect(next).not.toBe(dataDerived);
    expect(next.colorize).toBe(true);
    expect(next.applyToGlyphs).toBe(false);
    expect(next.valueSource).toBe("edge");
    expect(next.climMin).toBe(-5);
    expect(next.climMax).toBe(5);
    expect(next.palette).not.toBeNull();
  });

  it("null clim ends stay null — the manager stretches them over the packed range", () => {
    const next = composeNetworkAppearance(dataDerived, false, colorBy({ min: null, max: null }));
    expect(next.climMin).toBeNull();
    expect(next.climMax).toBeNull();
  });

  it("a rank colouring keeps the pinned 0..256 window regardless of the entry's clims", () => {
    const next = composeNetworkAppearance(dataDerived, true, colorBy({ min: -5, max: 5, colormap: "HUES" }));
    expect(next.climMin).toBe(0);
    expect(next.climMax).toBe(256);
  });

  it("a non-colorizing appearance has nothing to recompose", () => {
    const identity: NetworkValueAppearance = { ...dataDerived, colorize: false };
    expect(composeNetworkAppearance(identity, false, colorBy())).toBe(identity);
    expect(composeNetworkAppearance(dataDerived, false, null)).toBe(dataDerived);
  });
});
