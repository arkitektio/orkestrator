import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import type { SceneRenderer } from "../../../platform/gpu/sceneRenderer";
import { useSceneStoreApi } from "../../../platform/stores/sceneStore";

import { useViewStoreApi } from "../../../platform/stores/viewStore";
import type { BrickResidencyManager } from "./brickResidency";
import { createBrickSystem } from "./brickSystem";
import { useBrickStoreApi } from "../store/brickSlice";

/**
 * The brick system's FRAME DRIVER, inside the R3F canvas.
 *
 * The manager itself is started by `BrickSystemHost`, outside the canvas, so
 * fetching can begin before `renderer.init()` resolves. This component supplies
 * the two things that genuinely need a live canvas — the renderer (atlas writes,
 * page-table flushes, GPU repack) and the demand-frameloop `invalidate` — and
 * runs the per-frame byte-budgeted drain.
 *
 * When `orkestrator.earlyBricks` is off it also CONSTRUCTS the system, exactly
 * as it used to, so the flag reverts the whole hoist rather than half of it.
 */
export function BrickSystemProvider() {
  const gl = useThree((state) => state.gl);
  const invalidate = useThree((state) => state.invalidate);
  const viewerStore = useBrickStoreApi();
  const sceneStore = useSceneStoreApi();
  const viewStore = useViewStoreApi();
  const managerRef = useRef<BrickResidencyManager | null>(null);

  // Must match the host's decision for this mount — read once, same as there.
  const earlyRef = useRef<boolean | null>(null);
  if (earlyRef.current === null) earlyRef.current = true;

  useEffect(() => {
    // The host (outside the canvas) normally built and registered the manager
    // long before this effect runs — R3F awaits the async `gl` factory, so this
    // component mounts well after the host's effect.
    //
    // Own one only if there isn't one: the legacy path (flag off, no host), and
    // as a safety net if the host somehow did not register. Falling back is the
    // difference between "slightly later than optimal" and "a blank scene".
    const existing = earlyRef.current ? viewerStore.getState().brickSystem : null;
    const owned = existing ? null : createBrickSystem({ viewerStore, sceneStore, viewStore });
    const manager = existing ?? owned!.manager;

    managerRef.current = manager;
    // R3F types `gl` as WebGLRenderer; the Canvas factory actually creates a
    // WebGPURenderer (SceneViewport) — the manager reaches the device only
    // through sceneRenderer.ts.
    manager.attachRenderer(gl as unknown as SceneRenderer, invalidate);

    return () => {
      // Detach BEFORE disposing: GPU resources belong to the departing device.
      manager.detachRenderer();
      managerRef.current = null;
      owned?.dispose();
    };
  }, [gl, invalidate, viewerStore, sceneStore, viewStore]);

  useFrame(() => {
    // Mid-gesture frames use the trickle drain policy (no free pass, no GPU
    // dispatch) so uploads never collide with the interaction; the trailing
    // cameraMoving debounce flips false on settle and the backlog drains at
    // full budget.
    managerRef.current?.drainUploads(viewStore.getState().cameraMoving);
  });

  return null;
}
