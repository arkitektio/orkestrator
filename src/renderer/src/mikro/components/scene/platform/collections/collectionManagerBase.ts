import * as THREE from "three";
import { ClippingGroup } from "three/webgpu";

import { createSlabPlanes, updateSlabPlanes } from "../coords/slabClip";

/**
 * The part of a LOD-Parquet collection MANAGER that both formats spelled out
 * identically: the group and its placement, the world-space index a placement
 * rebuilds, the 2D slab clip, and the generation/disposed guard every async
 * plan checks. `CollectionDriver` (next door) is the other half — it decides
 * WHEN these setters run; this decides what they do to the scene graph.
 *
 * ## Why a base class and not helpers
 *
 * Every piece here reads or writes the same four fields (`group`,
 * `voxelToWorld`, `catalogRows`/`index`, `generation`/`disposed`), and the
 * subclasses read them too. As free helpers each call would thread all four
 * through; as a base they are just fields. What differs per format is two
 * hooks: how rows become an index (`buildIndex`) and what a placement change
 * replans (`replanAfterPlacement`). Slab-mode side effects beyond the planes
 * (fabriks flips depth test and render order) are the optional
 * `onSlabModeChanged`.
 *
 * ## What it deliberately does NOT own
 *
 * Planning, fetching, the upload path, materials and stats SHAPES. Those are
 * where the two formats genuinely differ (see `collectionDriver.ts` for the
 * same argument). Stats plumbing here is only the two notifications and the
 * `onIndexRebuilt` hook, so each manager keeps its own counter type.
 */

export type SlabClip = { z: number; thickness: number } | null;

export type CollectionManagerHooks = {
  onInvalidate: () => void;
  /** Streaming-cadence stats signal; throttled at the subscriber. */
  onStatsChanged?: () => void;
};

export abstract class CollectionManagerBase<Row, Index> {
  /**
   * A `ClippingGroup` because on the WebGPU node path clipping comes ONLY from
   * the scene graph — `material.clippingPlanes` is WebGL-era API the node
   * system never reads. The planes are handed over ONCE and mutated in place;
   * slab mode is `enabled`, so a z-scrub allocates nothing.
   */
  readonly group = new ClippingGroup();

  /** Voxel → world for this layer, updated in place via `setVoxelToWorld`. */
  protected readonly voxelToWorld = new THREE.Matrix4();
  /** Catalog rows, kept so a placement change rebuilds the world-space index
   *  without re-reading the catalog. The rows are in VOXEL space. */
  protected catalogRows: Row[] | null = null;
  protected index: Index | null = null;

  /** Bumped per plan (and on dispose); async work compares against it. */
  protected generation = 0;
  protected disposed = false;

  /** Order and pairing from `platform/coords/slabClip.ts`. */
  private readonly clipPlanes = createSlabPlanes();
  private slab: SlabClip = null;

  constructor(private readonly hooks: CollectionManagerHooks) {
    this.group.clippingPlanes = [...this.clipPlanes];
    this.group.enabled = false; // slab mode only (setSlabClip)
    // The group's matrix is written directly by `setVoxelToWorld`, so three
    // must not recompose it from position/quaternion/scale.
    this.group.matrixAutoUpdate = false;
  }

  // --- hooks --------------------------------------------------------------

  /** Catalog rows → the world-space index, under `voxelToWorld`. */
  protected abstract buildIndex(rows: Row[], voxelToWorld: THREE.Matrix4): Index;

  /** Re-run the last plan against the rebuilt index. Called only once a
   *  catalog exists; a manager with no recorded view does nothing. */
  protected abstract replanAfterPlacement(): void;

  /** Called on the slab ON/OFF edge, after the group was toggled. */
  protected onSlabModeChanged(_clipping: boolean): void {}

  /** Called after a placement rebuilt the index (a debug counter, usually). */
  protected onIndexRebuilt(): void {}

  // --- notifications ------------------------------------------------------

  protected invalidate(): void {
    this.hooks.onInvalidate();
  }

  protected notifyStats(): void {
    this.hooks.onStatsChanged?.();
  }

  // --- the generation guard -----------------------------------------------

  /** Stale-mark any async work in flight; returns the NEW generation. */
  protected bumpGeneration(): number {
    return ++this.generation;
  }

  /** True when work started under `generation` must stop rather than mount. */
  protected isStale(generation: number): boolean {
    return this.disposed || generation !== this.generation;
  }

  /** The start of every `dispose()`: nothing in flight may mount after this. */
  protected markDisposed(): void {
    this.disposed = true;
    this.bumpGeneration();
  }

  // --- the catalog --------------------------------------------------------

  /** Keep the rows and build the index from them under the live placement. */
  protected adoptCatalog(rows: Row[]): Index {
    this.catalogRows = rows;
    const index = this.buildIndex(rows, this.voxelToWorld);
    this.index = index;
    return index;
  }

  // --- placement ----------------------------------------------------------

  /** A copy of the current voxel → world placement. */
  getVoxelToWorld(): THREE.Matrix4 {
    return this.voxelToWorld.clone();
  }

  /**
   * The layer's placement, applied without disruption: the group matrix
   * moves, the world-space index is rebuilt from the kept rows, and the last
   * plan re-runs against it (its cells were chosen under the OLD placement).
   * Caches survive — the geometry is in voxel space. A value-equal matrix is a
   * no-op.
   */
  setVoxelToWorld(matrix: THREE.Matrix4): void {
    if (this.disposed || this.voxelToWorld.equals(matrix)) return;
    this.voxelToWorld.copy(matrix);
    this.group.matrix.copy(matrix);
    // Flag rather than traverse: the render loop does the walk.
    this.group.matrixWorldNeedsUpdate = true;
    if (this.catalogRows) {
      this.index = this.buildIndex(this.catalogRows, this.voxelToWorld);
      this.onIndexRebuilt();
      this.replanAfterPlacement();
    }
    this.invalidate();
  }

  // --- the 2D slab --------------------------------------------------------

  /**
   * Clip to a world-z window around the displayed slice; `null` restores 3D.
   * A z-scrub with the slab already on mutates only the plane constants — no
   * allocation, no pipeline rebuild. The ON/OFF edge toggles `enabled` and
   * calls `onSlabModeChanged`.
   */
  setSlabClip(slab: SlabClip): void {
    const wasClipping = this.slab !== null;
    this.slab = slab ? { ...slab } : null;
    if (slab) updateSlabPlanes(this.clipPlanes, slab);
    const clipping = slab !== null;
    if (clipping !== wasClipping) {
      this.group.enabled = clipping;
      this.onSlabModeChanged(clipping);
    }
    this.invalidate();
  }

  getSlabClip(): SlabClip {
    return this.slab ? { ...this.slab } : null;
  }
}
