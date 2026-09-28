import {
  buildCostField,
  connectivityFromCost,
  maskFieldByDistance,
  type CostFieldResult,
} from "./corridorCost";
import { smoothCostField } from "./fieldSmooth";
import { geodesicField } from "./geodesicReference";
import { marcherFor } from "../meshes/marcher";
import type { Vec3 } from "./strokeModel";
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
 * The CPU skeleton engine: the `features/annotations/enhancers/shared` reference pipeline, verbatim
 * — cost field from `sampleResident`, Dijkstra geodesic, box-blur smoothing,
 * connectivity mask, tet march. It is BOTH the fallback (no device, dead
 * pipelines, corridor within its smaller budget) and the parity truth the
 * GPU engine is pinned against (`computeSkeletonSelfTest`).
 *
 * Everything runs synchronously on the caller's thread, which is why
 * `maxCorridorVoxels` sits well under the GPU engine's budget — a click may
 * pay tens of milliseconds here, never seconds.
 */

export const CPU_MAX_CORRIDOR_VOXELS = 1_000_000;
export const CPU_MAX_TUBE_VERTICES = 240_000;

export function createCpuSkeletonEngine(ctx: SkeletonEngineContext): SkeletonEngine {
  const windowRange = Math.max(ctx.window.max - ctx.window.min, 1e-5);

  /** Windowed-intensity sampler over a picked corridor's level. */
  const samplerFor =
    (picked: PickedCorridor) =>
    (levelVoxel: Vec3): number | null => {
      const raw = ctx.sampleResident(
        [
          levelVoxel[0] * picked.step[0],
          levelVoxel[1] * picked.step[1],
          levelVoxel[2] * picked.step[2],
        ],
        picked.level,
        ctx.channel,
      );
      if (raw === null) return null;
      return Math.min(1, Math.max(0, (raw - ctx.window.min) / windowRange));
    };

  const buildField = (request: {
    picked: PickedCorridor;
    strokeLevelPts: Vec3[];
    radiusWorld: number;
    weights: CenterlineRequest["weights"];
  }): CostFieldResult =>
    buildCostField({
      box: request.picked.box,
      strokeLevelPts: request.strokeLevelPts,
      radiusWorld: request.radiusWorld,
      spacing: request.picked.spacing,
      weights: request.weights,
      sample: samplerFor(request.picked),
    });

  /** Smooth → connectivity mask → march, over an already-built cost field. */
  const tubeFromCost = (
    cost: Float32Array,
    picked: PickedCorridor,
    tube: TubeOptions,
  ): LevelTube => {
    let field =
      tube.smoothVoxels >= 1
        ? smoothCostField({
            cost,
            box: picked.box,
            radius: tube.smoothVoxels,
            clampValue: tube.clampValue,
          })
        : cost;
    if (tube.connectivity) {
      // Binary field → geodesic dark distance from the seed → mask. The
      // connectivity ALWAYS derives from the unsmoothed field — the blur is
      // presentation, the gap decision is data.
      const connect = geodesicField({
        cost: connectivityFromCost(cost, tube.iso),
        box: picked.box,
        spacing: picked.spacing,
        seed: tube.connectivity.seed,
      });
      field = maskFieldByDistance(
        field,
        connect.dist,
        tube.connectivity.gapLimitWorld,
        tube.clampValue,
      );
    }
    return marcherFor(tube.marcher).march({
      cost: field,
      box: picked.box,
      iso: tube.iso,
      maxVertices: tube.maxVertices ?? CPU_MAX_TUBE_VERTICES,
    });
  };

  return {
    kind: "cpu",
    maxCorridorVoxels: CPU_MAX_CORRIDOR_VOXELS,
    maxTubeVertices: CPU_MAX_TUBE_VERTICES,

    async centerline(request: CenterlineRequest): Promise<CenterlineResult> {
      const built = buildField(request);
      const field = geodesicField({
        cost: built.cost,
        box: request.picked.box,
        spacing: request.picked.spacing,
        seed: request.seed,
      });
      const tube = request.tube
        ? tubeFromCost(built.cost, request.picked, request.tube)
        : null;
      return { field, holes: built.holes, tube };
    },

    async tube(request: TubeRequest): Promise<LevelTube> {
      const built = buildField(request);
      return tubeFromCost(built.cost, request.picked, request.tube);
    },
  };
}
