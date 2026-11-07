import { useThree } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo } from "react";
import * as THREE from "three";
import { bindFields } from "@/core/data/scene/stores/bindStore";
import { createSettler } from "@/core/data/scene/perf/settle";
import { usePlaneStoreApi } from "./planeStore";

/** How long a gesture must pause before its view is committed (as the 1-D camera). */
export const PLANE_COMMIT_SETTLE_MS = 120;

/**
 * The camera of a plane: an orthographic projection of the store's LIVE view,
 * and nothing else -- no state of its own, so nothing to drift. Bound with a
 * vanilla subscription on the four scalars (P17), so a pan re-renders nothing in
 * React; a settler then commits the view once the gesture pauses.
 */
export const PlaneCamera = () => {
  const set = useThree((s) => s.set);
  const invalidate = useThree((s) => s.invalidate);
  const size = useThree((s) => s.size);
  const planeApi = usePlaneStoreApi();

  const camera = useMemo(() => {
    const c = new THREE.OrthographicCamera(0, 1, 1, 0, -10, 10);
    // r3f would otherwise rewrite the frustum to the canvas' pixel size.
    (c as THREE.OrthographicCamera & { manual?: boolean }).manual = true;
    c.position.set(0, 0, 5);
    c.lookAt(0, 0, 0);
    return c;
  }, []);

  useLayoutEffect(() => {
    set({ camera });
  }, [camera, set]);

  useEffect(() => {
    planeApi.getState().setSize({ width: size.width, height: size.height });
  }, [size.width, size.height, planeApi]);

  useEffect(
    () =>
      bindFields(
        planeApi,
        [(s) => s.live.x0, (s) => s.live.x1, (s) => s.live.y0, (s) => s.live.y1],
        () => {
          const { live } = planeApi.getState();
          camera.left = live.x0;
          camera.right = live.x1;
          camera.top = live.y1;
          camera.bottom = live.y0;
          camera.updateProjectionMatrix();
          invalidate();
        },
      ),
    [camera, planeApi, invalidate],
  );

  useEffect(() => {
    const settler = createSettler<null>({ delayMs: PLANE_COMMIT_SETTLE_MS, emit: () => planeApi.getState().commit() });
    const unsubscribe = planeApi.subscribe((state, previous) => {
      if (state.live !== previous.live) settler.push(null);
    });
    return () => {
      unsubscribe();
      settler.cancel();
    };
  }, [planeApi]);

  return null;
};
