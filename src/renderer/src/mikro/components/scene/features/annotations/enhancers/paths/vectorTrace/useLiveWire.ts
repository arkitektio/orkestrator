import { useCallback, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

import { liveWireDispatcher } from "./liveWireDispatcher";
import {
  layerLocalToVoxel,
  planTraceBox,
  traceDepthPlan,
  traceNodeInBox,
  traceNodeOf,
  type TraceBox,
  type TraceDepth,
} from "./traceBox";
import { traceTreePath } from "./traceSearch";
import {
  traceNodesToWorld,
  useTraceLayerContext,
  type TraceLayerContext,
  type TraceWaypoint,
} from "./useTraceHop";
import { useRoiDrawingStoreApi } from "../../../roiDrawingStore";

/**
 * The live-wire: once an anchor is placed in the flat view, the rubber band
 * follows the structure from it to the pointer instead of running straight.
 *
 * `start` reads a window around the anchor (sized by the caller to roughly
 * the screen) out of the residency manager — the only part that must stay on
 * the main thread — and hands it to the worker, which grows the Dijkstra tree
 * (`traceSearch.growTraceTree`). Every pointer move after that is `pathTo`: a
 * walk back through the tree, no search. Until the tree arrives, and wherever
 * the pointer leaves its window, `pathTo` answers null and the band stays
 * straight — the click then traces its edge the ordinary way (`useTraceHop`).
 *
 * The tree is built without the straightness term (it has no goal to be
 * straight towards), so a live-wire edge answers to Bright, Edges and Invert
 * only.
 */

/**
 * Node ceiling for one window. Smaller than a hop's: the window is read on
 * the main thread at every click, and it is a whole screen rather than the
 * span of two clicks — the level picker coarsens it to fit.
 */
const LIVE_WIRE_MAX_NODES = 400_000;

type LiveTree = {
  seed: TraceWaypoint;
  context: TraceLayerContext;
  box: TraceBox;
  cameFrom: Int32Array;
};

export type LiveWireStart = {
  depth: TraceDepth;
  /** How far from the anchor the window reaches, world units (x/y). */
  radiusWorld: number;
  /** Called once the tree is in hand, so the band can catch up. */
  onReady: () => void;
};

export const useLiveWire = () => {
  const resolveLayer = useTraceLayerContext();
  const roiDrawingApi = useRoiDrawingStoreApi();
  const treeRef = useRef<LiveTree | null>(null);
  /** Bumped by every start/cancel: a tree from an older anchor is dropped. */
  const generationRef = useRef(0);

  const cancel = useCallback(() => {
    generationRef.current += 1;
    treeRef.current = null;
  }, []);

  useEffect(() => cancel, [cancel]);

  const start = useCallback(
    (seed: TraceWaypoint, options: LiveWireStart) => {
      cancel();
      const generation = generationRef.current;
      const context = resolveLayer(seed.layerId);
      if (!context) return;

      const minVoxel = Math.min(...context.voxelSize) || 1;
      const box = planTraceBox({
        start: seed.voxel,
        goal: seed.voxel,
        shape: context.shape,
        voxelSize: context.voxelSize,
        levelSteps: context.levelSteps,
        margin: 0,
        minPad: options.radiusWorld / minVoxel,
        planarPad: true,
        maxNodes: LIVE_WIRE_MAX_NODES,
        ...traceDepthPlan(options.depth),
      });

      void liveWireDispatcher()
        .grow({
          values: context.extract(box),
          size: box.size,
          spacing: box.spacing,
          weights: roiDrawingApi.getState().traceWeights,
          seed: traceNodeOf(box, seed.voxel),
        })
        .then(
          (cameFrom) => {
            if (!cameFrom || generation !== generationRef.current) return;
            treeRef.current = { seed, context, box, cameFrom };
            options.onReady();
          },
          // A failed tree only means a straight band; the click still traces.
          (error) => console.warn("live-wire tree failed", error),
        );
    },
    [cancel, resolveLayer, roiDrawingApi],
  );

  /**
   * The traced route from the anchor to `world`, both ends included and
   * exact, or null when there is no tree yet or it cannot answer there.
   */
  const pathTo = useCallback((world: THREE.Vector3): THREE.Vector3[] | null => {
    const tree = treeRef.current;
    if (!tree) return null;
    const local = world.clone().applyMatrix4(tree.context.inverse);
    const voxel = layerLocalToVoxel([local.x, local.y, local.z], tree.context.shape);
    if (!voxel) return null;
    const node = traceNodeInBox(tree.box, voxel);
    if (!node) return null;
    const nodes = traceTreePath(tree.cameFrom, tree.box.size, node);
    if (!nodes) return null;
    return traceNodesToWorld(tree.context, tree.box, nodes, tree.seed.world, [
      world.x,
      world.y,
      world.z,
    ]);
  }, []);

  /** The level the current tree searched at, or null while there is none. */
  const level = useCallback((): number | null => treeRef.current?.box.level ?? null, []);

  return useMemo(
    () => ({ start, pathTo, cancel, level }),
    [start, pathTo, cancel, level],
  );
};
