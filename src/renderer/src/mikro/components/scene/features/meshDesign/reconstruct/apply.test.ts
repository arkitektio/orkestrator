import { describe, expect, it } from "vitest";

import { marchField } from "../field/sculptField";
import { sphereStamp, stampToField } from "../field/stamps";
import { createMeshDesignStore } from "../store/meshDesignStore";
import { applyReconstruction, reconstructionJob } from "./apply";
import { reconstructorById, type ReconstructResult } from "./registry";

const settings = {
  radiusWorld: 4,
  weights: {} as never,
  tubeThreshold: 0.5,
  detailVoxels: 1,
  marcher: "cubes" as const,
  // No polish in the unit test: the pipeline's shape is what is under test.
  polishIterations: 0,
  blobSmoothness: 0,
  blobGap: 0,
};

const ball = (x: number, radius = 4): ReconstructResult => ({
  kind: "stamp",
  spec: { kind: "sphere", center: [x, 0, 0], radius },
  spacing: 1,
  level: 0,
});

/** A sphere as the triangle soup a surface reconstructor answers. */
const surface = (x: number): ReconstructResult => {
  const mesh = marchField(stampToField(sphereStamp([x, 0, 0], 4), 0.5));
  const positions = new Float32Array(mesh.indices.length * 3);
  for (let i = 0; i < mesh.indices.length; i++) {
    positions.set(mesh.positions.subarray(mesh.indices[i] * 3, mesh.indices[i] * 3 + 3), i * 3);
  }
  return { kind: "surface", tube: { positions, triangles: mesh.indices.length / 3, truncated: false }, spacing: [1, 1, 1], level: 0 };
};

const meta = (x: number, id: "ball-fit" | "ball-surface" = "ball-fit") => ({
  reconstructor: reconstructorById(id)!,
  gestureKind: "click" as const,
  gesture: [{ world: [x, 0, 0] as const, voxel: [x, 0, 0] as const }],
  layerId: "layer",
  paramsKey: "key",
  settings,
});

const extentX = (positions: Float32Array): [number, number] => {
  let min = Infinity;
  let max = -Infinity;
  for (let i = 0; i < positions.length; i += 3) {
    min = Math.min(min, positions[i]);
    max = Math.max(max, positions[i]);
  }
  return [min, max];
};

describe("applying a reconstruction", () => {
  it("into an empty session starts a mesh in ONE undo step, and copies the gesture", async () => {
    const store = createMeshDesignStore();
    expect(await applyReconstruction(store.getState(), ball(0), meta(0))).toBe(true);
    const state = store.getState();
    expect(state.meshes).toHaveLength(1);
    expect(state.meshes[0].source).toEqual({ kind: "blob", layerId: "layer", level: 0 });
    expect(state.selectedId).toBe(state.meshes[0].id);
    expect(state.last?.gesture).toEqual([{ world: [0, 0, 0], voxel: [0, 0, 0] }]);
    const [min, max] = extentX(state.meshes[0].current.positions);
    expect(min).toBeCloseTo(-4, 0);
    expect(max).toBeCloseTo(4, 0);
    state.undo();
    expect(store.getState().meshes).toHaveLength(0);
  });

  it("a second one unions into the selected mesh", async () => {
    const store = createMeshDesignStore();
    await applyReconstruction(store.getState(), ball(0), meta(0));
    await applyReconstruction(store.getState(), ball(6), meta(6));
    const state = store.getState();
    expect(state.meshes).toHaveLength(1);
    const [min, max] = extentX(state.meshes[0].current.positions);
    expect(min).toBeCloseTo(-4, 0);
    expect(max).toBeCloseTo(10, 0);
    // One step back is the first ball alone, not an empty session.
    state.undo();
    expect(extentX(store.getState().meshes[0].current.positions)[1]).toBeCloseTo(4, 0);
  });

  it("a freshly started empty mesh receives it instead of a new one", async () => {
    const store = createMeshDesignStore();
    const id = store.getState().newMesh();
    await applyReconstruction(store.getState(), ball(0), meta(0));
    expect(store.getState().meshes).toHaveLength(1);
    expect(store.getState().meshes[0].id).toBe(id);
    expect(store.getState().meshes[0].current.indices.length).toBeGreaterThan(0);
  });

  it("a re-run replaces the result instead of adding to it", async () => {
    const store = createMeshDesignStore();
    await applyReconstruction(store.getState(), ball(0), meta(0));
    await applyReconstruction(store.getState(), ball(6), meta(6));
    const retune = store.getState().last!;
    // The same gesture, refitted smaller: the first ball is untouched, the
    // second is the new one — not the union of both attempts (which would
    // still reach 10).
    expect(await applyReconstruction(store.getState(), ball(6, 3), { ...meta(6), paramsKey: "smaller", retune })).toBe(true);
    const state = store.getState();
    expect(state.meshes).toHaveLength(1);
    const [min, max] = extentX(state.meshes[0].current.positions);
    expect(min).toBeCloseTo(-4, 0);
    expect(max).toBeGreaterThan(8);
    expect(max).toBeLessThan(9.5);
    expect(state.last?.paramsKey).toBe("smaller");
    expect(state.history).toHaveLength(2);
  });

  it("a re-run that was overtaken applies nothing", async () => {
    const store = createMeshDesignStore();
    await applyReconstruction(store.getState(), ball(0), meta(0));
    const retune = store.getState().last!;
    await applyReconstruction(store.getState(), ball(6), meta(6));
    const meshes = store.getState().meshes;
    expect(await applyReconstruction(store.getState(), ball(0, 2), { ...meta(0), retune })).toBe(false);
    expect(store.getState().meshes).toBe(meshes);
  });

  it("a surface on its own becomes the mesh without a field; the next union builds one", async () => {
    const store = createMeshDesignStore();
    expect(await applyReconstruction(store.getState(), surface(0), meta(0, "ball-surface"))).toBe(true);
    expect(store.getState().meshes[0].field).toBeNull();
    expect(extentX(store.getState().meshes[0].current.positions)[1]).toBeCloseTo(4, 0);
    await applyReconstruction(store.getState(), surface(6), meta(6, "ball-surface"));
    const mesh = store.getState().meshes[0];
    expect(store.getState().meshes).toHaveLength(1);
    expect(mesh.field).not.toBeNull();
    // Both spheres, each within the Detail error (1) of where it was drawn.
    const [min, max] = extentX(mesh.current.positions);
    expect(Math.abs(min + 4)).toBeLessThan(1);
    expect(Math.abs(max - 10)).toBeLessThan(1);
  });

  it("a result that was overtaken while its job ran does not land", async () => {
    const store = createMeshDesignStore();
    // Wanted when the job is handed over, overtaken by the time it answers:
    // the dispatcher's own check (queued jobs only) cannot see that.
    let asked = 0;
    const applied = await applyReconstruction(store.getState(), ball(0), { ...meta(0), superseded: () => asked++ > 0 });
    expect(applied).toBe(false);
    expect(store.getState().meshes).toHaveLength(0);
    expect(store.getState().last).toBeNull();
    expect(store.getState().history).toHaveLength(0);
  });

  it("answers false for a result with no surface", async () => {
    const store = createMeshDesignStore();
    const empty: ReconstructResult = {
      kind: "surface",
      tube: { positions: new Float32Array(0), triangles: 0, truncated: false },
      spacing: [1, 1, 1],
      level: 0,
    };
    expect(reconstructionJob(empty, null, settings)).toBeNull();
    expect(await applyReconstruction(store.getState(), empty, meta(0, "ball-surface"))).toBe(false);
    expect(store.getState().meshes).toHaveLength(0);
  });
});
