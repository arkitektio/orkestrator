/**
 * The vector layer's data path: ONE strided CPU read of the field, not the brick engine.
 *
 * A vector layer is lens-backed but deliberately not a brick layer (see
 * `layerGuards.ts`'s carve-out): the brick path samples a resident atlas and emits
 * colour, where this layer turns voxels into instanced GEOMETRY, and the whole field
 * it draws is a few tens of thousands of samples — one ranged zarr read, no octree, no
 * residency. The store is opened with the same general zarr grant every other
 * datalayer consumer uses; no new access kind.
 *
 * ## Component order — the one convention in this file
 *
 * `VectorLayer.vectorAxis` states it server-side: position i of the DISPLACEMENT axis
 * displaces along the i-th spatial axis in ARRAY order (slowest first), so the LAST
 * component displaces along x. This file is the single place that order is read
 * (`componentTargets` below), the way the neuron generator confines its (x,y,z)
 * reversal to `_ball`.
 *
 * ## Time, and every other collapsed dim
 *
 * Every axis that is neither the vector axis nor spatial is pinned to ONE index, chosen
 * by `resolveFixedDimIndex` — the same function the brick residency pins its pools with
 * (`brickResidency.computeFixedIndices`). That shared call is the whole reason a vector
 * field and the image it overlays land on the same frame when one `t` slider moves them
 * both: a selection wins when present, and the lens slice's collapsed default stands in
 * when it is absent. The caller re-reads on a change; see `VectorsLayer`.
 *
 * ## What is deliberately not here yet
 *
 * Pyramid levels are ignored: whether spatial levels are even built over a DISPLACEMENT
 * store is an open server question, and a strided level-0 read is correct at every
 * answer.
 */
import { ConfiguredS3Store } from "@/lib/zarr/store/s3Store";
import type { MikroClient } from "@/lib/zarr/store/types";
import { buildS3FetchConfig, getGeneralAccess } from "@/mikro-next/lib/zarr/access";
import { buildSliceMap, resolveFixedDimIndex } from "../../platform/coords/selection";
import { openZarrArray } from "@/lib/zarr/openArray";
import { readArrayWindow, type WindowRange } from "@/lib/zarr/readArrayWindow";
import { ByteBudgetChunkCache } from "@/lib/zarr/caches/byteBudgetChunkCache";
import { workerPool } from "@/lib/zarr/pool/sharedWorkerPool";
import type { VectorLayerFragment } from "../../platform/model/layerGuards";

export type VectorField = {
  /** Sample position per instance, (x, y, z) in lens voxel coordinates. */
  positions: Float32Array;
  /** Vector per instance, (x, y, z) components in the same frame. */
  vectors: Float32Array;
  count: number;
  maxMagnitude: number;
  /** The sampling stride actually used (the layer's, or the budget's answer). */
  stride: number;
};

/**
 * Glyphs the layer may put on screen without a stated stride. Chosen against the
 * material, not the network: ~30k instanced 8-segment glyphs is well under what the
 * network path already draws, and a denser field reads as overdraw, not flow.
 */
const GLYPH_BUDGET = 30_000;

/**
 * Decoded chunks of vector fields. Its own small budget: a field is one read per
 * frame change, and it must not evict the bricks the image under it streams.
 */
const VECTOR_CHUNK_CACHE = new ByteBudgetChunkCache(64 * 1024 * 1024);

const strideFor = (spatialSizes: number[], requested: number | null): number => {
  if (requested && requested >= 1) return Math.floor(requested);
  for (let stride = 1; ; stride += 1) {
    const count = spatialSizes.reduce(
      (product, size) => product * Math.ceil(size / stride),
      1,
    );
    if (count <= GLYPH_BUDGET) return stride;
  }
};

