/**
 * The two compute passes: scattering a colouring, and culling for an indirect draw.
 *
 * Both exist for the same reason — the CPU should touch a number of things proportional to the
 * ANSWER, not to the point count.
 *
 * **Scatter.** A sparse slice is a few thousand non-zero `(objectIndex, value)` pairs against
 * however many points the table holds. Uploading just those pairs and scattering them on the
 * GPU means JS never allocates or fills a per-point value array at all; without it, every gene
 * switch walks one.
 *
 * **Cull.** A draw with a CPU-fixed instance count draws every point, on-screen or not. A
 * compute pass that appends surviving indices to a list and writes the count straight into the
 * indirect draw's `instanceCount` lets the GPU decide how many to draw — which is what turns
 * the layer's cap from a draw budget into a memory budget.
 *
 * What this does NOT give is aggregation. Culling removes what is off-screen, never what is
 * redundant on-screen, so zoomed out the survivors still overdraw each other. The mesh planner
 * answers that by substituting pre-authored coarser geometry, which a point set has none of.
 */
import { IndirectStorageBufferAttribute, StorageBufferAttribute, StorageInstancedBufferAttribute } from "three/webgpu";
import * as TSLTyped from "three/tsl";

/* eslint-disable @typescript-eslint/no-explicit-any */
const TSL = TSLTyped as any;
const { Fn, If, atomicAdd, atomicStore, float, instanceIndex, storage, uint, uniform } = TSL;

/** Vertices per point. Two triangles of a billboard quad, from `vertexIndex` alone. */
export const VERTICES_PER_POINT = 6;

export type PointScatter = {
  /** The object indices a slice carries values for. */
  indices: StorageBufferAttribute;
  /** Those values, parallel to `indices`. */
  values: StorageBufferAttribute;
  /** How many pairs are live — the rest of the buffer is stale and must not be read. */
  count: { value: number };
  /** Runs the clear then the scatter. */
  node: unknown;
  capacity: number;
};

/**
 * Build the scatter pass over a value buffer.
 *
 * Dispatched over the buffer's CAPACITY rather than the live pair count, because a compute
 * node's dispatch size is fixed at build time and a gene switch changes the count. The guard
 * against `uCount` is what keeps the tail of a shorter slice from writing stale pairs — cheaper
 * than rebuilding the node, and the alternative is a node per gene.
 */
export const createScatterPass = (
  target: StorageInstancedBufferAttribute,
  pointCount: number,
  capacity: number,
): PointScatter => {
  const indices = new StorageBufferAttribute(new Uint32Array(capacity), 1);
  const values = new StorageBufferAttribute(new Float32Array(capacity), 1);
  const count = uniform(0, "uint");
  const floor = uniform(0, "float");

  const targetNode = storage(target, "float", pointCount);
  const indexNode = storage(indices, "uint", capacity);
  const valueNode = storage(values, "float", capacity);

  // Two dispatches, and the order is the whole of the semantics: every point is reset to the
  // range's floor, then the pairs overwrite the ones they mention. A point a slice omits is a
  // real zero — a slice is the complete truth for its feature — and that is what the floor is.
  const clear = Fn(() => {
    targetNode.element(instanceIndex).assign(floor);
  })().compute(pointCount);

  const scatter = Fn(() => {
    If(instanceIndex.lessThan(count), () => {
      const slot = indexNode.element(instanceIndex);
      targetNode.element(slot).assign(valueNode.element(instanceIndex));
    });
  })().compute(capacity);

  return { indices, values, count, node: [clear, scatter], capacity, floor } as never;
};

/**
 * Load one slice's pairs into the scatter buffers.
 *
 * Returns false when the slice is larger than the capacity the pass was built with; the caller
 * falls back rather than writing past the end. Capacity is chosen once from the worst slice the
 * dataset can produce, so this is a guard rather than an expected path.
 */
export const loadScatterPairs = (
  scatter: PointScatter,
  pairs: Iterable<readonly [number, number]>,
  floor: number,
): boolean => {
  const indices = scatter.indices.array as Uint32Array;
  const values = scatter.values.array as Float32Array;
  let written = 0;
  for (const [index, value] of pairs) {
    if (written >= scatter.capacity) return false;
    indices[written] = index;
    values[written] = value;
    written += 1;
  }
  scatter.indices.needsUpdate = true;
  scatter.values.needsUpdate = true;
  scatter.count.value = written;
  (scatter as unknown as { floor: { value: number } }).floor.value = floor;
  return true;
};

