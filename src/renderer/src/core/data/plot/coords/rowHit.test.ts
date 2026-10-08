import { describe, expect, it } from "vitest";
import { parseBandKey, rowHitAt } from "./rowHit";
import { valueToY, yToValue } from "./rowMap";

const bands = {
  "a:0": { bottom: -1, top: 0 },
  "a:1": { bottom: -2, top: -1 },
  "layer:with:colons:0": { bottom: -3, top: -2 },
  "spikes:0": { bottom: -4, top: -3 },
};
const clim = { lo: -10, hi: 10 };

describe("rowHitAt", () => {
  it("finds the channel band under a y", () => {
    const hit = rowHitAt(-1.5, bands, () => clim, ["a"]);
    expect(hit).toMatchObject({ layerId: "a", channel: 1 });
  });

  it("only considers candidate layers", () => {
    expect(rowHitAt(-3.5, bands, () => clim, ["a"])).toBeNull();
  });

  it("parses layer ids that contain colons", () => {
    expect(rowHitAt(-2.5, bands, () => clim, ["layer:with:colons"])).toMatchObject({
      layerId: "layer:with:colons",
      channel: 0,
    });
  });

  it("prefers the first candidate when bands overlay (SHARED mode)", () => {
    const shared = { "x:0": { bottom: -1, top: 0 }, "y:0": { bottom: -1, top: 0 } };
    expect(rowHitAt(-0.5, shared, () => clim, ["y", "x"])?.layerId).toBe("y");
  });

  it("skips a band whose clim is not seeded", () => {
    expect(rowHitAt(-0.5, bands, () => null, ["a"])).toBeNull();
  });

  it("parseBandKey rejects garbage", () => {
    expect(parseBandKey("nochannel")).toBeNull();
    expect(parseBandKey("a:x")).toBeNull();
  });
});

describe("yToValue", () => {
  it("inverts valueToY", () => {
    const band = { bottom: -3, top: -2 };
    const { scale, offset } = valueToY(band, clim);
    for (const v of [-10, -3.25, 0, 7]) {
      expect(yToValue(scale * v + offset, band, clim)).toBeCloseTo(v, 9);
    }
  });
});
