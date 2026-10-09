import { zarrTransportStats } from "@/core/data/zarr/runner/index";
import type { Vec3 } from "../../../platform/coords/levelGeometry";
import { coldOpenTimeline } from "../../../platform/perf/coldOpenTimeline";
import { parseNodeKey } from "../octree/nodeAddress";
import { poolHeadroomSlots } from "../octree/poolBudget";
import type { BrickSystemStats, LayerBrickPool } from "./residencyTypes";

/**
 * The DebugPanel's "Copy debug report" JSON, split out of the residency
 * manager. Read-only over what the manager hands it.
 */

export type ResidencyDebugInput = {
  pools: ReadonlyMap<string, LayerBrickPool>;
  stats: BrickSystemStats;
  chunkCacheBytes: number;
  /** Layers with a pool (≥ pool count when pools are shared). */
  layerCount: number;
  timeToSharpRing: readonly number[];
  /** "not-attempted" / "unavailable" / the repacker's own status. */
  gpuRepack: string;
  /** Whether a level's array is `sharding_indexed` (see the manager). */
  levelIsSharded: (storeId: string) => boolean;
  sampleResident: (
    layerId: string,
    baseVoxel: Vec3,
    desiredLevel: number,
    channel: number,
  ) => number | null;
};

/** Debug-report probe: every channel slab's raw value at two fixed voxels
 * (volume center and quarter point), read via `sampleResident`. Null
 * entries = nothing resident there, or its chunk left the decode cache. */
function probeChannelSlabs(
  pool: LayerBrickPool,
  sampleResident: ResidencyDebugInput["sampleResident"],
): { voxel: Vec3; values: (number | null)[] }[] {
  const [sx, sy, sz] = pool.geometry.levels[0].spatialShape;
  const voxels: Vec3[] = [
    [Math.floor(sx / 2), Math.floor(sy / 2), Math.floor(sz / 2)],
    [Math.floor(sx / 4), Math.floor(sy / 4), Math.floor(sz / 4)],
  ];
  // Any member resolves to this same pool, so the probe reads the shared
  // atlas regardless of which id it goes through.
  const anyMember = pool.members.values().next().value;
  if (anyMember === undefined) return [];
  return voxels.map((voxel) => ({
    voxel,
    values: Array.from({ length: pool.spec.channelCount }, (_, channel) =>
      sampleResident(anyMember, voxel, 0, channel),
    ),
  }));
}

