import * as THREE from "three";

/**
 * One `THREE.BatchedMesh` holding every mounted cell of a collection — the
 * draw-call collapse that per-cell `Mesh` objects cannot give. On the WebGPU
 * backend a BatchedMesh renders as one pipeline + bind group with a tight
 * per-range draw loop; two thousand cells as individual meshes cost two
 * thousand render objects, bind groups and a render-list sort every frame.
 *
 * This module owns only the BatchedMesh bookkeeping: capacity, slots, the
 * append-only allocator's quirks. It knows nothing about plans, fetching or
 * caches. The geometries it mounts are OWNED BY THE CALLER (the manager's
 * LRU): mounting copies vertex data into the batch buffers, so unmounting
 * never disposes a source geometry.
 *
 * Two BatchedMesh facts drive the shape of this class (both verified against
 * three 0.184):
 *
 *  - **`addGeometry` only appends.** `deleteGeometry` recycles the ID but not
 *    the buffer range — space returns only via `optimize()` (compaction) or a
 *    rebuild. A streaming layer that mounts and unmounts forever would
 *    exhaust any capacity without the reclaim step in `ensureRoom`.
 *  - **Capacity is fixed at construction.** Growth means a NEW BatchedMesh
 *    and re-adding every mounted geometry from its source — which is why the
 *    sources map exists, and why `onMeshChanged` tells the owner to swap the
 *    scene-graph child.
 *
 * The batch object's own `boundingSphere` stays null (three does not maintain
 * it), so object-level culling is disabled and per-instance culling — driven
 * by the per-geometry analytic bounds the manager sets — does the work.
 */

const GROWTH = 1.5;

export type FabriksBatchStats = {
  instances: number;
  capacityVertices: number;
  capacityIndices: number;
  /** Vertices/indices of LIVE (mounted) cells. */
  usedVertices: number;
  usedIndices: number;
  /** Appended-then-deleted space awaiting `optimize()` or a rebuild. */
  wastedVertices: number;
  wastedIndices: number;
  rebuilds: number;
  optimizes: number;
};

type Slot = {
  geometryId: number;
  instanceId: number;
  vertexCount: number;
  indexCount: number;
};

const IDENTITY = new THREE.Matrix4();

export class FabriksBatchRenderer {
  private batch: THREE.BatchedMesh | null = null;
  private readonly slots = new Map<string, Slot>();
  /** Caller-owned source geometries of mounted cells, kept for rebuilds. */
  private readonly sources = new Map<string, THREE.BufferGeometry>();
  private capacityInstances = 0;
  private capacityVertices = 0;
  private capacityIndices = 0;
  /** Append cursors mirroring the batch's internal tail (not exposed by three). */
  private tailVertices = 0;
  private tailIndices = 0;
  private liveVertices = 0;
  private liveIndices = 0;
  private rebuilds = 0;
  private optimizes = 0;
  /** Applied to the BatchedMesh, surviving rebuilds (2D slab overlay = 2). */
  private renderOrder = 0;

  constructor(
    private readonly material: THREE.Material,
    /** The scene-graph swap hook: fired when the underlying BatchedMesh is
     * (re)created so the owner can replace the mounted child. */
    private readonly onMeshChanged: (
      next: THREE.BatchedMesh,
      previous: THREE.BatchedMesh | null,
    ) => void,
  ) {}

  get count(): number {
    return this.slots.size;
  }

  has(key: string): boolean {
    return this.slots.has(key);
  }

  keys(): IterableIterator<string> {
    return this.slots.keys();
  }

  stats(): FabriksBatchStats {
    return {
      instances: this.slots.size,
      capacityVertices: this.capacityVertices,
      capacityIndices: this.capacityIndices,
      usedVertices: this.liveVertices,
      usedIndices: this.liveIndices,
      wastedVertices: this.tailVertices - this.liveVertices,
      wastedIndices: this.tailIndices - this.liveIndices,
      rebuilds: this.rebuilds,
      optimizes: this.optimizes,
    };
  }

  /**
   * Grow (never shrink) so an incoming plan fits without a mid-drain rebuild.
   * Called with the plan's totals before mounting starts; headroom is the
   * caller's choice via its arguments.
   */
  ensureCapacity(instances: number, vertices: number, indices: number): void {
    if (
      instances <= this.capacityInstances &&
      vertices <= this.capacityVertices &&
      indices <= this.capacityIndices
    ) {
      return;
    }
    this.rebuild(
      Math.max(instances, this.capacityInstances),
      Math.max(vertices, this.capacityVertices),
      Math.max(indices, this.capacityIndices),
    );
  }

  /**
   * Copy one cell's geometry into the batch. The geometry must carry the same
   * attribute set as every other mounted cell (the batch's layout is fixed by
   * the first) and analytic bounds, which become the instance-culling bounds.
   */
  mount(key: string, geometry: THREE.BufferGeometry): void {
    if (this.slots.has(key)) return;
    const vertexCount = geometry.getAttribute("position").count;
    const indexCount = geometry.getIndex()?.count ?? 0;
    this.ensureRoom(vertexCount, indexCount);

    const batch = this.batch!;
    const geometryId = batch.addGeometry(geometry);
    const instanceId = batch.addInstance(geometryId);
    batch.setMatrixAt(instanceId, IDENTITY);

    this.slots.set(key, { geometryId, instanceId, vertexCount, indexCount });
    this.sources.set(key, geometry);
    this.tailVertices += vertexCount;
    this.tailIndices += indexCount;
    this.liveVertices += vertexCount;
    this.liveIndices += indexCount;
    batch.visible = true;
  }

