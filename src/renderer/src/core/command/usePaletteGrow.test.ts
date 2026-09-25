import { describe, expect, it } from "vitest";
import { originPx } from "./usePaletteGrow";

describe("originPx", () => {
  it("reads the px the search pill publishes", () => {
    expect(originPx("224px")).toBe(224);
    expect(originPx(" 32.5px ")).toBe(32.5);
  });

  it("scales the rem first-paint fallbacks by the root font size", () => {
    expect(originPx("14rem", 16)).toBe(224);
    expect(originPx("2rem", 20)).toBe(40);
  });

  it("is 0 for nothing, which the hook reads as 'do not animate'", () => {
    expect(originPx("")).toBe(0);
    expect(originPx("auto")).toBe(0);
  });
});
