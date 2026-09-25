import { describe, expect, it } from "vitest";
import { needsImmediateReadout } from "./probeReadout";
import type { ProbeResult } from "./probeTypes";

const probe = (over: Partial<ProbeResult> = {}): ProbeResult => ({
  layerId: "layer-a",
  localPos: [0, 0, 0],
  voxelIndex: [1, 2, 3],
  worldPos: [0, 0, 0],
  strategy: "first-hit",
  origin: "hover",
  purpose: "readout",
  values: [{ channel: 0, value: 42 }],
  provenance: { source: "resident", level: 0 },
  dtype: "uint16",
  sliceSignature: "sig",
  ...over,
});

describe("needsImmediateReadout", () => {
  it("is true for a retraction — a stale reading over empty space is worse than none", () => {
    expect(needsImmediateReadout(probe(), null)).toBe(true);
  });

  it("is true for the first reading after nothing", () => {
    expect(needsImmediateReadout(null, probe())).toBe(true);
  });

  it("is true for a deliberate click", () => {
    expect(needsImmediateReadout(probe(), probe({ origin: "click" }))).toBe(true);
  });

  it("is true when the measured layer changes", () => {
    expect(needsImmediateReadout(probe(), probe({ layerId: "layer-b" }))).toBe(true);
  });

  it("is true when the march strategy changes", () => {
    expect(needsImmediateReadout(probe(), probe({ strategy: "max" }))).toBe(true);
  });

  it("is FALSE for a hover crossing within one layer and strategy — that is the sweep", () => {
    expect(
      needsImmediateReadout(probe(), probe({ voxelIndex: [4, 5, 6] })),
    ).toBe(false);
  });

  it("is false for an exact-value upgrade of the same point", () => {
    // A new object identity at the same coordinate must not jump the queue.
    expect(
      needsImmediateReadout(
        probe(),
        probe({ provenance: { source: "exact", level: 0 } }),
      ),
    ).toBe(false);
  });
});
