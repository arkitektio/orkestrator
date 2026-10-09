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

describe("probePoints", () => {
  const clickAt = (voxelIndex: [number, number, number], values: number[] = []): ProbeResult => ({
    ...probeAt([0, 0, 0]),
    voxelIndex,
    origin: "click",
    values: values.map((value, channel) => ({ channel, value })),
  });

  it("pins each place once, numbering them in order", () => {
    const store = build();
    store.getState().pinProbePoint(clickAt([1, 2, 3]), null);
    store.getState().pinProbePoint(clickAt([4, 5, 6]), null);
    store.getState().pinProbePoint(clickAt([1, 2, 3], [7]), null);

    const points = store.getState().probePoints;
    expect(points.map((point) => point.index)).toEqual([1, 2]);
    // The repeat click refreshed the first point instead of stacking a third.
    expect(points[0].probe.values).toEqual([{ channel: 0, value: 7 }]);
  });

  it("keeps the lookup resolved at the pin, and fills one that was missing", () => {
    const store = build();
    const first = { systemId: "system", coords: { x: 1, t: 0 } };
    store.getState().pinProbePoint(clickAt([1, 2, 3]), first);
    store.getState().refreshProbePoint(clickAt([1, 2, 3]), { systemId: "system", coords: { x: 1, t: 9 } });
    expect(store.getState().probePoints[0].lookup).toBe(first);

    store.getState().pinProbePoint(clickAt([4, 5, 6]), null);
    store.getState().refreshProbePoint(clickAt([4, 5, 6]), first);
    expect(store.getState().probePoints[1].lookup).toBe(first);
  });

  it("never adds on a refresh, and does not notify for an unknown place", () => {
    const store = build();
    let writes = 0;
    store.subscribe(() => writes++);
    store.getState().refreshProbePoint(clickAt([1, 2, 3]), null);
    expect(writes).toBe(0);
    expect(store.getState().probePoints).toEqual([]);
  });

  it("does not reuse a removed point's number", () => {
    const store = build();
    store.getState().pinProbePoint(clickAt([1, 2, 3]), null);
    store.getState().removeProbePoint(store.getState().probePoints[0].id);
    store.getState().pinProbePoint(clickAt([4, 5, 6]), null);
    expect(store.getState().probePoints.map((point) => point.index)).toEqual([2]);

    store.getState().clearProbePoints();
    expect(store.getState().probePoints).toEqual([]);
  });
});
