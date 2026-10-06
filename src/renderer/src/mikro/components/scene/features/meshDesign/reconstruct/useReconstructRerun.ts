import { useCallback, useRef } from "react";

import { useBrushSkeleton } from "../../annotations/enhancers/paths/brushSkeleton/useBrushSkeleton";
import { useBrushSkeletonStoreApi } from "../brush";
import { useMeshDesignStoreApi } from "../store/meshDesignStore";
import { reconstructToCandidate } from "./run";

/**
 * Re-run the pending candidate on the gesture it was built from, with the
 * settings as they are NOW — what a slider move, a reconstructor switch and
 * the Re-run button all mean.
 *
 * SINGLE-FLIGHT: there is never more than one re-run going. A call that
 * arrives while one is running only marks it dirty, and exactly one more
 * run follows it with whatever the settings are by then — ten slider ticks
 * cost two reconstructions, not ten racing ones. A run whose candidate was
 * accepted or discarded meanwhile is stale and applies nothing; a failed
 * re-run keeps the old candidate on screen and says why.
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
        const candidate = design.candidate;
        if (!candidate) return;
        const stale = () => designApi.getState().candidate?.id !== candidate.id;
        design.setCandidateBusy(true);
        const outcome = await reconstructToCandidate({
          gestureKind: candidate.gestureKind,
          gesture: candidate.gesture,
          layerId: candidate.layerId,
          extraction: resolveContext(candidate.layerId),
          brush: brushApi.getState(),
          design,
          stale,
          publishLive: () => {},
        });
        if (outcome && !outcome.ok) {
          const after = designApi.getState();
          after.setCandidateBusy(false);
          after.setStatus(after.status, outcome.message);
        }
      } while (dirtyRef.current);
    } finally {
      runningRef.current = false;
      // Whatever ended the loop, nothing is running any more.
      if (designApi.getState().candidateBusy) designApi.getState().setCandidateBusy(false);
    }
  }, [resolveContext, brushApi, designApi]);
};
