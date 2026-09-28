import { describe, expect, it } from "vitest";
import { layerSlotForCode, toggledVisibility } from "./layerVisibilityKeys";

describe("layerSlotForCode", () => {
  it("counts 1..9 from the first slot", () => {
    expect(layerSlotForCode("Digit1")).toBe(0);
    expect(layerSlotForCode("Digit9")).toBe(8);
  });

  it("puts 0 at the end of the run, not the start", () => {
    expect(layerSlotForCode("Digit0")).toBe(9);
  });

  it("ignores the numpad and every non-digit key", () => {
    // Numpad0 would be a reasonable alias, but it is a separate binding to
    // decide on rather than something to fall into by loose matching.
    expect(layerSlotForCode("Numpad1")).toBeNull();
    expect(layerSlotForCode("KeyD")).toBeNull();
    expect(layerSlotForCode("Digit")).toBeNull();
    expect(layerSlotForCode("")).toBeNull();
  });

  it("is keyed on the physical key, so shifted digit glyphs are irrelevant", () => {
    // What a US keyboard reports in `key` for Shift+1. If the binding ever
    // regresses to matching `key`, this is what it would have to accept.
    expect(layerSlotForCode("!")).toBeNull();
  });
});

describe("toggledVisibility", () => {
  it("hides a layer that is shown", () => {
    expect(toggledVisibility(true)).toBe(false);
  });

  it("shows a layer that is hidden", () => {
    expect(toggledVisibility(false)).toBe(true);
  });

  it("treats an unset flag as shown, matching the eye button", () => {
    expect(toggledVisibility(undefined)).toBe(false);
  });
});
