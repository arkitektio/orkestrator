import { describe, expect, it } from "vitest";
import {
  effectiveDataLayerId,
  effectiveHitLayerId,
  effectiveInfoLayerIds,
  layerAnswersProbe,
  probeAfterPinChange,
} from "./probeTargeting";

const layers = [
  { id: "a", visible: true },
  { id: "b", visible: true },
  { id: "c", visible: true },
];

const pins = (overrides: Partial<{
  dataLayerId: string | null;
  probeLayerId: string | null;
  pickLayerId: string | null;
}> = {}) => ({ dataLayerId: null, probeLayerId: null, pickLayerId: null, ...overrides });

describe("effectiveDataLayerId", () => {
  it("defaults to the first visible layer with no pin", () => {
    expect(effectiveDataLayerId(null, layers)).toBe("a");
    expect(
      effectiveDataLayerId(null, [
        { id: "a", visible: false },
        { id: "b", visible: true },
      ]),
    ).toBe("b");
  });

  it("treats an undefined visible as visible", () => {
    expect(effectiveDataLayerId(null, [{ id: "a" }])).toBe("a");
  });

  // A task reads the lens, not the pixels on screen.
  it("keeps a pin on a hidden layer", () => {
    expect(
      effectiveDataLayerId("b", [
        { id: "a", visible: true },
        { id: "b", visible: false },
      ]),
    ).toBe("b");
  });

  it("falls back to the first visible layer when the pin names a gone one", () => {
    expect(effectiveDataLayerId("gone", layers)).toBe("a");
  });

  it("is null with no layer to name", () => {
    expect(effectiveDataLayerId(null, [])).toBeNull();
    expect(effectiveDataLayerId(null, [{ id: "a", visible: false }])).toBeNull();
  });
});

describe("effectiveInfoLayerIds", () => {
  it("defaults to the data layer alone", () => {
    expect(effectiveInfoLayerIds({ dataLayerId: null, infoLayerIds: null }, layers)).toEqual(["a"]);
    expect(effectiveInfoLayerIds({ dataLayerId: "c", infoLayerIds: null }, layers)).toEqual(["c"]);
  });

  it("keeps a chosen set in store order", () => {
    expect(
      effectiveInfoLayerIds({ dataLayerId: "a", infoLayerIds: ["c", "a"] }, layers),
    ).toEqual(["a", "c"]);
  });

  it("drops hidden and gone layers — nothing resident to read", () => {
    const shown = [
      { id: "a", visible: true },
      { id: "b", visible: false },
    ];
    expect(effectiveInfoLayerIds({ dataLayerId: null, infoLayerIds: ["b", "gone", "a"] }, shown)).toEqual(["a"]);
    expect(effectiveInfoLayerIds({ dataLayerId: "b", infoLayerIds: null }, shown)).toEqual([]);
  });

  it("an empty set reads nothing", () => {
    expect(effectiveInfoLayerIds({ dataLayerId: null, infoLayerIds: [] }, layers)).toEqual([]);
  });
});

describe("effectiveHitLayerId", () => {
  it("follows the data layer by default", () => {
    expect(effectiveHitLayerId(pins(), layers, true)).toBe("a");
    expect(effectiveHitLayerId(pins({ dataLayerId: "b" }), layers, true)).toBe("b");
  });

  it("lets the probe pin win in 3D only", () => {
    expect(effectiveHitLayerId(pins({ dataLayerId: "a", probeLayerId: "c" }), layers, true)).toBe("c");
    expect(effectiveHitLayerId(pins({ dataLayerId: "a", probeLayerId: "c" }), layers, false)).toBe("a");
  });

  it("lets a transient pick win in both views", () => {
    const p = pins({ dataLayerId: "a", probeLayerId: "c", pickLayerId: "b" });
    expect(effectiveHitLayerId(p, layers, true)).toBe("b");
    expect(effectiveHitLayerId(p, layers, false)).toBe("b");
  });

  // A hidden layer draws no mesh, so it can answer nothing.
  it("skips hidden pins and a hidden data layer", () => {
    const shown = [
      { id: "a", visible: true },
      { id: "b", visible: false },
    ];
    expect(effectiveHitLayerId(pins({ probeLayerId: "b" }), shown, true)).toBe("a");
    expect(effectiveHitLayerId(pins({ pickLayerId: "b" }), shown, true)).toBe("a");
    expect(effectiveHitLayerId(pins({ dataLayerId: "b" }), shown, true)).toBe("a");
  });

  it("falls back past gone pins", () => {
    expect(effectiveHitLayerId(pins({ probeLayerId: "gone", dataLayerId: "gone" }), layers, true)).toBe("a");
  });

  it("is null when every layer is hidden", () => {
    const hidden = [
      { id: "a", visible: false },
      { id: "b", visible: false },
    ];
    expect(effectiveHitLayerId(pins(), hidden, true)).toBeNull();
    expect(effectiveHitLayerId(pins({ probeLayerId: "a", dataLayerId: "a" }), hidden, true)).toBeNull();
    expect(effectiveHitLayerId(pins(), [], true)).toBeNull();
  });
});

describe("layerAnswersProbe", () => {
  it("lets only the target layer answer", () => {
    expect(layerAnswersProbe("a", "a")).toBe(true);
    expect(layerAnswersProbe("a", "b")).toBe(false);
  });

  // Null target = no layer can answer (everything hidden). Never "everyone":
  // that was the old front-most-wins ambiguity this module exists to remove.
  it("lets no layer answer when there is no target", () => {
    expect(layerAnswersProbe(null, "a")).toBe(false);
    expect(layerAnswersProbe(null, "b")).toBe(false);
  });
});

describe("probeAfterPinChange", () => {
  const probe = { layerId: "a" };

  it("drops a reading the new pin would not have produced", () => {
    expect(probeAfterPinChange(probe, "b")).toBeNull();
  });

  it("keeps a reading the new pin agrees with", () => {
    expect(probeAfterPinChange(probe, "a")).toBe(probe);
  });

  // Resetting to the default keeps the reading here: without the layer list
  // this helper cannot know the default target — the probe panel's
  // reconciliation drops it if it mismatches the derived target.
  it("keeps the reading when the pin is cleared", () => {
    expect(probeAfterPinChange(probe, null)).toBe(probe);
  });

  it("has nothing to drop with no probe", () => {
    expect(probeAfterPinChange(null, "a")).toBeNull();
    expect(probeAfterPinChange(null, null)).toBeNull();
  });
});
