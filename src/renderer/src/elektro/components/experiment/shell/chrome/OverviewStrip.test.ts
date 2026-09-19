import { describe, expect, it } from "vitest";
import { overviewIntent } from "./OverviewStrip";

const world = { start: 0, end: 100 };

describe("overviewIntent", () => {
  it("moves a narrow window when grabbed inside it", () => {
    expect(overviewIntent(15, { start: 10, end: 20 }, world)).toBe("move");
  });

  it("selects when pressed outside the window", () => {
    expect(overviewIntent(50, { start: 10, end: 20 }, world)).toBe("select");
  });

  it("selects inside a window that covers nearly the whole world", () => {
    // Zoomed out, the box IS the rail — grabbing it would leave nowhere to select.
    expect(overviewIntent(50, { start: 0, end: 100 }, world)).toBe("select");
    expect(overviewIntent(50, { start: 2, end: 95 }, world)).toBe("select");
  });
});
