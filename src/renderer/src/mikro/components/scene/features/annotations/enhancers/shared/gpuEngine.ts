import { MAX_CORRIDOR_VOXELS } from "./corridorPlan";
import type {
  GpuSkeletonizer,
  SkeletonRunJob,
  SkeletonTubeJob,
} from "./gpu/computeSkeleton";
import type {
  CenterlineRequest,
  CenterlineResult,
  LevelTube,
  SkeletonEngine,
  SkeletonEngineContext,
  TubeOptions,
  TubeRequest,
} from "./engine";
import type { PickedCorridor } from "./planning";

/**
 * The GPU skeleton engine: adapts a `GpuSkeletonizer` (`computeSkeleton.ts`
 * — the WGSL cost/relax/smooth/tube kernels) to the `SkeletonEngine` seam.
 * All device state, batching and broken-latching live in the skeletonizer;
 * this module is pure request translation.
 *
 * Every method answers null instead of degrading silently — no device, dead
 * pipelines, a page table without the requested level, an unconverged
 * relaxation — so the caller's engine walk falls through to the CPU engine.
 */

export const GPU_MAX_TUBE_VERTICES = 600_000;

export function createGpuSkeletonEngine(
  ctx: SkeletonEngineContext,
  skeletonizer: GpuSkeletonizer,
): SkeletonEngine {
  const poolRange = Math.max(ctx.pool.maxValue - ctx.pool.minValue, 1e-5);

  /** The job fields shared by both kernels' entry points. */
  const jobBase = (
    picked: PickedCorridor,
    request: { strokeLevelPts: CenterlineRequest["strokeLevelPts"]; radiusWorld: number; weights: CenterlineRequest["weights"] },
  ): Omit<SkeletonRunJob, "seed" | "tube"> => ({
    atlas: ctx.pool.atlas,
    pageTable: ctx.pool.pageTable,
    level: picked.level,
    box: picked.box,
    strokeLevelPts: request.strokeLevelPts,
    radiusWorld: request.radiusWorld,
    weights: request.weights,
    channel: ctx.channel,
    minValue: ctx.window.min,
    maxValue: ctx.window.max,
    emptyCeiling: ctx.pool.emptyBits === 24 ? 0xffffff : 0xff,
    poolMin: ctx.pool.minValue,
    poolRange,
    payload: ctx.pool.spec.payload,
    border: ctx.pool.spec.border,
    storedZ: ctx.pool.spec.stored[2],
    spacing: picked.spacing,
  });

  const tubeJobOptions = (tube: TubeOptions): SkeletonTubeJob["tube"] => ({
    iso: tube.iso,
    clampValue: tube.clampValue,
    maxVertices: tube.maxVertices ?? GPU_MAX_TUBE_VERTICES,
    smoothVoxels: tube.smoothVoxels,
    connectivity: tube.connectivity ?? undefined,
    marcher: tube.marcher,
  });

  const levelMapped = (picked: PickedCorridor): boolean =>
    ctx.pool.pageTable.layout.levelOffset[picked.level] !== undefined;

  return {
    kind: "gpu",
    maxCorridorVoxels: MAX_CORRIDOR_VOXELS,
    maxTubeVertices: GPU_MAX_TUBE_VERTICES,

    async centerline(request: CenterlineRequest): Promise<CenterlineResult | null> {
      if (!skeletonizer.ready() || !levelMapped(request.picked)) return null;
      const result = await skeletonizer.run({
        ...jobBase(request.picked, request),
        seed: request.seed,
        tube: request.tube ? tubeJobOptions(request.tube) : undefined,
      });
      if (!result) return null;
      return {
        field: { dist: result.dist, pred: result.pred },
        holes: result.holes,
        tube: result.tube,
      };
    },

    async tube(request: TubeRequest): Promise<LevelTube | null> {
      if (!skeletonizer.tubeReady(request.tube.marcher) || !levelMapped(request.picked)) return null;
      return skeletonizer.extractTube({
        ...jobBase(request.picked, request),
        tube: tubeJobOptions(request.tube),
      });
    },
  };
}
