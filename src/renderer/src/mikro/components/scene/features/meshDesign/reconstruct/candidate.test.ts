import { describe, expect, it } from "vitest";

import { createMeshDesignStore } from "../store/meshDesignStore";
import { buildCandidate, commitCandidate } from "./candidate";
import { reconstructorById } from "./registry";

const settings = {
  radiusWorld: 4,
  weights: {} as never,
  tubeThreshold: 0.5,
  detailVoxels: 1,
  marcher: "cubes" as const,
  // No polish and no simplifier in the unit test: the pipeline's shape is
  // what is under test, not meshopt.
  polishIterations: 0,
  blobSmoothness: 0,
  blobGap: 0,
};

const ballAt = (x: number) =>
  buildCandidate(
    { kind: "stamp", spec: { kind: "sphere", center: [x, 0, 0], radius: 4 }, spacing: 1, level: 0 },
    {
      reconstructor: reconstructorById("ball-fit")!,
      gestureKind: "click",
      gesture: [{ world: [x, 0, 0], voxel: [x, 0, 0] }],
      layerId: "layer",
      paramsKey: "key",
      settings,
    },
  );

const extentX = (positions: Float32Array): [number, number] => {
  let min = Infinity;
  let max = -Infinity;
  for (let i = 0; i < positions.length; i += 3) {
    min = Math.min(min, positions[i]);
    max = Math.max(max, positions[i]);
  }
  return [min, max];
};

describe("reconstruction candidate", () => {
  it("builds a standalone mesh from a stamp and copies the gesture", async () => {
    const candidate = (await ballAt(0))!;
    expect(candidate.current.indices.length).toBeGreaterThan(0);
    expect(candidate.reconstructorId).toBe("ball-fit");
    expect(candidate.sourceKind).toBe("blob");
    expect(candidate.gesture).toEqual([{ world: [0, 0, 0], voxel: [0, 0, 0] }]);
    const [min, max] = extentX(candidate.current.positions);
    expect(min).toBeCloseTo(-4, 0);
    expect(max).toBeCloseTo(4, 0);
  });

  it("answers null for a result with no surface", async () => {
    const empty = await buildCandidate(
      {
        kind: "surface",
        tube: { positions: new Float32Array(0), triangles: 0, truncated: false },
        spacing: [1, 1, 1],
        level: 0,
      },
      {
        reconstructor: reconstructorById("tube-surface")!,
        gestureKind: "stroke",
        gesture: [],
        layerId: "layer",
        paramsKey: "key",
        settings,
      },
    );
    expect(empty).toBeNull();
  });

  it("accepting into an empty session starts a mesh in ONE undo step", async () => {
    const store = createMeshDesignStore();
    store.getState().setCandidate(await ballAt(0));
    expect(await commitCandidate(store.getState())).toBe(true);
    const state = store.getState();
    expect(state.candidate).toBeNull();
    expect(state.meshes).toHaveLength(1);
    expect(state.meshes[0].field).not.toBeNull();
    expect(state.meshes[0].source).toEqual({ kind: "blob", layerId: "layer", level: 0 });
    expect(state.selectedId).toBe(state.meshes[0].id);
    state.undo();
    expect(store.getState().meshes).toHaveLength(0);
  });

  it("accepting a second candidate unions it into the selected mesh", async () => {
    const store = createMeshDesignStore();
    store.getState().setCandidate(await ballAt(0));
    await commitCandidate(store.getState());
    store.getState().setCandidate(await ballAt(6));
    await commitCandidate(store.getState());
    const state = store.getState();
    expect(state.meshes).toHaveLength(1);
    const [min, max] = extentX(state.meshes[0].current.positions);
    expect(min).toBeCloseTo(-4, 0);
    expect(max).toBeCloseTo(10, 0);
    // One step back is the first ball alone, not an empty session.
    state.undo();
    expect(extentX(store.getState().meshes[0].current.positions)[1]).toBeCloseTo(4, 0);
  });

  it("a freshly started empty mesh receives the candidate instead of a new one", async () => {
    const store = createMeshDesignStore();
    const id = store.getState().newMesh();
    store.getState().setCandidate(await ballAt(0));
    await commitCandidate(store.getState());
    expect(store.getState().meshes).toHaveLength(1);
    expect(store.getState().meshes[0].id).toBe(id);
    expect(store.getState().meshes[0].current.indices.length).toBeGreaterThan(0);
  });

  it("with nothing pending, accepting does nothing", async () => {
    const store = createMeshDesignStore();
    expect(await commitCandidate(store.getState())).toBe(false);
    expect(store.getState().meshes).toHaveLength(0);
  });
});
