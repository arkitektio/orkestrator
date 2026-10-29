import { describe, expect, it } from "vitest";

import { holdReleaseAction } from "./holdRelease";

const release = (overrides: Partial<Parameters<typeof holdReleaseAction>[0]> = {}) =>
  holdReleaseAction({
    heldMode: "ANNOTATE",
    currentMode: "ANNOTATE",
    shapeInProgress: false,
    keepAnnotatingWhileDrawing: true,
    ...overrides,
  });

describe("hold release", () => {
  it("restores the previous mode when nothing is being drawn", () => {
    expect(release()).toBe("restore");
  });

  it("stays in ANNOTATE while a shape started during the hold is unfinished", () => {
    expect(release({ shapeInProgress: true })).toBe("defer");
  });

  it("restores anyway when the setting is off", () => {
    expect(release({ shapeInProgress: true, keepAnnotatingWhileDrawing: false })).toBe("restore");
  });

  it("only defers ANNOTATE's hold", () => {
    expect(release({ heldMode: "PROBE", currentMode: "PROBE", shapeInProgress: true })).toBe("restore");
  });

  it("leaves a mode picked from the toolbar mid-hold alone", () => {
    expect(release({ currentMode: "DESIGN", shapeInProgress: true })).toBe("keep");
  });
});
