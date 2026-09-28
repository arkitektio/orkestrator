import { describe, expect, it } from "vitest";

import { DESIGN_TOOLS, designToolByKey } from "./registry";

describe("design tool registry", () => {
  it("assigns every tool a unique key that no hold-mode uses", () => {
    const keys = DESIGN_TOOLS.map((tool) => tool.key);
    expect(new Set(keys).size).toBe(keys.length);
    // a = hold-ANNOTATE, p = hold-PROBE, m = hold-DESIGN, d = path-from-probe.
    for (const reserved of ["a", "p", "m", "d"]) expect(keys).not.toContain(reserved);
    for (const key of keys) expect(key).toMatch(/^[a-z]$/);
  });

  it("volume tools carry a run(); surface/screen tools do not need one", () => {
    for (const tool of DESIGN_TOOLS) {
      if (tool.gesture.startsWith("volume")) expect(typeof tool.run).toBe("function");
      expect(tool.hint.length).toBeGreaterThan(0);
      expect(tool.shortcut.keys.length).toBeGreaterThan(0);
    }
    expect(designToolByKey("c")?.id).toBe("brush");
    expect(designToolByKey("x")?.id).toBe("carve");
  });
});
