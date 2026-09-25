import { describe, expect, it } from "vitest";
import { applyExactValues, type ProbeFetchKey, type ProbeResult } from "./probeTypes";

const makeProbe = (overrides: Partial<ProbeResult> = {}): ProbeResult => ({
  layerId: "layer-a",
  localPos: [0, 0, 0],
  voxelIndex: [10, 20, 30],
  worldPos: [1, 2, 3],
  strategy: "first-hit",
  origin: "click",
  values: [
    { channel: 0, value: null },
    { channel: 1, value: null },
  ],
  provenance: { source: "pending", level: 0 },
  dtype: "uint16",
  sliceSignature: "sig-1",
  ...overrides,
});

const keyOf = (probe: ProbeResult): ProbeFetchKey => ({
  layerId: probe.layerId,
  voxelIndex: probe.voxelIndex,
  sliceSignature: probe.sliceSignature,
});

describe("applyExactValues", () => {
  it("upgrades the matching active probe to exact values", () => {
    const probe = makeProbe();
    const next = applyExactValues({ probedCoordinate: probe }, keyOf(probe), [111, 222]);
    expect(next).not.toBeNull();
    expect(next!.probedCoordinate!.values).toEqual([
      { channel: 0, value: 111 },
      { channel: 1, value: 222 },
    ]);
    expect(next!.probedCoordinate!.provenance).toEqual({ source: "exact", level: 0 });
  });

  it("returns null when nothing matches (voxel mismatch)", () => {
    const probe = makeProbe();
    const key = { ...keyOf(probe), voxelIndex: [9, 9, 9] as [number, number, number] };
    expect(applyExactValues({ probedCoordinate: probe }, key, [1, 2])).toBeNull();
  });

  it("returns null when the slice signature is stale", () => {
    const probe = makeProbe();
    const key = { ...keyOf(probe), sliceSignature: "sig-2" };
    expect(applyExactValues({ probedCoordinate: probe }, key, [1, 2])).toBeNull();
  });

  it("does not re-patch a probe already marked exact", () => {
    const probe = makeProbe({ provenance: { source: "exact", level: 0 } });
    expect(applyExactValues({ probedCoordinate: probe }, keyOf(probe), [1, 2])).toBeNull();
  });

  it("keeps prior values when the exact array is shorter", () => {
    const probe = makeProbe({
      values: [
        { channel: 0, value: 7 },
        { channel: 1, value: 8 },
      ],
      provenance: { source: "resident", level: 2 },
    });
    const next = applyExactValues({ probedCoordinate: probe }, keyOf(probe), [42]);
    expect(next!.probedCoordinate!.values).toEqual([
      { channel: 0, value: 42 },
      { channel: 1, value: 8 },
    ]);
  });

  // The camera pivot keys off `origin`, and an exact-value merge mints a fresh
  // ProbeResult for the same voxel. A refactor that rebuilt the object instead
  // of spreading it would turn every hover probe into a click one.
  it("preserves the probe origin through the exact upgrade", () => {
    const probe = makeProbe({ origin: "hover" });
    const next = applyExactValues({ probedCoordinate: probe }, keyOf(probe), [1, 2]);
    expect(next!.probedCoordinate!.origin).toBe("hover");
  });
});
