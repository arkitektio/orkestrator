import { describe, expect, it } from "vitest";
import { createBrickSlice } from "../../../features/bricks/store/brickSlice";
import { createMeshSlice } from "../../../features/meshes/store/meshSlice";
import type { ProbeResult } from "../../probe/probeTypes";
import { createViewerStore } from "../viewerStore";
import { liveProbeWorld } from "./probeSlice";

const build = () => createViewerStore(new Map(), [createBrickSlice, createMeshSlice]);

const probeAt = (worldPos: [number, number, number] | null): ProbeResult => ({
  layerId: "layer",
  localPos: [0, 0, 0],
  voxelIndex: [1, 2, 3],
  worldPos,
  strategy: "first-hit",
  origin: "hover",
  purpose: "readout",
  values: [],
  provenance: { source: "pending", level: 0 },
  dtype: "uint8",
  sliceSignature: "",
});

describe("probeCursorWorld", () => {
  it("is mirrored by every probe publish", () => {
    const store = build();
    store.getState().setProbedCoordinate(probeAt([1, 2, 3]));
    expect(store.getState().probeCursorWorld).toEqual([1, 2, 3]);
    expect(liveProbeWorld(store.getState())).toEqual([1, 2, 3]);

    store.getState().setProbedCoordinate(null);
    expect(store.getState().probeCursorWorld).toBeNull();
    expect(liveProbeWorld(store.getState())).toBeNull();
  });

  it("moves inside a voxel without replacing the probe", () => {
    const store = build();
    const probe = probeAt([1, 2, 3]);
    store.getState().setProbedCoordinate(probe);

    store.getState().setProbeCursorWorld([1.5, 2, 3]);
    expect(store.getState().probedCoordinate).toBe(probe);
    expect(liveProbeWorld(store.getState())).toEqual([1.5, 2, 3]);
  });

  it("does not notify for a point that did not move, or without a probe", () => {
    const store = build();
    let writes = 0;
    store.subscribe(() => writes++);

    store.getState().setProbeCursorWorld([1, 2, 3]);
    expect(writes).toBe(0);
    expect(store.getState().probeCursorWorld).toBeNull();

    store.getState().setProbedCoordinate(probeAt([1, 2, 3]));
    store.getState().setProbeCursorWorld([1, 2, 3]);
    expect(writes).toBe(1);
  });

  it("is dropped when a pin change clears the probe", () => {
    const store = build();
    store.getState().setProbedCoordinate(probeAt([1, 2, 3]));
    store.getState().setProbeLayerId("another");
    expect(store.getState().probedCoordinate).toBeNull();
    expect(store.getState().probeCursorWorld).toBeNull();
  });
});
