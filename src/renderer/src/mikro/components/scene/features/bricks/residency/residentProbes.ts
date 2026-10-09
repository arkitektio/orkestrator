import type { Chunk, DataType } from "zarrita";
import type { Vec3 } from "../../../platform/coords/levelGeometry";
import { decodeEmptyValue, encodeEmptyValue } from "../octree/brickEncoding";
import type { ChunkService, ZarrArrayHandle } from "./chunkService";
import type { LayerBrickPool } from "./residencyTypes";

/**
 * CPU probe reads over a pool (split out of the residency manager). There is
 * no CPU mirror of the atlas (roadmap R3; the eager one is deleted, §6.9), so
 * every resident brick's value comes from the DECODED CHUNK CACHE and uniform
 * bricks from their page-table-quantized EMPTY value. The manager's public
 * `sampleResident` / `sampleResidentEx` / `residentLevelAt` /
 * `fetchExactVoxel` are thin wrappers over these.
 */

export type ResidentRead =
  | { kind: "empty"; level: number; value: number }
  | { kind: "chunk"; level: number };

/** Scratch for `resolveResidentRead`'s per-level voxel (probe march hot
 * path; read and discarded within the loop body, never retained — safe to
 * share because the walk is synchronous). */
const levelVoxelScratch: [number, number, number] = [0, 0, 0];

/**
 * Shared address resolution for the probe reads: walk levels from
 * desiredLevel to coarsest and resolve the finest resident brick — either its
 * (page-table-quantized) uniform value, or `kind: "chunk"`, whose voxel the
 * caller reads from the DECODED CHUNK CACHE (`sampleChunkCacheSync` — the
 * "Phase D" probe), which holds the CPU copy of exactly what was repacked
 * into the slot. Null only when nothing is resident at any level.
 */
export function resolveResidentRead(
  pool: LayerBrickPool,
  baseVoxel: Vec3,
  desiredLevel: number,
): ResidentRead | null {
  const { geometry, spec } = pool;

  // Reused scratch, and a memoized key: this loop runs per LEVEL per MARCH
  // STEP (~256 steps a frame while hover probing), and used to allocate two
  // Vec3s and a fresh key string every time round. The values are consumed
  // synchronously below and never retained, and consecutive steps almost
  // always share a brick — see features/bricks/octree/nodeKeyMemo.ts.
  const levelVoxel = levelVoxelScratch;
  for (let level = Math.max(0, desiredLevel); level < geometry.levels.length; level++) {
    const { scale, spatialShape } = geometry.levels[level];
    levelVoxel[0] = Math.min(Math.max(baseVoxel[0] / scale[0], 0), spatialShape[0] - 1e-3);
    levelVoxel[1] = Math.min(Math.max(baseVoxel[1] / scale[1], 0), spatialShape[1] - 1e-3);
    levelVoxel[2] = Math.min(Math.max(baseVoxel[2] / scale[2], 0), spatialShape[2] - 1e-3);
    const brickX = Math.floor(levelVoxel[0] / spec.payload[0]);
    const brickY = Math.floor(levelVoxel[1] / spec.payload[1]);
    const brickZ = Math.floor(levelVoxel[2] / spec.payload[2]);
    const key = pool.nodeKeys.keyFor(level, brickX, brickY, brickZ);

    const emptyValue = pool.emptyValues.get(key);
    if (emptyValue !== undefined) {
      // The GPU only has the 8-bit page-table encoding of this value; mirror
      // the same encode→decode round-trip so the CPU march matches the
      // rendered image (OCTREE_RENDERER.md P11).
      return {
        kind: "empty",
        level,
        value: decodeEmptyValue(
          encodeEmptyValue(emptyValue, pool, pool.emptyBits),
          pool,
          pool.emptyBits,
        ),
      };
    }

    if (pool.pool.slotOf(key)) return { kind: "chunk", level };
  }
  return null;
}

/**
 * "Phase D" probe read: a voxel value straight from the DECODED CHUNK
 * CACHE, synchronously. The atlas has no CPU mirror, but every resident
 * brick's decoded source chunks passed through `fetchChunkShared`'s
 * byte-budget cache on the way to the repack and usually still live there.
 * Null when the chunk was evicted or the store's chunk-key encoder is still
 * resolving (kicked off here; the next probe move finds it cached).
 */
