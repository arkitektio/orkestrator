import { describe, expect, it } from "vitest";
import {
  availableAnnotateTools,
  availableInteractionModes,
  coerceModeState,
  hasProbeableLayer,
  isAnnotateToolAvailable,
  isInteractionModeAvailable,
} from "./modeCompat";

const ctx2D = { displayMode: "2D" as const, hasProbeableLayer: true };
const ctx3D = { displayMode: "3D" as const, hasProbeableLayer: true };
const noLayers2D = { displayMode: "2D" as const, hasProbeableLayer: false };
const noLayers3D = { displayMode: "3D" as const, hasProbeableLayer: false };

describe("hasProbeableLayer", () => {
  it("is false with no layers at all", () => {
    expect(hasProbeableLayer([])).toBe(false);
  });

  it("is false when every layer is hidden", () => {
    expect(hasProbeableLayer([{ visible: false }, { visible: false }])).toBe(false);
  });

  it("is true when at least one layer is visible", () => {
    expect(hasProbeableLayer([{ visible: false }, { visible: true }])).toBe(true);
  });

  // `visible` is optional on the layer model; absent means shown.
  it("treats an undefined visible flag as visible", () => {
    expect(hasProbeableLayer([{}])).toBe(true);
  });
});

describe("availableInteractionModes", () => {
  // The overlay renders this array directly, so the order is part of the
  // contract, not an implementation detail.
  it("offers the modes in canonical order when a layer can be probed; DESIGN only in 3D", () => {
    expect(availableInteractionModes(ctx2D)).toEqual([
      "NAVIGATE",
      "ANNOTATE",
      "PROBE",
      "DESIGN",
    ]);
    expect(availableInteractionModes(ctx3D)).toEqual([
      "NAVIGATE",
      "ANNOTATE",
      "PROBE",
      "DESIGN",
    ]);
  });

  it("drops DESIGN with PROBE when nothing can answer a probe", () => {
    expect(isInteractionModeAvailable("DESIGN", noLayers3D)).toBe(false);
    // 2D offers DESIGN too: label lift and contour lofting are 2D gestures.
    expect(isInteractionModeAvailable("DESIGN", ctx2D)).toBe(true);
    expect(isInteractionModeAvailable("DESIGN", ctx3D)).toBe(true);
  });

  it("drops PROBE when nothing can answer a probe, in either view", () => {
    expect(availableInteractionModes(noLayers2D)).toEqual(["NAVIGATE", "ANNOTATE"]);
    expect(availableInteractionModes(noLayers3D)).toEqual(["NAVIGATE", "ANNOTATE"]);
  });

  it("agrees with the single-mode predicate", () => {
    expect(isInteractionModeAvailable("PROBE", noLayers2D)).toBe(false);
    expect(isInteractionModeAvailable("ANNOTATE", noLayers2D)).toBe(true);
    expect(isInteractionModeAvailable("NAVIGATE", noLayers2D)).toBe(true);
  });
});

describe("availableAnnotateTools", () => {
  it("leads with Select in 2D and offers the flat tools plus the shared ones", () => {
    const tools = availableAnnotateTools(ctx2D);
    expect(tools[0]).toBe("SELECT");
    expect(tools).toEqual([
      "SELECT",
      "RECTANGLE",
      "ELLIPSE",
      "POLYGON",
      "POINT",
      "LINE",
      "PATH",
    ]);
  });

  it("offers every shape tool plus brush and blob in 3D — only the marquee drops out", () => {
    const tools = availableAnnotateTools(ctx3D);
    expect(tools).toEqual([
      "RECTANGLE",
      "ELLIPSE",
      "POLYGON",
      "SPHERE",
      "CUBE",
      "POINT",
      "LINE",
      "PATH",
      "BRUSH",
    ]);
    expect(tools).not.toContain("SELECT");
  });

  it("agrees with the single-tool predicate", () => {
    // The marquee has nothing to drag against in 3D.
    expect(isAnnotateToolAvailable("SELECT", ctx3D)).toBe(false);
    expect(isAnnotateToolAvailable("SELECT", ctx2D)).toBe(true);
    // The shapes work in both: flat on the drawn slice, probe-placed in the
    // volume (they used to land on an arbitrary z slab in 3D, which is what
    // kept them out).
    expect(isAnnotateToolAvailable("POLYGON", ctx3D)).toBe(true);
    expect(isAnnotateToolAvailable("RECTANGLE", ctx3D)).toBe(true);
    expect(isAnnotateToolAvailable("ELLIPSE", ctx3D)).toBe(true);
    // The volumetric tools stay 3D-only — they are anchored by a probe click.
    expect(isAnnotateToolAvailable("SPHERE", ctx2D)).toBe(false);
    expect(isAnnotateToolAvailable("SPHERE", ctx3D)).toBe(true);
    expect(isAnnotateToolAvailable("CUBE", ctx3D)).toBe(true);
    expect(isAnnotateToolAvailable("PATH", ctx3D)).toBe(true);
    // The skeleton brush and smooth blob work through the volume probe — 3D only.
    expect(isAnnotateToolAvailable("BRUSH", ctx2D)).toBe(false);
    expect(isAnnotateToolAvailable("BRUSH", ctx3D)).toBe(true);
    expect(isAnnotateToolAvailable("BLOB", ctx2D)).toBe(false);
    expect(isAnnotateToolAvailable("BLOB", ctx3D)).toBe(true);
  });
});