export type PointCull = {
  /** `[vertexCount, instanceCount, firstVertex, firstInstance]`, WebGPU's indirect draw args. */
  indirect: IndirectStorageBufferAttribute;
  /** The surviving point indices, in append order. */
  visible: StorageBufferAttribute;
  /** Resets the count, then appends what survives. */
  node: unknown;
  bounds: { min: { value: unknown }; max: { value: unknown } };
  /**
   * The timepoint window a point must fall in to be drawn, as TIMELINE INDICES.
   * Unbounded (±Infinity) when the table declares no time column, which is what
   * keeps an untimed layer on exactly the path it was on before time existed.
   */
  time: { min: { value: number }; max: { value: number } };
  /** One uint per point, 1 = visible — the `filterBys` mask
   *  (`pointsFilterMask.ts`). Refill `.array`, flip `needsUpdate`, re-dispatch. */
  mask: StorageBufferAttribute;
};

/**
 * Build the cull pass.
 *
 * Two predicates, one dispatch. The spatial box is why this exists; the TIME window
 * rides along because a timed point cloud is a stack of snapshots, and showing every
 * timepoint at once is not a view of it — it is every view at once. Filtering here
 * rather than at read time is the whole point: the table is scanned once and the
 * scrubber costs one compute dispatch, not a re-read.
 *
 * The survivors are appended with an atomic increment on the indirect buffer's `instanceCount`
 * word, which doubles as the append cursor — so the count the draw reads and the count the
 * pass produced cannot disagree. `firstVertex` and `firstInstance` stay 0; `vertexCount` is
 * seeded once because a quad is always six vertices.
 *
 * Culling is against a world-space box the layer supplies, not the camera frustum directly:
 * the layer's affine sits between the data and the world, so testing in the data's own space
 * would need the inverse per point. A box is coarser than a frustum and costs one comparison.
 */
export const createCullPass = (
  positions: StorageInstancedBufferAttribute,
  pointCount: number,
  stride: 2 | 3,
  /** Per-point timeline index. Omitted for an untimed table. */
  times?: StorageInstancedBufferAttribute | null,
): PointCull => {
  const indirect = new IndirectStorageBufferAttribute(new Uint32Array([VERTICES_PER_POINT, 0, 0, 0]), 4);
  const visible = new StorageBufferAttribute(new Uint32Array(pointCount), 1);
  // Every point visible until a rule says otherwise — the filter identity.
  const mask = new StorageBufferAttribute(new Uint32Array(pointCount).fill(1), 1);

  const boundsMin = uniform(TSL.vec3(-Infinity, -Infinity, -Infinity));
  const boundsMax = uniform(TSL.vec3(Infinity, Infinity, Infinity));
  // Unbounded by default, so an untimed layer's predicate is trivially true and
  // the timed and untimed paths differ by nothing but two comparisons.
  const timeMin = uniform(float(-Infinity));
  const timeMax = uniform(float(Infinity));

  const positionNode = storage(positions, stride === 3 ? "vec3" : "vec2", pointCount);
  const timeNode = times ? storage(times, "float", pointCount) : null;
  const visibleNode = storage(visible, "uint", pointCount);
  const maskNode = storage(mask, "uint", pointCount);
  // `toAtomic()` is what makes the append safe: without it every invocation would read the same
  // cursor and the survivors would overwrite each other.
  const indirectNode = storage(indirect, "uint", 4).toAtomic();

  // `atomicStore`, not `.assign`: the buffer is `array<atomic<u32>>`, and WGSL has no `=` on an
  // atomic — three emits one anyway, the module fails to compile, and because `reset` and `cull`
  // are encoded into ONE pass the invalid pipeline takes the cull down with it. `instanceCount`
  // then stays at its seeded 0 and nothing is ever drawn. No index guard either: `compute(1)`
  // bounds-checks to the single invocation 0.
  const reset = Fn(() => {
    atomicStore(indirectNode.element(uint(1)), uint(0));
  })().compute(1);

  const cull = Fn(() => {
    const centre = positionNode.element(instanceIndex);
    const x = centre.x;
    const y = centre.y;
    const z = stride === 3 ? centre.z : float(0);
    let inside = x
      .greaterThanEqual(boundsMin.x)
      .and(x.lessThanEqual(boundsMax.x))
      .and(y.greaterThanEqual(boundsMin.y))
      .and(y.lessThanEqual(boundsMax.y))
      .and(z.greaterThanEqual(boundsMin.z))
      .and(z.lessThanEqual(boundsMax.z));
    if (timeNode) {
      const time = timeNode.element(instanceIndex);
      inside = inside.and(time.greaterThanEqual(timeMin)).and(time.lessThanEqual(timeMax));
    }
    // The `filterBys` mask, one storage read — the whole draw-side cost of a
    // rule, because everything a rule drops never reaches the vertex stage.
    inside = inside.and(maskNode.element(instanceIndex).notEqual(uint(0)));
    If(inside, () => {
      const slot = atomicAdd(indirectNode.element(uint(1)), uint(1));
      visibleNode.element(slot).assign(uint(instanceIndex));
    });
  })().compute(pointCount);

  return {
    indirect,
    visible,
    node: [reset, cull],
    bounds: { min: boundsMin, max: boundsMax },
    time: { min: timeMin, max: timeMax },
    mask,
  };
};
