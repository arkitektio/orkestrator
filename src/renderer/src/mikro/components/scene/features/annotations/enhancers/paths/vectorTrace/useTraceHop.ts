import { useCallback } from "react";
import * as THREE from "three";

import { buildAffineMatrix } from "../../../../../platform/coords/worldTransform";
import { effectiveHitLayerId } from "../../../../../platform/probe/probeTargeting";
import { simplifyPath, type PathPoint } from "../../shared/pathSimplify";
import { buildTraceCost, type TraceWeights } from "./traceCost";
import {
  extractTraceValues,
  layerLocalToVoxel,
  planTraceBox,
  traceDepthPlan,
  traceNodeOf,
  traceVoxelOf,
  voxelToLayerLocal,
  type TraceBox,
  type TraceDepth,
  type Voxel,
} from "./traceBox";
import { voxelWorldSize } from "../../shared/planning";
import { findTracePath, type TraceNode } from "./traceSearch";
import {
  traceChannelSlab,
  traceLayerShape,
  traceLevelSteps,
  type TraceHopFailure,
} from "../../shared/traceLayer";
import { useRoiDrawingStoreApi } from "../../../roiDrawingStore";
import { useSceneStoreApi } from "../../../../../platform/stores/sceneStore";

import { useBrickStoreApi } from "../../../../bricks/store/brickSlice";

/**
 * One edge of the vector enhancer: two probed waypoints in, the path the data
 * suggests between them out, in world coordinates.
 *
 * This is the impure shell around `features/annotations/enhancers/paths/vectorTrace/` — it decides WHICH layer, WHICH
 * channel and WHICH pyramid level to ask about, reads the voxels out of the
 * residency manager, and converts the answer back to world space. All of the
 * arithmetic lives in the pure modules.
 *
 * Nothing here subscribes: the drawer calls it at click time, and every input is
 * read from a store API then. A subscription would re-render the drawer on every
 * probe tick for state only a click ever consumes.
 */

/** A waypoint is a probe result: the world point AND the voxel it landed on. */
export type TraceWaypoint = {
  layerId: string;
  voxel: Voxel;
  world: [number, number, number];
};

export type TraceHopResult =
  | { ok: true; points: THREE.Vector3[]; level: number; expanded: number }
  | { ok: false; reason: TraceHopFailure };

/**
 * How far a simplified path may drift from the one that was found, as a
 * fraction of one node step. Small enough that the trace still visibly follows
 * what it found, large enough to collapse the staircase of a diagonal run.
 */
const SIMPLIFY_TOLERANCE_STEPS = 0.5;

/**
 * Everything a trace needs about the layer it runs through, resolved from the
 * stores in one go — the hop, the stroke snap and the live-wire window all
 * start here.
 */
export type TraceLayerContext = {
  layerId: string;
  shape: [number, number, number];
  affine: THREE.Matrix4;
  inverse: THREE.Matrix4;
  /** World length of one level-0 voxel per axis. */
  voxelSize: [number, number, number];
  levelSteps: [number, number, number][];
  /** Read a box's values out of the residency manager. */
  extract: (box: TraceBox) => Float32Array;
};

export const useTraceLayerContext = () => {
  const sceneStoreApi = useSceneStoreApi();
  const viewerStoreApi = useBrickStoreApi();

  return useCallback(
    (layerId: string): TraceLayerContext | null => {
      const layer = sceneStoreApi
        .getState()
        .layers.find((candidate) => candidate.id === layerId);
      const brickSystem = viewerStoreApi.getState().brickSystem;
      const shape = layer ? traceLayerShape(layer) : null;
      if (!layer || !brickSystem || !shape) return null;

      const affine = buildAffineMatrix(layer);
      const channel = traceChannelSlab(layer);
      return {
        layerId,
        shape,
        affine,
        inverse: affine.clone().invert(),
        // Both anisotropy inputs come from the data itself: the affine's basis
        // lengths for how long a voxel is, and the pyramid's own shapes for how
        // much each level actually coarsens each axis.
        voxelSize: voxelWorldSize(affine),
        levelSteps: traceLevelSteps(layer),
        extract: (box) =>
          extractTraceValues(box, (voxel) =>
            brickSystem.sampleResident(layer.id, voxel, box.level, channel),
          ),
      };
    },
    [sceneStoreApi, viewerStoreApi],
  );
};

/**
 * A found node path → world points, simplified.
 *
 * The ENDS are replaced by the waypoints' own world points: those lie exactly
 * where the user clicked, and rounding them to a node centre would visibly
 * detach the chain's joints from the clicks that made them.
 */
