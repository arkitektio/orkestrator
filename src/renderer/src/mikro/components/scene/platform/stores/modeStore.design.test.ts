import { describe, expect, it } from "vitest";

import { DESIGN_TOOL_GESTURES, createModeStore } from "./modeStore";

describe("design tool selection", () => {
  it("starts with Trace selected (its panel) but nothing armed — DESIGN navigates", () => {
    const { selectedDesignTool, designTool } = createModeStore().getState();
    expect(selectedDesignTool).toBe("trace");
    expect(designTool).toBeNull();
  });

  it("a toolbar click selects without arming", () => {
    const store = createModeStore();
    store.getState().selectDesignTool("seed");
    expect(store.getState().selectedDesignTool).toBe("seed");
    expect(store.getState().designTool).toBeNull();
  });

  it("a held key selects AND arms; releasing disarms but keeps the selection", () => {
    const store = createModeStore();
    store.getState().selectDesignTool("carve", true);
    expect(store.getState().designTool).toBe("carve");
    store.getState().releaseDesignTool();
    expect(store.getState().designTool).toBeNull();
    expect(store.getState().selectedDesignTool).toBe("carve");
    // A click on another button while a key is down takes the arm away:
    // the held key is no longer the selected tool's.
    store.getState().selectDesignTool("sculpt", true);
    store.getState().selectDesignTool("stamp");
    expect(store.getState().designTool).toBeNull();
  });

  it("only stroke tools need the volume's move handler", () => {
    // BrickVolumeLayer arms its pointer-move handler in DESIGN for exactly
    // these — a click tool must stay out of the per-move raycast set.
    const stroke = Object.entries(DESIGN_TOOL_GESTURES)
      .filter(([, gesture]) => gesture === "volume-stroke")
      .map(([id]) => id)
      .sort();
    expect(stroke).toEqual(["carve", "trace"]);
  });
});
