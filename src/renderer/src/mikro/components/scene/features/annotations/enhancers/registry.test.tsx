// @vitest-environment jsdom
// (the panels reach the generated graphql enums via the store imports, and
// that module's Apollo hooks barrel touches `window` on load)
import { describe, expect, it } from "vitest";

import { ANNOTATION_ENHANCERS, applicableEnhancers } from "./registry";

describe("enhancer registry", () => {
  it("offers the vector trace for click-per-vertex tools in both views", () => {
    for (const displayMode of ["2D", "3D"] as const) {
      const ids = applicableEnhancers({ tool: "PATH", displayMode }).map((e) => e.id);
      expect(ids).toContain("vector-trace");
      expect(ids).not.toContain("intensity-skeleton");
    }
  });

  it("offers the skeleton brush only for BRUSH in 3D", () => {
    expect(
      applicableEnhancers({ tool: "BRUSH", displayMode: "3D" }).map((e) => e.id),
    ).toEqual(["intensity-skeleton"]);
    expect(applicableEnhancers({ tool: "BRUSH", displayMode: "2D" })).toEqual([]);
  });

  it("offers the smooth blob only for BLOB in 3D", () => {
    expect(
      applicableEnhancers({ tool: "BLOB", displayMode: "3D" }).map((e) => e.id),
    ).toEqual(["smooth-blob"]);
    expect(applicableEnhancers({ tool: "BLOB", displayMode: "2D" })).toEqual([]);
  });

  it("offers nothing for pointer tools and a null tool", () => {
    expect(applicableEnhancers({ tool: "SELECT", displayMode: "2D" })).toEqual([]);
    expect(applicableEnhancers({ tool: "RECTANGLE", displayMode: "3D" })).toEqual([]);
    expect(applicableEnhancers({ tool: null, displayMode: "3D" })).toEqual([]);
  });

  it("gives every enhancer a panel and a title", () => {
    for (const enhancer of ANNOTATION_ENHANCERS) {
      expect(enhancer.title.length).toBeGreaterThan(0);
      expect(typeof enhancer.ParamsPanel).toBe("function");
    }
  });
});