export function traceNodesToWorld(
  context: Pick<TraceLayerContext, "shape" | "affine">,
  box: TraceBox,
  nodes: readonly TraceNode[],
  from: readonly [number, number, number],
  to: readonly [number, number, number],
): THREE.Vector3[] {
  const world = nodes.map((node) => {
    const local = voxelToLayerLocal(traceVoxelOf(box, node), context.shape);
    const point = new THREE.Vector3(...local).applyMatrix4(context.affine);
    return [point.x, point.y, point.z] as PathPoint;
  });
  if (world.length === 1) world.push(world[0]);
  world[0] = [from[0], from[1], from[2]];
  world[world.length - 1] = [to[0], to[1], to[2]];

  const tolerance =
    SIMPLIFY_TOLERANCE_STEPS * Math.min(box.spacing[0], box.spacing[1], box.spacing[2]);
  return simplifyPath(world, tolerance).map(
    (point) => new THREE.Vector3(point[0], point[1], point[2]),
  );
}

/** How deep a hop searches, and which view its waypoints came from. */
export type TraceHopOptions = { depth: TraceDepth; view: "2D" | "3D" };

const planHop = (
  context: TraceLayerContext,
  from: TraceWaypoint,
  to: TraceWaypoint,
  options: TraceHopOptions,
): TraceBox =>
  planTraceBox({
    start: from.voxel,
    goal: to.voxel,
    shape: context.shape,
    voxelSize: context.voxelSize,
    levelSteps: context.levelSteps,
    ...traceDepthPlan(options.depth, options.view),
  });

/**
 * The pyramid level a hop between these waypoints WOULD search at — planning
 * only, nothing is read. The drawer weighs it against the live-wire tree's
 * level: a band grown over a whole screen may have had to coarsen far past
 * what two nearby clicks need.
 */
export const useTraceHopLevel = () => {
  const resolveLayer = useTraceLayerContext();
  return useCallback(
    (from: TraceWaypoint, to: TraceWaypoint, options: TraceHopOptions): number | null => {
      if (from.layerId !== to.layerId) return null;
      const context = resolveLayer(from.layerId);
      return context ? planHop(context, from, to, options).level : null;
    },
    [resolveLayer],
  );
};

export const useTraceHop = () => {
  const resolveLayer = useTraceLayerContext();
  const roiDrawingApi = useRoiDrawingStoreApi();

  return useCallback(
    (
      from: TraceWaypoint,
      to: TraceWaypoint,
      options: TraceHopOptions,
    ): TraceHopResult => {
      // A chain that wanders onto another layer would be tracing two different
      // spaces into one annotation. The first waypoint's layer owns the hop.
      if (from.layerId !== to.layerId) return { ok: false, reason: "layer-changed" };

      const context = resolveLayer(from.layerId);
      if (!context) return { ok: false, reason: "no-layer" };

      const box = planHop(context, from, to, options);

      const values = context.extract(box);
      const start = traceNodeOf(box, from.voxel);
      const goal = traceNodeOf(box, to.voxel);
      const weights: TraceWeights = roiDrawingApi.getState().traceWeights;
      const cost = buildTraceCost({
        values,
        size: box.size,
        spacing: box.spacing,
        weights,
        start,
        goal,
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
    [resolveLayer, roiDrawingApi],
  );
};

/**
 * Turning a click into a waypoint.
 *
 * 3D goes through the probe, which already carries the layer AND the voxel it
 * landed on — no inversion, and the point is exactly where the ray met the
 * data. 2D has no probe in ANNOTATE mode, only a world point on the drawn
 * slice, so the point is resolved against THE hit target layer
 * (`effectiveHitLayerId`) — the same single layer that answers probing.
 * Deliberately no containment fallback: scanning other layers would let one
 * chain's vertices resolve to different layers, the exact ambiguity the
 * single-target rule removes. A click outside the target's extent returns
 * null, which the drawer degrades to a straight edge.
 */
export const useTraceWaypoints = () => {
  const sceneStoreApi = useSceneStoreApi();
  const viewerStoreApi = useBrickStoreApi();

  const fromProbe = useCallback((): TraceWaypoint | null => {
    const probe = viewerStoreApi.getState().probedCoordinate;
    if (!probe?.worldPos) return null;
    return {
      layerId: probe.layerId,
      voxel: probe.voxelIndex,
      world: probe.worldPos,
    };
  }, [viewerStoreApi]);

  const fromWorld = useCallback(
    (world: THREE.Vector3): TraceWaypoint | null => {
      const layers = sceneStoreApi.getState().layers;
      const targetId = effectiveHitLayerId(
        viewerStoreApi.getState(),
        layers,
      );
      const layer = layers.find((candidate) => candidate.id === targetId);
      if (!layer) return null;
      const shape = traceLayerShape(layer);
      if (!shape) return null;

      const inverse = buildAffineMatrix(layer).invert();
      const local = world.clone().applyMatrix4(inverse);
      const voxel = layerLocalToVoxel([local.x, local.y, local.z], shape);
      if (!voxel) return null; // the click is outside the target's extent

      return { layerId: layer.id, voxel, world: [world.x, world.y, world.z] };
    },
    [sceneStoreApi, viewerStoreApi],
  );

  return { fromProbe, fromWorld };
};

export { traceFailureMessage } from "../../shared/traceLayer";
