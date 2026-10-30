import { describe, expect, it } from "vitest";
import {
  effectiveDataLayerId,
  effectiveHitLayerId,
  layerAnswersProbe,
  probeAfterPinChange,
  readableLayerIds,
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

describe("readableLayerIds", () => {
  it("reads every visible layer, in store order", () => {
    expect(readableLayerIds(layers)).toEqual(["a", "b", "c"]);
    expect(readableLayerIds([{ id: "a" }])).toEqual(["a"]);
  });

  it("drops hidden layers — nothing resident to read", () => {
    expect(
      readableLayerIds([
        { id: "a", visible: true },
        { id: "b", visible: false },
      ]),
    ).toEqual(["a"]);
  });
});

describe("effectiveHitLayerId", () => {
  it("follows the data layer by default", () => {
    expect(effectiveHitLayerId(pins(), layers)).toBe("a");
    expect(effectiveHitLayerId(pins({ dataLayerId: "b" }), layers)).toBe("b");
  });

  it("lets the probe pin win over the data layer", () => {
    expect(effectiveHitLayerId(pins({ dataLayerId: "a", probeLayerId: "c" }), layers)).toBe("c");
  });

  it("lets a transient pick win over the probe pin", () => {
    expect(effectiveHitLayerId(pins({ dataLayerId: "a", probeLayerId: "c", pickLayerId: "b" }), layers)).toBe("b");
  });

  // A hidden layer draws no mesh, so it can answer nothing.
  it("skips hidden pins and a hidden data layer", () => {
    const shown = [
      { id: "a", visible: true },
      { id: "b", visible: false },
    ];
    expect(effectiveHitLayerId(pins({ probeLayerId: "b" }), shown)).toBe("a");
    expect(effectiveHitLayerId(pins({ pickLayerId: "b" }), shown)).toBe("a");
    expect(effectiveHitLayerId(pins({ dataLayerId: "b" }), shown)).toBe("a");
  });

  it("falls back past gone pins", () => {
    expect(effectiveHitLayerId(pins({ probeLayerId: "gone", dataLayerId: "gone" }), layers)).toBe("a");
  });

  it("is null when every layer is hidden", () => {
    const hidden = [
      { id: "a", visible: false },
      { id: "b", visible: false },
    ];
    expect(effectiveHitLayerId(pins(), hidden)).toBeNull();
    expect(effectiveHitLayerId(pins({ probeLayerId: "a", dataLayerId: "a" }), hidden)).toBeNull();
    expect(effectiveHitLayerId(pins(), [])).toBeNull();
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
