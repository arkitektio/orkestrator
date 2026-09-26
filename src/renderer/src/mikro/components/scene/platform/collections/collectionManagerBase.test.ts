import * as THREE from "three";
import { describe, expect, it, vi } from "vitest";

import { CollectionManagerBase } from "./collectionManagerBase";

/**
 * The shared manager half: placement rebuilds the index and replans, the slab
 * clip mutates planes in place and only toggles on its edges, and the
 * generation guard strands work across a replan or a dispose.
 */
class FakeManager extends CollectionManagerBase<number, { rows: number[]; tx: number }> {
  builds = 0;
  replans = 0;
  rebuilds = 0;
  slabEdges: boolean[] = [];

  protected buildIndex(rows: number[], voxelToWorld: THREE.Matrix4) {
    this.builds++;
    return { rows, tx: voxelToWorld.elements[12] };
  }

  protected replanAfterPlacement(): void {
    this.replans++;
  }

  protected override onIndexRebuilt(): void {
    this.rebuilds++;
  }

  protected override onSlabModeChanged(clipping: boolean): void {
    this.slabEdges.push(clipping);
  }

  // Test windows onto the protected API.
  adopt(rows: number[]) {
    return this.adoptCatalog(rows);
  }
  currentIndex() {
    return this.index;
  }
  start() {
    return this.bumpGeneration();
  }
  stale(generation: number) {
    return this.isStale(generation);
  }
  dispose() {
    this.markDisposed();
  }
}

const make = () => {
  const onInvalidate = vi.fn();
  const manager = new FakeManager({ onInvalidate });
  return { manager, onInvalidate };
};

const translate = (x: number) => new THREE.Matrix4().makeTranslation(x, 0, 0);

describe("CollectionManagerBase placement", () => {
  it("moves the group without replanning before a catalog exists", () => {
    const { manager, onInvalidate } = make();
    manager.setVoxelToWorld(translate(5));
    expect(manager.group.matrix.elements[12]).toBe(5);
    expect(manager.group.matrixAutoUpdate).toBe(false);
    expect(manager.getVoxelToWorld().elements[12]).toBe(5);
    expect(manager.builds).toBe(0);
    expect(manager.replans).toBe(0);
    expect(onInvalidate).toHaveBeenCalledTimes(1);
  });

  it("builds the index under the live placement, then rebuilds and replans on a move", () => {
    const { manager } = make();
    manager.setVoxelToWorld(translate(2));
    expect(manager.adopt([1, 2]).tx).toBe(2);

    manager.setVoxelToWorld(translate(7));
    expect(manager.currentIndex()).toEqual({ rows: [1, 2], tx: 7 });
    expect(manager.rebuilds).toBe(1);
    expect(manager.replans).toBe(1);
  });

  it("no-ops on a value-equal matrix and after dispose", () => {
    const { manager, onInvalidate } = make();
    manager.adopt([1]);
    manager.setVoxelToWorld(translate(3));
    manager.setVoxelToWorld(translate(3));
    expect(manager.replans).toBe(1);
    manager.dispose();
    manager.setVoxelToWorld(translate(4));
    expect(manager.replans).toBe(1);
    expect(onInvalidate).toHaveBeenCalledTimes(1);
  });
});

describe("CollectionManagerBase slab clip", () => {
  it("starts disabled and toggles only on the on/off edges", () => {
    const { manager } = make();
    expect(manager.group.enabled).toBe(false);
    manager.setSlabClip({ z: 10, thickness: 2 });
    manager.setSlabClip({ z: 12, thickness: 2 });
    manager.setSlabClip(null);
    manager.setSlabClip(null);
    expect(manager.slabEdges).toEqual([true, false]);
    expect(manager.group.enabled).toBe(false);
  });

  it("mutates the SAME planes on a z-scrub — no reallocation", () => {
    const { manager } = make();
    const planes = manager.group.clippingPlanes;
    const [top, bottom] = planes;
    manager.setSlabClip({ z: 10, thickness: 2 });
    manager.setSlabClip({ z: 20, thickness: 4 });
    expect(manager.group.clippingPlanes).toBe(planes);
    expect(manager.group.clippingPlanes[0]).toBe(top);
    expect(manager.group.enabled).toBe(true);
    // top keeps z <= 22, bottom keeps z >= 18
    expect(top.distanceToPoint(new THREE.Vector3(0, 0, 21))).toBeGreaterThan(0);
    expect(top.distanceToPoint(new THREE.Vector3(0, 0, 23))).toBeLessThan(0);
    expect(bottom.distanceToPoint(new THREE.Vector3(0, 0, 19))).toBeGreaterThan(0);
    expect(bottom.distanceToPoint(new THREE.Vector3(0, 0, 17))).toBeLessThan(0);
  });

  it("returns a copy of the slab", () => {
    const { manager } = make();
    manager.setSlabClip({ z: 1, thickness: 1 });
    const slab = manager.getSlabClip();
    slab!.z = 99;
    expect(manager.getSlabClip()).toEqual({ z: 1, thickness: 1 });
  });
});

describe("CollectionManagerBase generation guard", () => {
  it("strands the previous generation on a bump and everything on dispose", () => {
    const { manager } = make();
    const first = manager.start();
    expect(manager.stale(first)).toBe(false);
    const second = manager.start();
    expect(manager.stale(first)).toBe(true);
    expect(manager.stale(second)).toBe(false);
    manager.dispose();
    expect(manager.stale(second)).toBe(true);
  });
});