export function sampleChunkCacheSync(
  chunks: ChunkService,
  getArray: (storeId: string) => ZarrArrayHandle,
  pool: LayerBrickPool,
  levelIndex: number,
  baseVoxel: Vec3,
  channel: number,
): number | null {
  const { geometry } = pool;
  const level = geometry.levels[levelIndex];
  const { xPos, yPos, zPos, intensityPos } = geometry.axes;

  // Allocation-free address math: this runs per march STEP on the hover
  // path (≤256×/frame), so plain locals instead of mapped arrays.
  const clampVoxel = (i: number) =>
    Math.min(
      Math.max(Math.floor(baseVoxel[i] / level.scale[i]), 0),
      level.spatialShape[i] - 1,
    );
  const vx = clampVoxel(0);
  const vy = clampVoxel(1);
  const vz = clampVoxel(2);
  const cx = Math.floor(vx / level.spatialChunks[0]);
  const cy = Math.floor(vy / level.spatialChunks[1]);
  const cz = Math.floor(vz / level.spatialChunks[2]);
  const ox = vx - cx * level.spatialChunks[0];
  const oy = vy - cy * level.spatialChunks[1];
  const oz = vz - cz * level.spatialChunks[2];
  const channelsPerChunk =
    intensityPos !== -1 ? Math.max(1, level.chunks[intensityPos] ?? 1) : 1;
  const channelChunk = intensityPos !== -1 ? Math.floor(channel / channelsPerChunk) : 0;

  // Same coords the brick fetch used — the cache key must match what was
  // fetched (collapsed dims via the pool's fixed chunk coords, like the
  // node fetch itself).
  const dims = geometry.dims;
  const coords = chunks.coordsScratch;
  coords.length = dims.length;
  for (let d = 0; d < dims.length; d++) {
    coords[d] =
      d === xPos
        ? cx
        : d === yPos
          ? cy
          : d === zPos
            ? cz
            : d === intensityPos
              ? channelChunk
              : pool.fixedChunkCoords[levelIndex][d];
  }

  const chunk: Chunk<DataType> | null = chunks.cachedChunkSync(level.storeId, coords, getArray);
  if (!chunk) return null;

  let index = 0;
  for (let d = 0; d < dims.length; d++) {
    const offset =
      d === xPos
        ? ox
        : d === yPos
          ? oy
          : d === zPos
            ? oz
            : d === intensityPos
              ? channel % channelsPerChunk
              : pool.fixedOffsets[levelIndex][d];
    index += offset * (chunk.stride[d] ?? 0);
  }
  const value = (chunk.data as ArrayLike<number | bigint>)[index];
  return value === undefined ? null : Number(value);
}

/**
 * Exact level-0 voxel read for the probe's async value upgrade: fetches the
 * decoded chunk(s) covering the voxel through `fetchChunk` (the manager's
 * shared, interactive-priority fetch) and reads every channel value with the
 * chunk's strides. The caller re-guards the pool (disposed / slice moved)
 * after the await; phasor layers never get here (their slabs are derived at
 * repack time and have no per-voxel source value to read).
 */
export async function readExactVoxel(
  pool: LayerBrickPool,
  baseVoxel: Vec3,
  fetchChunk: (storeId: string, chunkCoords: number[]) => Promise<Chunk<DataType>>,
): Promise<number[]> {
  const { geometry } = pool;
  const level = geometry.levels[0];
  const { xPos, yPos, zPos, intensityPos } = geometry.axes;

  const voxel = [0, 1, 2].map((i) =>
    Math.min(Math.max(Math.floor(baseVoxel[i]), 0), level.spatialShape[i] - 1),
  ) as unknown as Vec3;
  const spatialChunk = [0, 1, 2].map((i) =>
    Math.floor(voxel[i] / level.spatialChunks[i]),
  );
  const spatialOffset = [0, 1, 2].map(
    (i) => voxel[i] - spatialChunk[i] * level.spatialChunks[i],
  );

  const channelCount = Math.max(1, geometry.channelSlabCount);
  const channelsPerChunk =
    intensityPos !== -1 ? Math.max(1, level.chunks[intensityPos] ?? 1) : 1;

  // Group channels sharing a chunk into one fetch.
  const groups = new Map<number, number[]>();
  for (let channel = 0; channel < channelCount; channel++) {
    const chunk = intensityPos !== -1 ? Math.floor(channel / channelsPerChunk) : 0;
    const group = groups.get(chunk);
    if (group) group.push(channel);
    else groups.set(chunk, [channel]);
  }

  const values = new Array<number>(channelCount).fill(Number.NaN);
  await Promise.all(
    [...groups.entries()].map(async ([channelChunk, channels]) => {
      const chunkCoords = geometry.dims.map((_, d) => {
        if (d === xPos) return spatialChunk[0];
        if (d === yPos) return spatialChunk[1];
        if (d === zPos) return spatialChunk[2];
        if (d === intensityPos) return channelChunk;
        return pool.fixedChunkCoords[0][d];
      });
      const chunk = await fetchChunk(level.storeId, chunkCoords);
      for (const channel of channels) {
        const index = geometry.dims.reduce((acc, _, d) => {
          const offset =
            d === xPos
              ? spatialOffset[0]
              : d === yPos
                ? spatialOffset[1]
                : d === zPos
                  ? spatialOffset[2]
                  : d === intensityPos
                    ? channel % channelsPerChunk
                    : pool.fixedOffsets[0][d];
          return acc + offset * (chunk.stride[d] ?? 0);
        }, 0);
        values[channel] = Number(chunk.data[index]);
      }
    }),
  );
  return values;
}
