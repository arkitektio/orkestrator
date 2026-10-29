import { describe, expect, it } from "vitest";
import { readInfoLayers, sameReadings, worldToLayerVoxel, type InfoSampler } from "./infoReadings";
import type { ProbeResult } from "./probeTypes";

const hit: ProbeResult = {
  layerId: "nuclei",
  localPos: [0, 0, 0],
  voxelIndex: [12, 3, 4],
  worldPos: [12.5, 3.5, 4.5],
  strategy: "first-hit",
  origin: "hover",
  purpose: "readout",
  values: [{ channel: 0, value: 99 }],
  provenance: { source: "resident", level: 0 },
  dtype: "uint8",
  sliceSignature: "nuclei-sig",
};

// The signal layer sits 10 world units further along x: its voxel 2 is world 12.
const shifted = [
  [1, 0, 0, 10],
  [0, 1, 0, 0],
  [0, 0, 1, 0],
  [0, 0, 0, 1],
];
const layers = [
  { id: "nuclei", affineMatrix: null },
  { id: "signal", affineMatrix: shifted },
];

const sampler = (values: number[] | null): InfoSampler & { calls: unknown[][] } => {
  const calls: unknown[][] = [];
  return {
    calls,
    getLayerPool: (layerId) =>
      layerId === "signal"
        ? {
            geometry: { levels: [{ spatialShape: [8, 8, 8], dtype: "uint16" }], channelSlabCount: 2 },
            sliceSignature: "signal-sig",
          }
        : null,
    sampleResidentEx: (layerId, voxel, level) => {
      calls.push([layerId, [...voxel], level]);
      return values ? { values, level: 1 } : null;
    },
  };
};

const plans3D = { signal: { mode: "3D" as const, targetLevel: 1 } };

describe("worldToLayerVoxel", () => {
  it("maps a world point into the layer's base voxels through its affine", () => {
    expect(worldToLayerVoxel(layers[1], [12.5, 3.5, 4.5], [8, 8, 8], null)).toEqual([2, 3, 4]);
  });

  it("is null outside the layer", () => {
    expect(worldToLayerVoxel(layers[1], [5, 3, 4], [8, 8, 8], null)).toBeNull();
    expect(worldToLayerVoxel(layers[1], [12, 3, 9], [8, 8, 8], null)).toBeNull();
  });

  // The flat view shows one slab per layer: name the one on screen.
  it("takes z from the drawn slab in 2D, whatever the hit's z", () => {
    expect(worldToLayerVoxel(layers[1], [12.5, 3.5, 40], [8, 8, 8], 6)).toEqual([2, 3, 6]);
  });

  it("holds every z on a one-voxel axis", () => {
    expect(worldToLayerVoxel(layers[1], [12.5, 3.5, 40], [8, 8, 1], null)).toEqual([2, 3, 0]);
  });
});

describe("readInfoLayers", () => {
  it("reuses the hit itself for the hit layer, with no resample", () => {
    const s = sampler([1, 2]);
    const readings = readInfoLayers(hit, { layers, infoIds: ["nuclei"], sampler: s, nodePlans: {} });
    expect(readings).toEqual([hit]);
    expect(readings[0]).toBe(hit);
    expect(s.calls).toEqual([]);
  });

  it("reads another layer at the hit, in its own frame, at its plan's level", () => {
    const s = sampler([7, 8]);
    const [reading] = readInfoLayers(hit, {
      layers,
      infoIds: ["signal"],
      sampler: s,
      nodePlans: plans3D,
    });
    expect(s.calls).toEqual([["signal", [2, 3, 4], 1]]);
    expect(reading).toMatchObject({
      layerId: "signal",
      voxelIndex: [2, 3, 4],
      values: [
        { channel: 0, value: 7 },
        { channel: 1, value: 8 },
      ],
      provenance: { source: "resident", level: 1 },
      dtype: "uint16",
      sliceSignature: "signal-sig",
      // Where the hit happened stays the hit's.
      worldPos: hit.worldPos,
      strategy: "first-hit",
    });
  });

  it("reads pending per channel when nothing is resident", () => {
    const [reading] = readInfoLayers(hit, {
      layers,
      infoIds: ["signal"],
      sampler: sampler(null),
      nodePlans: plans3D,
    });
    expect(reading.values).toEqual([
      { channel: 0, value: null },
      { channel: 1, value: null },
    ]);
    expect(reading.provenance).toEqual({ source: "pending", level: 1 });
  });

  it("keeps the info order and leaves out a layer the hit lies outside", () => {
    const outside = { ...hit, worldPos: [2, 3, 4] as [number, number, number] };
    const readings = readInfoLayers(outside, {
      layers,
      infoIds: ["signal", "nuclei"],
      sampler: sampler([1, 1]),
      nodePlans: plans3D,
    });
    expect(readings.map((reading) => reading.layerId)).toEqual(["nuclei"]);
  });

  it("uses the layer's drawn slab in 2D", () => {
    const s = sampler([1, 1]);
    readInfoLayers(hit, {
      layers,
      infoIds: ["signal"],
      sampler: s,
      nodePlans: { signal: { mode: "2D", targetLevel: 0, slabZ: 5 } },
    });
    expect(s.calls).toEqual([["signal", [2, 3, 5], 0]]);
  });

  it("measures nothing for a mesh pick, a placement cursor or no probe", () => {
    const ctx = { layers, infoIds: ["nuclei", "signal"], sampler: sampler([1, 1]), nodePlans: plans3D };
    expect(readInfoLayers({ ...hit, strategy: "mesh" }, ctx)).toEqual([]);
    expect(readInfoLayers({ ...hit, purpose: "placement" }, ctx)).toEqual([]);
    expect(readInfoLayers(null, ctx)).toEqual([]);
  });
});

describe("sameReadings", () => {
  const read = (values: number[] | null) =>
    readInfoLayers(hit, {
      layers,
      infoIds: ["nuclei", "signal"],
      sampler: sampler(values),
      nodePlans: plans3D,
    });

  it("treats a re-read of the same values as the same", () => {
    expect(sameReadings(read([1, 2]), read([1, 2]))).toBe(true);
  });

  it("tells a changed value or a changed set apart", () => {
    expect(sameReadings(read([1, 2]), read([1, 3]))).toBe(false);
    expect(sameReadings(read([1, 2]), read([1, 2]).slice(0, 1))).toBe(false);
  });
});