export async function loadVectorField(
  client: MikroClient,
  datalayer: string,
  layer: VectorLayerFragment,
  /**
   * The scene-wide scrubber selections (`viewerStore.dimSelections`), by dim name.
   * Only the layer's own collapsed dims are consulted; an absent entry falls back to
   * the lens slice's default, so a scene that has never touched a slider reads the
   * same frame it always did.
   */
  dimSelections: Readonly<Record<string, number>> = {},
): Promise<VectorField | { error: string }> {
  const lens = layer.lens;
  const dataset = lens.dataset;
  const level0 = dataset.dataArrays.reduce<(typeof dataset.dataArrays)[number] | null>(
    (best, candidate) => (best === null || candidate.level < best.level ? candidate : best),
    null,
  );
  if (!level0) return { error: "the dataset carries no data arrays" };

  const axisNames = dataset.axisNames;
  const shape = level0.shape;
  const renderAxes = lens.renderAxes;
  const vectorAxis = layer.vectorAxis;

  // Spatial axes in ARRAY order (z before y before x — renderAxes derives x as the
  // LAST spatial axis), because that is the order the components displace them in.
  const spatialArrayOrder = [renderAxes.z, renderAxes.y, renderAxes.x].filter(
    (name): name is string => name != null,
  );
  const componentCount = shape[axisNames.indexOf(vectorAxis)];
  if (componentCount !== spatialArrayOrder.length) {
    // The server refuses this at creation, so meeting it here means the fragment and
    // the store disagree — say so rather than draw components against wrong axes.
    return {
      error: `the DISPLACEMENT axis carries ${componentCount} components over ${spatialArrayOrder.length} spatial axes`,
    };
  }
  /** componentTargets[i] = which of (x=0, y=1, z=2) component i displaces. */
  const componentTargets = spatialArrayOrder.map((name) =>
    name === renderAxes.x ? 0 : name === renderAxes.y ? 1 : 2,
  );

  const spatialSizes = spatialArrayOrder.map((name) => shape[axisNames.indexOf(name)]);
  const stride = strideFor(spatialSizes, layer.glyphStride ?? null);
  const offset = Math.floor(stride / 2);

  const store = new ConfiguredS3Store(
    buildS3FetchConfig(await getGeneralAccess(client), { key: level0.store.key, storeId: level0.store.id }, datalayer),
    {
      preloadMetadata: true,
      refreshConfig: async (options) =>
        buildS3FetchConfig(await getGeneralAccess(client, options), { key: level0.store.key, storeId: level0.store.id }, datalayer),
    },
  );
  await store.ready();
  const array = await openZarrArray(store);

  // Ranges in axis order: every component of the vector axis, a strided run of
  // each spatial axis, and the SELECTED index of anything else (time, a channel
  // beside the field) as a one-wide range. Clamped against the store's own shape,
  // matching how the brick path resolves the same slider against `levels[0].shape`.
  // Read through the worker runner, never zarrita's main-thread `get()`.
  const sliceMap = buildSliceMap(lens.slices);
  const ranges: WindowRange[] = axisNames.map((name) => {
    const size = shape[axisNames.indexOf(name)];
    if (name === vectorAxis) return { start: 0, stop: size };
    if (spatialArrayOrder.includes(name)) {
      return { start: Math.min(offset, size - 1), stop: size, step: stride };
    }
    const index = resolveFixedDimIndex(sliceMap[name], dimSelections[name], size);
    return { start: index, stop: index + 1 };
  });

  const window = await readArrayWindow(array, ranges, {
    pool: workerPool,
    cache: VECTOR_CHUNK_CACHE,
  });
  const data = window.data;
  const chunkStride = window.strides;
  // A window keeps every axis (a pinned one at extent 1, index 0, so it adds
  // nothing to an offset): its dims are the array's own, in axis order.
  const vectorDim = axisNames.indexOf(vectorAxis);
  const spatialDims = spatialArrayOrder.map((name) => axisNames.indexOf(name));
  const sampled = spatialDims.map((dim) => window.shape[dim]);

  const count = sampled.reduce((product, size) => product * size, 1);
  const positions = new Float32Array(count * 3);
  const vectors = new Float32Array(count * 3);
  let maxMagnitude = 0;

  const indices = sampled.map(() => 0);
  for (let sample = 0; sample < count; sample += 1) {
    let base = 0;
    for (let axis = 0; axis < spatialDims.length; axis += 1) {
      base += indices[axis] * chunkStride[spatialDims[axis]];
    }

    // Positions are (x, y, z); an absent z stays 0. Voxel CENTRES sit at integer
    // coordinates in the intrinsic frame (the pyramid-transform convention).
    for (let axis = 0; axis < spatialArrayOrder.length; axis += 1) {
      const target = componentTargets[axis];
      positions[sample * 3 + target] = offset + indices[axis] * stride;
    }

    let magnitudeSquared = 0;
    for (let component = 0; component < componentCount; component += 1) {
      const value = Number(data[base + component * chunkStride[vectorDim]]);
      vectors[sample * 3 + componentTargets[component]] = value;
      magnitudeSquared += value * value;
    }
    if (magnitudeSquared > maxMagnitude * maxMagnitude) maxMagnitude = Math.sqrt(magnitudeSquared);

    for (let axis = spatialDims.length - 1; axis >= 0; axis -= 1) {
      indices[axis] += 1;
      if (indices[axis] < sampled[axis]) break;
      indices[axis] = 0;
    }
  }

  return { positions, vectors, count, maxMagnitude, stride };
}
