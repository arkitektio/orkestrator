import { useCallback, useRef } from "react";

import { useBrushSkeleton } from "../../annotations/enhancers/paths/brushSkeleton/useBrushSkeleton";
import { useBrushSkeletonStoreApi } from "../brush";
import { useMeshDesignStoreApi } from "../store/meshDesignStore";
import { reconstruct } from "./run";

/**
 * Re-run the LAST reconstruction on the gesture it was built from, with the
 * settings as they are NOW — what a slider move, a reconstructor switch and
 * the Re-run button all mean. The new result replaces the old one in place.
 *
 * SINGLE-FLIGHT: there is never more than one re-run going. A call that
 * arrives while one is running only marks it dirty, and exactly one more
 * run follows it with whatever the settings are by then — ten slider ticks
 * cost two reconstructions, not ten racing ones. A run whose reconstruction
 * is no longer the newest act (another gesture, an edit, an undo) is stale
 * and applies nothing; a failed re-run keeps the old result and says why.
 */
export const useReconstructRerun = () => {
  const { resolveContext } = useBrushSkeleton();
  const brushApi = useBrushSkeletonStoreApi();
  const designApi = useMeshDesignStoreApi();
  const runningRef = useRef(false);
  const dirtyRef = useRef(false);

  return useCallback(async () => {
    if (runningRef.current) {
      dirtyRef.current = true;
      return;
    }
    runningRef.current = true;
    try {
      do {
        dirtyRef.current = false;
        const design = designApi.getState();
        const last = design.last;
        if (!last) return;
        const stale = () => designApi.getState().last?.id !== last.id;
        design.setRetuning(true);
        const outcome = await reconstruct({
          gestureKind: last.gestureKind,
          gesture: last.gesture,
          layerId: last.layerId,
          extraction: resolveContext(last.layerId),
          brush: brushApi.getState(),
          design,
          stale,
          publishLive: () => {},
          retune: last,
        });
        if (outcome && !outcome.ok) {
          const after = designApi.getState();
          after.setStatus(after.status, outcome.message);
        }
      } while (dirtyRef.current);
    } finally {
      runningRef.current = false;
      // Whatever ended the loop, nothing is running any more.
      if (designApi.getState().retuning) designApi.getState().setRetuning(false);
    }
  }, [resolveContext, brushApi, designApi]);
};
