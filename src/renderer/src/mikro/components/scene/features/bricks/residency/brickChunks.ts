import type {
  LayerLevelGeometry,
  LevelSource,
  Vec3,
} from "../../../platform/coords/levelGeometry";
import { prefetchShardIndex } from "@/core/data/zarr/runner/index";
import { resolveFixedDimIndex } from "../../../platform/coords/selection";
import type { LayerState } from "../../../platform/model/layerModel";
import type { ViewerState } from "../../../platform/stores/viewerStore";
import { chunksTouchingBrick, type FetchPhase } from "../octree/nodeAddress";
import type { PlannedNode } from "../octree/nodePlanning";
import type { ChunkService, ZarrArrayHandle } from "./chunkService";
import type { LayerBrickPool } from "./residencyTypes";

/**
 * Which zarr chunks a pool's bricks read: the collapsed-dim indices a pool is
 * pinned to (`computeFixedIndices`), the full chunk-coordinate set of one
 * brick (`enumerateBrickChunkCoords`), and the shard-index warm-up over it
 * (`warmShardIndexes`). Split out of the residency manager
 * because EVERY chunk consumer — the brick fetch, the shard-index warm-up
 * and both adjacent prefetches — must enumerate IDENTICAL keys, or a warmed
 * key is never the key the real fetch asks for.
 */

/** Zarr chunk coords (dims order) for every chunk a brick's fetch touches —
 * spatial chunks × channel chunks, collapsed dims fixed. Shared by
 * `fetchBrick` and the adjacent-slab prefetch so the two enumerate
 * IDENTICAL chunk keys (a prefetched key must be the key the real fetch
 * asks for, or the warm cache never hits). */
export function enumerateBrickChunkCoords(
  pool: LayerBrickPool,
  levelIndex: number,
  brickCoords: Vec3,
  phase: FetchPhase = "full",
): {
  spatial: Vec3;
  channelChunk: number;
  phasorChunk: number;
  chunkCoords: number[];
}[] {
  const level = pool.geometry.levels[levelIndex];
  const { xPos, yPos, zPos, intensityPos, phasorPos } = pool.geometry.axes;
  const spatialChunks = chunksTouchingBrick(
    pool.geometry,
    pool.spec,
    levelIndex,
    brickCoords,
    phase,
  );
  const channelsPerChunk =
    intensityPos !== -1 ? Math.max(1, level.chunks[intensityPos] ?? 1) : 1;
  const channelChunkCount =
    intensityPos !== -1
      ? Math.ceil(pool.geometry.channelSlabCount / channelsPerChunk)
      : 1;

  // A reduced phasor axis is fetched WHOLE — every chunk along it, because the
  // repack needs every bin of the profile. (Contrast the collapsed dims, which
  // contribute one fixed chunk coord each.)
  const phasorBins = pool.geometry.phasorBins;
  const binsPerChunk =
    phasorPos !== -1 ? Math.max(1, level.chunks[phasorPos] ?? 1) : 1;
  const phasorChunkCount =
    phasorPos !== -1 && phasorBins > 0 ? Math.ceil(phasorBins / binsPerChunk) : 1;

  const out: {
    spatial: Vec3;
    channelChunk: number;
    phasorChunk: number;
    chunkCoords: number[];
  }[] = [];
  for (const spatial of spatialChunks) {
    for (let channelChunk = 0; channelChunk < channelChunkCount; channelChunk++) {
      for (let phasorChunk = 0; phasorChunk < phasorChunkCount; phasorChunk++) {
        out.push({
          spatial,
          channelChunk,
          phasorChunk,
          chunkCoords: pool.geometry.dims.map((_, d) => {
            if (d === xPos) return spatial[0];
            if (d === yPos) return spatial[1];
            if (d === zPos) return spatial[2];
            if (d === intensityPos) return channelChunk;
            if (d === phasorPos && phasorBins > 0) return phasorChunk;
            return pool.fixedChunkCoords[levelIndex][d];
          }),
        });
      }
    }
  }
  return out;
}