describe("coerceModeState", () => {
  // The guard identity-compares to decide whether to write to the store. If
  // this ever returned fresh values, it would loop.
  it("returns the same values when nothing needs to change", () => {
    const requested = { interactionMode: "PROBE" as const, activeTool: "SELECT" as const };
    const next = coerceModeState(requested, ctx2D);
    expect(next.interactionMode).toBe(requested.interactionMode);
    expect(next.activeTool).toBe(requested.activeTool);
  });

  it("falls back to NAVIGATE when PROBE has nothing to probe", () => {
    const next = coerceModeState(
      { interactionMode: "PROBE", activeTool: "RECTANGLE" },
      noLayers2D,
    );
    expect(next.interactionMode).toBe("NAVIGATE");
    expect(next.activeTool).toBe("RECTANGLE");
  });

  it("keeps ANNOTATE but swaps the marquee for the sphere when moving to 3D", () => {
    const next = coerceModeState(
      { interactionMode: "ANNOTATE", activeTool: "SELECT" },
      ctx3D,
    );
    expect(next.interactionMode).toBe("ANNOTATE");
    expect(next.activeTool).toBe("SPHERE");
  });

  it("swaps a volumetric tool for the rectangle when moving to 2D", () => {
    const next = coerceModeState(
      { interactionMode: "ANNOTATE", activeTool: "SPHERE" },
      ctx2D,
    );
    expect(next.activeTool).toBe("RECTANGLE");
  });

  // Coercing the tool even outside ANNOTATE is what stops the user landing on
  // a dead tool when they switch back into it later.
  it("coerces a dead tool even while another mode is active", () => {
    const next = coerceModeState(
      { interactionMode: "NAVIGATE", activeTool: "SELECT" },
      ctx3D,
    );
    expect(next.activeTool).toBe("SPHERE");
  });

  it("leaves a null tool null", () => {
    expect(coerceModeState({ interactionMode: "NAVIGATE", activeTool: null }, ctx2D).activeTool)
      .toBeNull();
    expect(coerceModeState({ interactionMode: "NAVIGATE", activeTool: null }, ctx3D).activeTool)
      .toBeNull();
  });

  it("is idempotent for every context", () => {
    const requested = { interactionMode: "PROBE" as const, activeTool: "SELECT" as const };
    for (const ctx of [ctx2D, ctx3D, noLayers2D, noLayers3D]) {
      const once = coerceModeState(requested, ctx);
      expect(coerceModeState(once, ctx)).toEqual(once);
    }
  });
});

describe("coerceModeState in DESIGN", () => {
  const ctx2D = { displayMode: "2D" as const, hasProbeableLayer: true };

  it("leaves a design-owned tool alone on the flat view (no guard ping-pong)", () => {
    // MeshDesignToolbar forces BRUSH while in DESIGN; evicting it as 3D-only
    // here made the two guards alternate BRUSH -> RECTANGLE -> BRUSH forever.
    for (const tool of ["BRUSH", "BLOB"] as const) {
      const requested = { interactionMode: "DESIGN" as const, activeTool: tool };
      const next = coerceModeState(requested, ctx2D);
      expect(next.interactionMode).toBe("DESIGN");
      expect(next.activeTool).toBe(tool);
      // Idempotent: a second pass changes nothing either.
      expect(coerceModeState(next, ctx2D)).toEqual(next);
    }
  });

  it("still swaps the brush for the rectangle once the mode is back to ANNOTATE", () => {
    expect(
      coerceModeState({ interactionMode: "ANNOTATE", activeTool: "BRUSH" }, ctx2D),
    ).toEqual({ interactionMode: "ANNOTATE", activeTool: "RECTANGLE" });
  });

  it("does not shield the brush when DESIGN itself falls back to NAVIGATE", () => {
    const next = coerceModeState(
      { interactionMode: "DESIGN", activeTool: "BRUSH" },
      { displayMode: "2D", hasProbeableLayer: false },
    );
    expect(next).toEqual({ interactionMode: "NAVIGATE", activeTool: "RECTANGLE" });
  });
});
