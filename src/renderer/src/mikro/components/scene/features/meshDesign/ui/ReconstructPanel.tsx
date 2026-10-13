import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

import { Button } from "@/core/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/core/ui/toggle-group";
import { useBrushSkeletonStore, useBrushSkeletonStoreApi } from "../brush";
import { ParamRow } from "../../annotations/enhancers/shared/ParamRow";
import { SurfaceQualityControls } from "../../annotations/enhancers/shared/SurfaceQualityControls";
import { reconstructorById, reconstructorsFor } from "../reconstruct/registry";
import { reconstructKey } from "../reconstruct/settings";
import { useReconstructRerun } from "../reconstruct/useReconstructRerun";
import { useMeshDesignStore, type ReconstructGesture, type ReconstructorId } from "../store/meshDesignStore";
import { RECONSTRUCTOR_PANELS } from "./reconstructPanels";

/** How long the settings must rest before the reconstruction is rebuilt. */
const RERUN_DEBOUNCE_MS = 300;

/**
 * The panel of the two reconstruct tools (trace / seed): which reconstructor
 * turns the gesture into a mesh, and that reconstructor's knobs.
 *
 * A reconstruction is added the moment it is built, and stays LIVE until the
 * next act: it carries the settings it was built with (`paramsKey`), and
 * whenever the settings on screen stop matching — a slider moved, another
 * reconstructor was picked — it is rebuilt from the same gesture, in place.
 * So the loop is "gesture once, tune until it fits, move on"; ⌘Z takes it
 * back. The rebuild waits for the pointer to come UP: a slider being dragged
 * updates its readout live, and reconstructs once, where it was let go.
 */
export const ReconstructPanel = ({ gesture }: { gesture: ReconstructGesture }) => {
  const selected = useMeshDesignStore((s) => s.reconstructors[gesture]);
  const setReconstructor = useMeshDesignStore((s) => s.setReconstructor);
  const params = useMeshDesignStore((s) => s.reconstructParams);
  const last = useMeshDesignStore((s) => (s.last?.gestureKind === gesture ? s.last : null));
  const busy = useMeshDesignStore((s) => s.retuning);
  const status = useBrushSkeletonStore((s) => s.status);
  const brushMessage = useBrushSkeletonStore((s) => s.message);
  // A failed gesture is still in the brush store: after moving a slider it
  // can be tried again without drawing it again.
  const canRetry = useBrushSkeletonStore(
    (s) => s.status === "error" && s.strokeVersion >= (gesture === "stroke" ? 2 : 1),
  );
  const brushApi = useBrushSkeletonStoreApi();
  // The settings one field at a time, NOT a key built inside one selector:
  // the brush store is written at pointer cadence while a stroke is painted,
  // and a selector runs on every write.
  const radiusWorld = useBrushSkeletonStore((s) => s.radiusWorld);
  const weights = useBrushSkeletonStore((s) => s.weights);
  const tubeThreshold = useBrushSkeletonStore((s) => s.tubeThreshold);
  const detailVoxels = useBrushSkeletonStore((s) => s.detailVoxels);
  const marcher = useBrushSkeletonStore((s) => s.marcher);
  const polishIterations = useBrushSkeletonStore((s) => s.polishIterations);
  const blobSmoothness = useBrushSkeletonStore((s) => s.blobSmoothness);
  const blobGap = useBrushSkeletonStore((s) => s.blobGap);
  const liveKey = useMemo(
    () =>
      reconstructKey(
        selected,
        { radiusWorld, weights, tubeThreshold, detailVoxels, marcher, polishIterations, blobSmoothness, blobGap },
        params,
      ),
    [selected, params, radiusWorld, weights, tubeThreshold, detailVoxels, marcher, polishIterations, blobSmoothness, blobGap],
  );
  // True from a press inside the panel until the pointer comes up anywhere.
  const [pressing, setPressing] = useState(false);
  useEffect(() => {
    if (!pressing) return;
    const release = () => setPressing(false);
    window.addEventListener("pointerup", release);
    window.addEventListener("pointercancel", release);
    return () => {
      window.removeEventListener("pointerup", release);
      window.removeEventListener("pointercancel", release);
    };
  }, [pressing]);
  const rerun = useReconstructRerun();
  const [advanced, setAdvanced] = useState(false);

  const builtKey = last?.paramsKey ?? null;
  useEffect(() => {
    if (pressing || builtKey === null || builtKey === liveKey) return;
    const timer = window.setTimeout(() => void rerun(), RERUN_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [pressing, builtKey, liveKey, rerun]);

  const options = reconstructorsFor(gesture);
  const reconstructor = reconstructorById(selected);
  const Params = RECONSTRUCTOR_PANELS[selected];
  const working = status === "extracting" || busy;

  return (
    <div
      className="pointer-events-auto flex flex-col gap-1 rounded-md bg-background/80 px-2 py-1.5 shadow-md backdrop-blur-sm"
      onPointerDownCapture={() => setPressing(true)}
    >
      <ParamRow label="Build" title="How the data under the gesture becomes a mesh">
        <ToggleGroup
          type="single"
          size="sm"
          value={selected}
          onValueChange={(value) => {
            if (value) setReconstructor(gesture, value as ReconstructorId);
          }}
        >
          {options.map((option) => (
            <ToggleGroupItem
              key={option.id}
              value={option.id}
              className="h-5 px-2 text-[10px]"
              title={option.description}
            >
              {option.title}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </ParamRow>
      <Params />
      <button
        type="button"
        className="flex items-center gap-1 self-start text-[10px] text-muted-foreground hover:text-foreground"
        onClick={() => setAdvanced((open) => !open)}
      >
        {advanced ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        Surface quality
      </button>
      {advanced && <SurfaceQualityControls />}
      {last && (
        <Button
          size="xs"
          variant="outline"
          className="self-start"
          disabled={busy}
          onClick={() => void rerun()}
          title="Reconstruct again from the same gesture — e.g. after more data streamed in"
        >
          Re-run
        </Button>
      )}
      {canRetry && !last && (
        <Button
          size="xs"
          variant="outline"
          className="self-start"
          onClick={() => brushApi.getState().setExtracting()}
          title="Reconstruct the same gesture again with the settings as they are now"
        >
          Try again
        </Button>
      )}
      <span className="max-w-64 text-[10px] text-white/50">
        {brushMessage ? (
          <span className="text-amber-300/90">{brushMessage}</span>
        ) : status === "painting" ? (
          "Release to reconstruct"
        ) : working ? (
          "Reconstructing…"
        ) : last ? (
          <>
            Added — move a slider to refit it, ⌘Z takes it back
            {last.note && <span className="block text-amber-300/90">{last.note}</span>}
          </>
        ) : (
          reconstructor?.description
        )}
      </span>
    </div>
  );
};
