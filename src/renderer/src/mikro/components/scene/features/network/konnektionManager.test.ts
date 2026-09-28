import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import * as THREE from "three";
import { describe, expect, it, vi } from "vitest";

import { KonnektionCollection } from "./konnektion/konnektionCollection";
import type { KonnektionTransport } from "./konnektion/konnektionCollection";
import { KonnektionCollectionManager } from "./konnektionManager";

/**
 * The manager's LIFECYCLE against the committed fixtures: the two races a
 * settle-cadence async plan has — unmount mid-fetch, and a fetch that fails —
 * neither of which the pure planner/decoder tests can see.
 */

const FIXTURES = join(dirname(fileURLToPath(import.meta.url)), "konnektion", "__fixtures__");

const fixtureTransport = (variant: string): KonnektionTransport => {
  const root = join(FIXTURES, variant);
  return {
    get: async (path) => new Uint8Array(await readFile(join(root, path))),
    getRange: async (path, start, end) => {
      const bytes = new Uint8Array(await readFile(join(root, path)));
      return bytes.subarray(start, end);
    },
  };
};

/** Camera-free plan: no frustum, no camera, the whole collection. */
const VIEW = { frustum: null, cameraPosition: null, focalPixels: 1 } as const;

const openManager = async () => {
  const collection = await KonnektionCollection.open(fixtureTransport("arbor"));
  const manager = new KonnektionCollectionManager({
    collection,
    onInvalidate: () => {},
    onStatsChanged: () => {},
  });
  return { collection, manager };
};

describe("KonnektionCollectionManager lifecycle", () => {
  it("mounts the planned cells", async () => {
    const { manager } = await openManager();
    await manager.updatePlan(VIEW);
    expect(manager.group.children.length).toBeGreaterThan(0);
    manager.dispose();
  });

  it("builds no bundle when disposed while a fetch is in flight", async () => {
    const { collection, manager } = await openManager();
    await manager.ensureIndex();

    const read = collection.readFetchGroup.bind(collection);
    let release!: () => void;
    const gate = new Promise<void>((resolve) => (release = resolve));
    collection.readFetchGroup = async (group) => {
      await gate;
      return read(group);
    };

    const planning = manager.updatePlan(VIEW);
    await Promise.resolve();
    manager.dispose();
    release();
    await planning;

    expect(manager.group.children.length).toBe(0);
  });

  it("retries a failed fetch on the next settle with the same plan", async () => {
    const { collection, manager } = await openManager();

    const read = collection.readFetchGroup.bind(collection);
    let fail = true;
    collection.readFetchGroup = async (group) => {
      if (fail) throw new Error("network down");
      return read(group);
    };

    const error = console.error;
    console.error = () => {};
    try {
      await manager.updatePlan(VIEW);
    } finally {
      console.error = error;
    }
    expect(manager.group.children.length).toBe(0);

    fail = false;
    await manager.updatePlan(VIEW);
    expect(manager.group.children.length).toBeGreaterThan(0);
    manager.dispose();
  });

  it("replans against the last settle when the placement moves", async () => {
    const { manager } = await openManager();
    await manager.updatePlan(VIEW);
    const plan = vi.spyOn(manager, "updatePlan");
    manager.setVoxelToWorld(new THREE.Matrix4().makeTranslation(10, 0, 0));
    expect(plan).toHaveBeenCalledWith(VIEW);
    // A value-equal placement is not a move.
    manager.setVoxelToWorld(new THREE.Matrix4().makeTranslation(10, 0, 0));
    expect(plan).toHaveBeenCalledTimes(1);
    await plan.mock.results[0].value;
    manager.dispose();
  });
});