  /** Release a cell's slot. Buffer space becomes waste until reclaimed. */
  unmount(key: string): void {
    const slot = this.slots.get(key);
    if (!slot) return;
    this.slots.delete(key);
    this.sources.delete(key);
    this.batch?.deleteInstance(slot.instanceId);
    this.batch?.deleteGeometry(slot.geometryId);
    this.liveVertices -= slot.vertexCount;
    this.liveIndices -= slot.indexCount;
    if (this.batch && this.slots.size === 0) this.batch.visible = false;
  }

  /**
   * Reclaim appended-then-deleted space at a PLAN BOUNDARY — after the stale
   * cells of a replan are unmounted, before new mounts stream in — so the
   * mid-mount `optimize()` inside `ensureRoom` (a synchronous full-buffer
   * copy in the middle of a drain) stays the rare fallback. Compacts only
   * when waste exceeds ~25% of capacity: below that the copy costs more than
   * the space is worth.
   */
  compact(): void {
    if (!this.batch) return;
    const wastedVertices = this.tailVertices - this.liveVertices;
    const wastedIndices = this.tailIndices - this.liveIndices;
    if (
      wastedVertices * 4 <= this.capacityVertices &&
      wastedIndices * 4 <= this.capacityIndices
    ) {
      return;
    }
    this.batch.optimize();
    this.optimizes++;
    this.tailVertices = this.liveVertices;
    this.tailIndices = this.liveIndices;
  }

  /** Draw order for the batch (kept across rebuilds). */
  setRenderOrder(order: number): void {
    this.renderOrder = order;
    if (this.batch) this.batch.renderOrder = order;
  }

  /**
   * Re-add every mounted cell into a fresh batch at current capacity — for
   * when the required attribute LAYOUT changes (the flat↔smooth normals
   * toggle), which a fixed-layout batch cannot absorb in place.
   */
  refresh(): void {
    if (this.batch) {
      this.rebuild(this.capacityInstances, this.capacityVertices, this.capacityIndices);
    }
  }

  dispose(): void {
    this.slots.clear();
    this.sources.clear();
    if (this.batch) {
      this.batch.removeFromParent();
      this.batch.dispose();
      this.batch.geometry.dispose();
      this.batch = null;
    }
    this.tailVertices = this.tailIndices = this.liveVertices = this.liveIndices = 0;
    this.capacityInstances = this.capacityVertices = this.capacityIndices = 0;
  }

  /** Reclaim, then grow: `optimize()` first (cheap copyWithin compaction),
   * a bigger batch only if live data genuinely does not fit. */
  private ensureRoom(vertexCount: number, indexCount: number): void {
    if (!this.batch) {
      this.rebuild(
        Math.max(64, this.capacityInstances),
        Math.max(vertexCount * 4, this.capacityVertices),
        Math.max(indexCount * 4, this.capacityIndices),
      );
      return;
    }
    if (this.slots.size + 1 > this.capacityInstances) {
      this.rebuild(
        Math.ceil((this.slots.size + 1) * GROWTH),
        this.capacityVertices,
        this.capacityIndices,
      );
    }
    const fitsAppended =
      this.tailVertices + vertexCount <= this.capacityVertices &&
      this.tailIndices + indexCount <= this.capacityIndices;
    if (fitsAppended) return;

    const fitsCompacted =
      this.liveVertices + vertexCount <= this.capacityVertices &&
      this.liveIndices + indexCount <= this.capacityIndices;
    if (fitsCompacted) {
      this.batch.optimize();
      this.optimizes++;
      this.tailVertices = this.liveVertices;
      this.tailIndices = this.liveIndices;
      return;
    }
    this.rebuild(
      this.capacityInstances,
      Math.ceil((this.liveVertices + vertexCount) * GROWTH),
      Math.ceil((this.liveIndices + indexCount) * GROWTH),
    );
  }

  private rebuild(instances: number, vertices: number, indices: number): void {
    const previous = this.batch;
    const next = new THREE.BatchedMesh(instances, vertices, indices, this.material);
    next.name = "__fabriks-batch__";
    next.matrixAutoUpdate = false;
    next.renderOrder = this.renderOrder;
    // No object-level sphere is maintained by three; per-instance culling
    // (from the per-geometry analytic bounds) is the real cull.
    next.frustumCulled = false;
    next.perObjectFrustumCulled = true;
    // A BatchedMesh initializes its attributes on the FIRST addGeometry.
    // Rendering it empty hands the node builder a geometry with no
    // `position` at all — a warning and a junk pipeline per frame — so an
    // empty batch stays off the render list; `mount` flips it visible.
    next.visible = false;

    this.capacityInstances = instances;
    this.capacityVertices = vertices;
    this.capacityIndices = indices;
    this.batch = next;
    this.tailVertices = this.tailIndices = 0;
    this.liveVertices = this.liveIndices = 0;
    this.rebuilds++;

    const remount = [...this.sources.entries()];
    this.slots.clear();
    this.sources.clear();
    for (const [key, geometry] of remount) this.mount(key, geometry);

    this.onMeshChanged(next, previous);
    if (previous) {
      previous.removeFromParent();
      previous.dispose();
      previous.geometry.dispose();
    }
  }
}