export function buildResidencyDebugReport(input: ResidencyDebugInput): Record<string, unknown> {
  const { pools, stats } = input;
  let atlasBytesTotal = 0;
  for (const pool of pools.values()) atlasBytesTotal += pool.atlas.byteLength;
  return {
    stats: { ...stats, chunkCacheBytes: input.chunkCacheBytes },
    /** How the store is being reached. `protocol: "http/1.1"` means at most
     * six requests per origin are on the wire however many were started —
     * the first thing to read when loading looks sequential. Process-wide,
     * ranged (sharded) reads only. */
    transport: { ...zarrTransportStats },
    /** Time-to-first-voxel decomposition for THIS scene open. The only
     * instrumentation that can see the cold open — perfMonitor only arms
     * once the scene is already up. See coldOpenTimeline. */
    coldOpen: coldOpenTimeline.buildReport(),
    /** Pools, NOT layers. Fewer pools than layers means sharing is working;
     * one pool per layer over the same image means the key is splitting on
     * something it should not (compare the `poolKey`s). */
    poolCount: pools.size,
    layerCount: input.layerCount,
    /** Which compositor this session compiled. The fixed-shape specialization
     * is a build-time choice with no runtime trace, and it is bisected by a
     * kill switch — so a pasted report has to SAY which side it was on, or
     * the switch is not a bisect tool (pitfall P10: telemetry that lies is
     * worse than none). "off" includes the case where `shaderFastPath` is
     * off, which mutes it. */
    fixedShapeFastPath: "on",
    /** Summed atlas GPU bytes across pools — the whole footprint (there is
     * no CPU mirror, roadmap R3). */
    atlasBytesTotal,
    timeToSharpRing: input.timeToSharpRing.map((ms) => Math.round(ms)),
    gpuRepack: input.gpuRepack,
    pools: [...pools.values()].map((pool) => {
      const residentByLevel: Record<number, number> = {};
      for (const key of pool.pool.keys()) {
        const { level } = parseNodeKey(key);
        residentByLevel[level] = (residentByLevel[level] ?? 0) + 1;
      }
      return {
        poolKey: pool.poolKey,
        /** Every layer this pool backs. Four ids here = four layers sharing
         * one atlas (the one-layer-per-channel case). */
        members: [...pool.members],
        mode: pool.mode,
        spec: {
          payload: pool.spec.payload,
          border: pool.spec.border,
          stored: pool.spec.stored,
          channels: pool.spec.channelCount,
        },
        levels: pool.geometry.levels.map((level) => ({
          spatialShape: level.spatialShape,
          // INNER chunks for a sharded level (the fetch unit); `sharded`
          // says whether `spatialChunks` differs from the storage object.
          spatialChunks: level.spatialChunks,
          sharded: input.levelIsSharded(level.storeId),
          scale: level.scale,
          dtype: level.dtype,
          storeId: level.storeId,
        })),
        atlas: {
          kind: pool.atlas.kind,
          channelsPerTexel: pool.atlas.channelsPerTexel,
          size: pool.atlas.size,
          slotGrid: pool.atlas.slotGrid,
          capacity: pool.atlas.capacity,
          bytes: pool.atlas.byteLength,
        },
        pageTableSize: pool.pageTable.layout.size,
        slotsUsed: pool.pool.size,
        // Cache headroom actually achieved vs. intended. `chooseSlotGrid`
        // factorises the slot count and can round DOWN, so the target is a
        // goal, not a guarantee — read these two together before concluding
        // the budget maths is wrong.
        freeSlots: pool.atlas.capacity - pool.pool.size,
        // The EFFECTIVE target (capped at half a small pool — reporting the
        // raw constant read as "8 free of 64 wanted" on a 9-slot atlas that
        // was in fact perfectly sized).
        headroomTarget: poolHeadroomSlots(pool.atlas.capacity),
        residentByLevel,
        emptyBricks: pool.emptyValues.size,
        inFlight: pool.inFlight.size,
        uploadQueue: pool.queue.length,
        pendingFetch: pool.pendingFetch.length,
        // Two-phase bricks: residents still wearing a replicated rind, and
        // halo refines waiting for an idle pipeline.
        provisional: pool.provisionalKeys.size,
        pendingHalo: pool.pendingHalo.length,
        protectedKeys: pool.protectedKeys.size,
        dataRange: [pool.minValue, pool.maxValue],
        occEncodeRange: [pool.occEncodeMin, pool.occEncodeMax],
        occObservedRange: pool.occObservedInitialized
          ? [pool.occObservedMin, pool.occObservedMax]
          : null,
        occHierarchy: pool.occHierarchy
          ? {
              measured: pool.measuredRanges.size,
              aggregatesComplete: pool.aggregateRanges.size,
            }
          : null,
        // Per-slab occupancy: plane count (1 = union) and a sample of the
        // per-channel brackets, to eyeball that channels really differ.
        occSlabs: pool.occSlabs,
        slabRangesSample: [...pool.brickSlabRanges.values()].slice(0, 3),
        sliceSignature: pool.sliceSignature,
        // Why bricks did (not) take the GPU repack path — "ready" above only
        // means the pipeline compiled; per-brick `supports()` can still
        // reject every job (e.g. "cpu:unsupported:r8" for uint8 layers).
        gpuPath: pool.lastRepackPath,
        // Raw values per channel slab at two fixed voxels (CPU twin of the
        // shader's channel tap, read through the decoded-chunk cache). Identical values across channels of
        // a multi-channel layer at both probes = the slabs hold the same
        // data (repack/fetch); differing values = slabs are fine and a
        // wrong channel on screen is a shader/uniform bug.
        channelSlabProbe: probeChannelSlabs(pool, input.sampleResident),
      };
    }),
  };
}
