import { useEffect, useRef } from "react";
import { useSceneStoreApi } from "../../../platform/stores/sceneStore";

import { useViewStoreApi } from "../../../platform/stores/viewStore";
import { createBrickSystem } from "./brickSystem";
import { useBrickStoreApi } from "../store/brickSlice";

/**
 * Starts the brick system OUTSIDE the R3F canvas, so chunk fetching begins
 * before the WebGPU device exists.
 *
 * The cold open used to serialize the network behind the GPU: `<Canvas>`'s `gl`
 * factory awaits `renderer.init()`, no canvas child mounts until it resolves,
 * and the residency manager lived in one of those children. Meanwhile the node
 * planner — which sits outside the canvas — had already emitted plan #1 (the
 * whole coarsest level, no camera required, no debounce) and it just sat there
 * with no consumer.
 *
 * Nothing in fetch → decode → repack touches the renderer; the result is a CPU
 * buffer that waits in `pool.queue` for a drain. So the manager starts here, and
 * `BrickSystemProvider` binds the renderer to it once the canvas has one.
 *
 * Mount ORDER is not load-bearing in either direction: `manager.start()`
 * subscribes to plans AND immediately reconciles whatever is already published.
 *
 * Was a kill switch; settled ON (OCTREE_RENDERER.md §6.9), read ONCE at mount: off,
 * this renders nothing and the provider constructs the system itself, exactly
 * as before.
 */
export function BrickSystemHost() {
  const viewerStore = useBrickStoreApi();
  const sceneStore = useSceneStoreApi();
  const viewStore = useViewStoreApi();

  // Read once per mount, not per render: a mid-session toggle must not tear
  // down a running system (and the DebugPanel tooltip says "next scene open").
  const enabledRef = useRef<boolean | null>(null);
  if (enabledRef.current === null) enabledRef.current = true;

  useEffect(() => {
    if (!enabledRef.current) return;
    const system = createBrickSystem({ viewerStore, sceneStore, viewStore });
    return () => system.dispose();
  }, [viewerStore, sceneStore, viewStore]);

  return null;
}
