import { describe, expect, it } from "vitest";
import {
  effectiveProbeLayerId,
  layerAnswersProbe,
  probeAfterPinChange,
} from "./probeTargeting";

describe("effectiveProbeLayerId", () => {
  const layers = [
    { id: "a", visible: true },
    { id: "b", visible: true },
    { id: "c", visible: true },
  ];

  it("defaults to the first layer with no pin", () => {
    expect(effectiveProbeLayerId(null, layers)).toBe("a");
  });

  it("lets an explicit visible pin win over the first layer", () => {
    expect(effectiveProbeLayerId("b", layers)).toBe("b");
  });

  it("skips a hidden first layer for the default", () => {
    expect(
      effectiveProbeLayerId(null, [
        { id: "a", visible: false },
        { id: "b", visible: true },
      ]),
    ).toBe("b");
  });

  it("treats an undefined visible as visible", () => {
    expect(effectiveProbeLayerId(null, [{ id: "a" }])).toBe("a");
  });

  it("falls back to the first visible layer when the pin names a hidden one", () => {
    expect(
      effectiveProbeLayerId("b", [
        { id: "a", visible: true },
        { id: "b", visible: false },
      ]),
    ).toBe("a");
  });

  it("falls back to the first visible layer when the pin names a gone one", () => {
    expect(effectiveProbeLayerId("gone", layers)).toBe("a");
  });

  it("is null when every layer is hidden", () => {
    expect(
      effectiveProbeLayerId(null, [
        { id: "a", visible: false },
        { id: "b", visible: false },
      ]),
    ).toBeNull();
    expect(
      effectiveProbeLayerId("a", [{ id: "a", visible: false }]),
    ).toBeNull();
  });

  it("is null with no layers at all", () => {
    expect(effectiveProbeLayerId(null, [])).toBeNull();
    expect(effectiveProbeLayerId("a", [])).toBeNull();
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
