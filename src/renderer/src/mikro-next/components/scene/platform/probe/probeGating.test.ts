import { describe, expect, it } from "vitest";
import {
  annotationHoverEnabled,
  clickProbeEnabled,
  hoverProbeEnabled,
  type ProbeGateInput,
} from "./probeGating";

const gate = (over: Partial<ProbeGateInput>): ProbeGateInput => ({
  interactionMode: "NAVIGATE",
  probeFollowsCursor: true,
  drawingToolActive: false,
  annotateProbes: true,
  ...over,
});

describe("hoverProbeEnabled", () => {
  it("is false in NAVIGATE regardless of anything else", () => {
    for (const probeFollowsCursor of [true, false]) {
      for (const drawingToolActive of [true, false]) {
        expect(
          hoverProbeEnabled(
            gate({ interactionMode: "NAVIGATE", probeFollowsCursor, drawingToolActive }),
          ),
        ).toBe(false);
      }
    }
  });

  it("follows the probeFollowsCursor modifier in PROBE", () => {
    expect(hoverProbeEnabled(gate({ interactionMode: "PROBE" }))).toBe(true);
    expect(
      hoverProbeEnabled(gate({ interactionMode: "PROBE", probeFollowsCursor: false })),
    ).toBe(false);
  });

  it("arms in ANNOTATE whenever a shape tool is active", () => {
    expect(
      hoverProbeEnabled(
        gate({
          interactionMode: "ANNOTATE",
          probeFollowsCursor: false,
          drawingToolActive: true,
        }),
      ),
    ).toBe(true);
  });

  it("is false in ANNOTATE with no shape tool (the marquee, or nothing armed)", () => {
    expect(
      hoverProbeEnabled(gate({ interactionMode: "ANNOTATE", drawingToolActive: false })),
    ).toBe(false);
  });

  it("ignores ANNOTATE entirely for a layer that does not answer it (the 2D plane)", () => {
    expect(
      hoverProbeEnabled(
        gate({
          interactionMode: "ANNOTATE",
          drawingToolActive: true,
          annotateProbes: false,
        }),
      ),
    ).toBe(false);
    // …but PROBE-mode hover is unaffected by that flag.
    expect(
      hoverProbeEnabled(gate({ interactionMode: "PROBE", annotateProbes: false })),
    ).toBe(true);
  });
});

describe("clickProbeEnabled", () => {
  it("is true in PROBE even when hover probing is off", () => {
    const off = gate({ interactionMode: "PROBE", probeFollowsCursor: false });
    expect(hoverProbeEnabled(off)).toBe(false);
    expect(clickProbeEnabled(off)).toBe(true);
  });

  it("is false in NAVIGATE", () => {
    expect(clickProbeEnabled(gate({ drawingToolActive: true }))).toBe(false);
  });

  it("matches the hover rule in ANNOTATE", () => {
    expect(
      clickProbeEnabled(gate({ interactionMode: "ANNOTATE", drawingToolActive: true })),
    ).toBe(true);
    expect(
      clickProbeEnabled(gate({ interactionMode: "ANNOTATE", drawingToolActive: false })),
    ).toBe(false);
    expect(
      clickProbeEnabled(
        gate({
          interactionMode: "ANNOTATE",
          drawingToolActive: true,
          annotateProbes: false,
        }),
      ),
    ).toBe(false);
  });
});

describe("annotationHoverEnabled", () => {
  it("arms in NAVIGATE", () => {
    expect(annotationHoverEnabled(gate({ interactionMode: "NAVIGATE" }))).toBe(true);
  });

  it("arms in ANNOTATE only while no shape tool is armed", () => {
    expect(
      annotationHoverEnabled(gate({ interactionMode: "ANNOTATE", drawingToolActive: false })),
    ).toBe(true);
    expect(
      annotationHoverEnabled(gate({ interactionMode: "ANNOTATE", drawingToolActive: true })),
    ).toBe(false);
  });

  it("never arms in PROBE or DESIGN", () => {
    expect(annotationHoverEnabled(gate({ interactionMode: "PROBE" }))).toBe(false);
    expect(annotationHoverEnabled(gate({ interactionMode: "DESIGN" }))).toBe(false);
  });
});