/**
 * Fixed (collapsed) indices for every non-spatial, non-channel, non-phasor
 * dim of a layer: the scene-wide dim-slider selection when present, else the
 * lens slice's collapsed default. Computed at pool CREATION and recomputed on
 * every signature FLUSH — a flushed pool that kept its old indices would
 * refetch exactly the slice it just invalidated (the t-slider's data
 * would never change).
 *
 * A phasor axis is NOT collapsed: the repack reduces every one of its bins
 * (`brickRepack.reduceChunks`), so pinning one index here would hand it a
 * single bin and the DFT would read a constant.
 *
 * Both results are PER LEVEL (`[level][dim]`): a level is addressed by its
 * own chunk extent and its own length along the dim. Deriving one coordinate
 * from level 0 and reusing it asks a level chunked differently along t for a
 * chunk it does not have, which reads back as fill.
 */
export function computeFixedIndices(
  layer: LayerState,
  geometry: LayerLevelGeometry,
  levels: LevelSource[],
  dimSelections: ViewerState["dimSelections"],
): { fixedChunkCoords: number[][]; fixedOffsets: number[][] } {
  const dims = layer.lens.dataset.axisNames;
  const { xPos, yPos, zPos, intensityPos, phasorPos } = geometry.axes;
  const sliceMap = layer.lens.slices.reduce<Record<string, (typeof layer.lens.slices)[number]>>(
    (acc, slice) => {
      acc[slice.axis] = slice;
      return acc;
    },
    {},
  );
  const fixedChunkCoords = levels.map(() => dims.map(() => 0));
  const fixedOffsets = levels.map(() => dims.map(() => 0));
  dims.forEach((dim, d) => {
    if (d === xPos || d === yPos || d === zPos || d === intensityPos) return;
    if (d === phasorPos && geometry.phasorBins > 0) return;
    const baseExtent = Math.max(1, levels[0].shape[d] ?? 1);
    const baseIndex = resolveFixedDimIndex(sliceMap[dim], dimSelections[dim], baseExtent);
    levels.forEach((level, l) => {
      // The selection is a level-0 index; a level that re-bins the dim (a
      // coarsened time axis) holds it at the proportional position.
      const extent = Math.max(1, level.shape[d] ?? 1);
      const index =
        extent === baseExtent
          ? baseIndex
          : Math.min(extent - 1, Math.floor((baseIndex * extent) / baseExtent));
      const chunkExtent = Math.max(1, level.chunks[d] ?? 1);
      fixedChunkCoords[l][d] = Math.floor(index / chunkExtent);
      fixedOffsets[l][d] = index % chunkExtent;
    });
  });
  return { fixedChunkCoords, fixedOffsets };
}

/**
 * Fire-and-forget shard-index prefetch for the head of a pool's fetch
 * queue (tail of the reversed array = dispatched first), in the phase those
 * first fetches will run in. Bounded per call; the index cache dedups
 * shards, so this costs at most one small ranged read per shard per scene.
 * No-op for unsharded levels (and for stores whose metadata the chunk
 * service has not resolved yet).
 */
export function warmShardIndexes(
  pool: LayerBrickPool,
  pendingReversed: readonly PlannedNode[],
  phase: FetchPhase,
  chunks: ChunkService,
  getArray: (storeId: string) => ZarrArrayHandle,
): void {
  let budget = 256;
  for (let i = pendingReversed.length - 1; i >= 0 && budget > 0; i--) {
    const node = pendingReversed[i];
    const level = pool.geometry.levels[node.level];
    const meta = chunks.metadataFor(level.storeId);
    if (!meta?.sharding) continue;
    let arr: ZarrArrayHandle;
    try {
      arr = getArray(level.storeId);
    } catch {
      continue;
    }
    for (const { chunkCoords } of enumerateBrickChunkCoords(pool, node.level, node.coords, phase)) {
      if (budget-- <= 0) return;
      prefetchShardIndex(arr, meta, chunkCoords);
    }
  }
}
