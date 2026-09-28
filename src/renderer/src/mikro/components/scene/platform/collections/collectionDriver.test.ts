import * as THREE from "three";
import { describe, expect, it, vi } from "vitest";
import { createStore } from "zustand/vanilla";
import { CollectionDriver, type DrivableCollection } from "./collectionDriver";

/**
 * The cadence contract. None of this was asserted while it lived as effects in
 * two components: a settle fires exactly one plan, a plan never precedes the
 * catalog, a z-scrub moves the clip WITHOUT replanning, and dispose actually
 * unsubscribes.
 */
const makeTarget = (indexGate?: Promise<void>) => {
  const calls = {
    plans: 0,
    slabs: [] as unknown[],
    matrices: [] as unknown[],
    visibility: [] as boolean[],
  };
  const target: DrivableCollection = {
    ensureIndex: () => indexGate ?? Promise.resolve(),
    updatePlan: () => {
      calls.plans += 1;
    },
    setVoxelToWorld: (m) => calls.matrices.push(m),
    setSlabClip: (s) => calls.slabs.push(s),
    setVisible: (v) => calls.visibility.push(v),
    getPlanConfig: () => ({ pixelBudget: 4 }),
  };
  return { target, calls };
};

const makeEnv = () => {
  const viewApi = createStore(() => ({
    viewProjectionMatrix: new THREE.Matrix4().makePerspective(-1, 1, 1, -1, 1, 100),
    viewportSize: { height: 800 },
    cameraPose: { isPerspective: true, fovY: 1, position: [0, 0, 0] as readonly number[] },
    cameraMoving: false,
  }));
  const viewerApi = createStore(() => ({ currentZ: 0, worldUnitsPerPixel: 0.01 }));
  const invalidate = vi.fn();
  return { viewApi, viewerApi, invalidate, logTag: "[test]" };
};

const flush = () => new Promise((r) => setTimeout(r, 0));

