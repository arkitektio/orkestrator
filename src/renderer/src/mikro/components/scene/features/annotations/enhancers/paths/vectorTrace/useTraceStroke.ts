import { useCallback } from "react";
import * as THREE from "three";

import { simplifyPath, type PathPoint } from "../../shared/pathSimplify";
import { buildTraceCost } from "./traceCost";
import { layerLocalToVoxel, planTraceBox, traceDepthPlan, traceNodeOf, type TraceDepth } from "./traceBox";
import { findTracePath } from "./traceSearch";
import {
  traceNodesToWorld,
  useTraceLayerContext,
  useTraceWaypoints,
  type TraceHopResult,
} from "./useTraceHop";
import { useRoiDrawingStoreApi } from "../../../roiDrawingStore";

/**
 * The freehand half of the vector enhancer: a stroke dragged roughly along a
 * structure in, the structure's own route between the stroke's ends out.
 *
 * Same search, same cost and the same sliders as a clicked edge
 * (`useTraceHop`) — only the "straight" reference changes. The stroke takes
 * the chord's place in the straightness term and walls a corridor around it
 * (`traceCost.guideDistances`), so the snap can smooth a shaky hand but never
 * jump to a neighbouring structure the user did not draw along.
 *
 * Like the hop, nothing subscribes: the drawer calls it on release.
 */

/**
 * How many simplified stroke samples the corridor rasterizes. A drag at
 * pointer cadence yields hundreds; the corridor's shape needs a few dozen.
 */
const MAX_GUIDE_POINTS = 96;

export type TraceStrokeOptions = {
  depth: TraceDepth;
  /** How far the snap may stray from the stroke, world units. */
  radiusWorld: number;
};

export const useTraceStroke = () => {
  const resolveLayer = useTraceLayerContext();
  const waypoints = useTraceWaypoints();
  const roiDrawingApi = useRoiDrawingStoreApi();

  return useCallback(
    (stroke: readonly THREE.Vector3[], options: TraceStrokeOptions): TraceHopResult => {
      if (stroke.length < 2) return { ok: false, reason: "blocked-endpoint" };
      const from = waypoints.fromWorld(stroke[0]);
      const to = waypoints.fromWorld(stroke[stroke.length - 1]);
      if (!from || !to) return { ok: false, reason: "blocked-endpoint" };
      if (from.layerId !== to.layerId) return { ok: false, reason: "layer-changed" };

      const context = resolveLayer(from.layerId);
      if (!context) return { ok: false, reason: "no-layer" };

      // Simplify in WORLD units first: the guide only needs the stroke's
      // shape, at a fraction of the corridor's width.
      const simplified = simplifyPath(
        stroke.map((point) => [point.x, point.y, point.z] as PathPoint),
        options.radiusWorld / 4,
      );
      const stride = Math.max(1, Math.ceil(simplified.length / MAX_GUIDE_POINTS));
      const guideWorld = simplified.filter(
        (_, index) => index % stride === 0 || index === simplified.length - 1,
      );

      // Continuous level-0 voxel coordinates for the corridor — it follows
      // the stroke itself, not the voxel centres it happened to cross — and
      // the rounded voxel for the box to hold. Samples off the layer drop out.
      const voxels = guideWorld
        .map((point) => {
          const v = new THREE.Vector3(...point).applyMatrix4(context.inverse);
          const local: [number, number, number] = [v.x, v.y, v.z];
          return {
            exact: [local[0] - 0.5, local[1] - 0.5, local[2] - 0.5] as const,
            rounded: layerLocalToVoxel(local, context.shape),
          };
        })
        .filter((voxel) => voxel.rounded !== null);

      const minVoxel = Math.min(...context.voxelSize);
      const box = planTraceBox({
        start: from.voxel,
        goal: to.voxel,
        through: voxels.map((voxel) => voxel.rounded!),
        shape: context.shape,
        voxelSize: context.voxelSize,
        levelSteps: context.levelSteps,
        margin: 0,
        // The corridor's own width, plus a voxel so the path can round a
        // corner at its wall.
        minPad: options.radiusWorld / (minVoxel || 1) + 1,
        planarPad: true,
        ...traceDepthPlan(options.depth),
      });

      const start = traceNodeOf(box, from.voxel);
      const goal = traceNodeOf(box, to.voxel);
      const cost = buildTraceCost({
        values: context.extract(box),
        size: box.size,
        spacing: box.spacing,
        weights: roiDrawingApi.getState().traceWeights,
        guide: {
          points: voxels.map(({ exact }) => [
            (exact[0] - box.origin[0]) / box.step[0],
            (exact[1] - box.origin[1]) / box.step[1],
            (exact[2] - box.origin[2]) / box.step[2],
          ]),
          // Never narrower than one node: at a coarse level a sub-node
          // corridor would wall off the stroke's own path.
          radius: Math.max(
            options.radiusWorld,
            1.5 * Math.max(box.spacing[0], box.spacing[1]),
          ),
          planar: true,
        },
      });

      const found = findTracePath({ size: box.size, spacing: box.spacing, cost }, start, goal);
      if (!found.ok) return { ok: false, reason: found.reason };

      return {
        ok: true,
        points: traceNodesToWorld(context, box, found.path, from.world, to.world),
        level: box.level,
        expanded: found.expanded,
      };
    },
    [resolveLayer, waypoints, roiDrawingApi],
  );
};