describe("CollectionDriver", () => {
  it("plans once the catalog lands, not before", async () => {
    let release!: () => void;
    const gate = new Promise<void>((r) => (release = r));
    const { target, calls } = makeTarget(gate);
    const env = makeEnv();
    const d = new CollectionDriver(target, env, {
      matrix: new THREE.Matrix4(),
      slab: null,
      visible: true,
    });
    // A settle BEFORE the index is ready must not plan over an empty index.
    env.viewApi.setState({ cameraMoving: true });
    env.viewApi.setState({ cameraMoving: false });
    expect(calls.plans).toBe(0);

    release();
    await flush();
    expect(calls.plans).toBe(1);
    d.dispose();
  });

  it("plans exactly once per moving -> still transition", async () => {
    const { target, calls } = makeTarget();
    const env = makeEnv();
    const d = new CollectionDriver(target, env, { matrix: new THREE.Matrix4(), slab: null, visible: true });
    await flush();
    expect(calls.plans).toBe(1); // the mount plan

    env.viewApi.setState({ cameraMoving: true });
    expect(calls.plans).toBe(1); // motion itself never plans
    env.viewApi.setState({ cameraMoving: false });
    expect(calls.plans).toBe(2);

    // A repeated write of the same value is not an edge.
    env.viewApi.setState({ cameraMoving: false });
    expect(calls.plans).toBe(2);
    d.dispose();
  });

  it("binding is not itself a settle", async () => {
    const { target, calls } = makeTarget();
    const env = makeEnv();
    // cameraMoving starts false; the first bindField call must not count as
    // a falling edge (previous === undefined).
    const d = new CollectionDriver(target, env, { matrix: new THREE.Matrix4(), slab: null, visible: true });
    await flush();
    expect(calls.plans).toBe(1); // the mount plan only
    d.dispose();
  });

  it("a z-scrub moves the clip and does NOT replan", async () => {
    const { target, calls } = makeTarget();
    const env = makeEnv();
    const d = new CollectionDriver(target, env, {
      matrix: new THREE.Matrix4(),
      slab: { thickness: 2 },
      visible: true,
    });
    await flush();
    const plansAfterMount = calls.plans;
    const slabsAfterMount = calls.slabs.length;

    env.viewerApi.setState({ currentZ: 7 });
    expect(calls.slabs.length).toBe(slabsAfterMount + 1);
    expect(calls.slabs.at(-1)).toEqual({ z: 7, thickness: 2 });
    expect(calls.plans).toBe(plansAfterMount); // the whole point
    d.dispose();
  });

  it("3D clips nothing and does not track z", async () => {
    const { target, calls } = makeTarget();
    const env = makeEnv();
    const d = new CollectionDriver(target, env, { matrix: new THREE.Matrix4(), slab: null, visible: true });
    await flush();
    expect(calls.slabs).toEqual([null]);
    env.viewerApi.setState({ currentZ: 5 });
    expect(calls.slabs).toEqual([null]); // no subscription in 3D
    d.dispose();
  });

  it("dispose() unsubscribes both bindings and stops planning", async () => {
    const { target, calls } = makeTarget();
    const env = makeEnv();
    const d = new CollectionDriver(target, env, {
      matrix: new THREE.Matrix4(),
      slab: { thickness: 1 },
      visible: true,
    });
    await flush();
    const plans = calls.plans;
    const slabs = calls.slabs.length;

    d.dispose();
    env.viewApi.setState({ cameraMoving: true });
    env.viewApi.setState({ cameraMoving: false });
    env.viewerApi.setState({ currentZ: 42 });
    d.plan();

    expect(calls.plans).toBe(plans);
    expect(calls.slabs.length).toBe(slabs);
  });

  it("a plan resolving after dispose does not fire", async () => {
    let release!: () => void;
    const gate = new Promise<void>((r) => (release = r));
    const { target, calls } = makeTarget(gate);
    const env = makeEnv();
    const d = new CollectionDriver(target, env, { matrix: new THREE.Matrix4(), slab: null, visible: true });
    d.dispose();
    release();
    await flush();
    expect(calls.plans).toBe(0);
  });

  it("applies the initial visibility to the target", async () => {
    const { target, calls } = makeTarget();
    const env = makeEnv();
    const d = new CollectionDriver(target, env, {
      matrix: new THREE.Matrix4(),
      slab: null,
      visible: false,
    });
    await flush();
    expect(calls.visibility).toEqual([false]);
    d.dispose();
  });

  it("the hidden -> visible edge replans; the reverse edge does not", async () => {
    // A hidden collection stops planning, so the show edge is the only thing
    // standing between a re-shown layer and an empty/stale group — without it
    // the user has to pan to get the next camera settle.
    const { target, calls } = makeTarget();
    const env = makeEnv();
    const d = new CollectionDriver(target, env, {
      matrix: new THREE.Matrix4(),
      slab: null,
      visible: false,
    });
    await flush();
    const mountPlans = calls.plans;

    d.update({ visible: true });
    expect(calls.visibility).toEqual([false, true]);
    expect(calls.plans).toBe(mountPlans + 1);

    // Idempotent: re-pushing the same value is not an edge.
    d.update({ visible: true });
    expect(calls.plans).toBe(mountPlans + 1);

    d.update({ visible: false });
    expect(calls.visibility).toEqual([false, true, false]);
    expect(calls.plans).toBe(mountPlans + 1); // hiding never plans
    d.dispose();
  });

  it("an index that lands while hidden still plans on the show edge", async () => {
    let release!: () => void;
    const gate = new Promise<void>((r) => (release = r));
    const { target, calls } = makeTarget(gate);
    const env = makeEnv();
    const d = new CollectionDriver(target, env, {
      matrix: new THREE.Matrix4(),
      slab: null,
      visible: false,
    });
    // The catalog lands while hidden: the manager drops that plan (konnektion)
    // or plans into a hidden group (fabriks) — either way the show edge is
    // what has to produce the visible content.
    release();
    await flush();
    const plansWhileHidden = calls.plans;

    d.update({ visible: true });
    expect(calls.plans).toBe(plansWhileHidden + 1);
    d.dispose();
  });

  it("a show edge after dispose does nothing", async () => {
    const { target, calls } = makeTarget();
    const env = makeEnv();
    const d = new CollectionDriver(target, env, {
      matrix: new THREE.Matrix4(),
      slab: null,
      visible: false,
    });
    await flush();
    const plans = calls.plans;
    const visibility = calls.visibility.length;
    d.dispose();
    d.update({ visible: true });
    expect(calls.plans).toBe(plans);
    expect(calls.visibility.length).toBe(visibility);
  });

  it("update() pushes placement and slab through", async () => {
    const { target, calls } = makeTarget();
    const env = makeEnv();
    const d = new CollectionDriver(target, env, { matrix: new THREE.Matrix4(), slab: null, visible: true });
    await flush();
    const next = new THREE.Matrix4().makeTranslation(1, 2, 3);
    d.update({ matrix: next });
    expect(calls.matrices.at(-1)).toBe(next);
    d.update({ slab: { thickness: 4 } });
    expect(calls.slabs.at(-1)).toEqual({ z: 0, thickness: 4 });
    d.dispose();
  });
});
