import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Toggle } from "@/components/ui/toggle";
import { useBrushSkeleton } from "./useBrushSkeleton";
import { useBrushSkeletonStore } from "../../brushSkeletonStore";
import { SurfaceQualityControls } from "../../shared/SurfaceQualityControls";
import { useModeStore } from "../../../../../platform/stores/modeStore";

/**
 * The skeleton brush's params/status/confirm panel — the `intensity-skeleton`
 * entry's `ParamsPanel` in `enhancerRegistry`. Shown whenever the BRUSH tool
 * is armed; the stroke itself is captured in-canvas
 * (`features/annotations/enhancers/paths/brushSkeleton/BrushStrokeSession.tsx`), so this panel only reads
 * gesture-cadence state and issues verdicts (save / discard / re-extract).
 */
export const BrushSkeletonPanel = () => {
  const status = useBrushSkeletonStore((s) => s.status);
  const message = useBrushSkeletonStore((s) => s.message);
  const radiusWorld = useBrushSkeletonStore((s) => s.radiusWorld);
  const radiusBounds = useBrushSkeletonStore((s) => s.radiusBounds);
  const setRadiusWorld = useBrushSkeletonStore((s) => s.setRadiusWorld);
  const weights = useBrushSkeletonStore((s) => s.weights);
  const setWeights = useBrushSkeletonStore((s) => s.setWeights);
  const tubeEnabled = useBrushSkeletonStore((s) => s.tubeEnabled);
  const setTubeEnabled = useBrushSkeletonStore((s) => s.setTubeEnabled);
  const tubeThreshold = useBrushSkeletonStore((s) => s.tubeThreshold);
  const setTubeThreshold = useBrushSkeletonStore((s) => s.setTubeThreshold);
  const candidate = useBrushSkeletonStore((s) => s.candidate);
  const clear = useBrushSkeletonStore((s) => s.clear);
  const { extract, save } = useBrushSkeleton();
  // In DESIGN the verdict adds the surface to the session instead of saving.
  const designing = useModeStore((s) => s.interactionMode) === "DESIGN";

  return (
    <div className="pointer-events-auto flex flex-col gap-1 rounded-md bg-background/80 px-2 py-1.5 shadow-md backdrop-blur-sm">
      {radiusWorld !== null && radiusBounds !== null && (
        <div
          className="flex items-center gap-2"
          title="How far around the stroke the centerline may search"
        >
          <span className="w-12 select-none text-right text-[10px] font-medium uppercase text-muted-foreground">
            Radius
          </span>
          <div className="w-32">
            <Slider
              min={radiusBounds[0]}
              max={radiusBounds[1]}
              step={radiusBounds[0] / 4}
              value={[radiusWorld]}
              onValueChange={([value]) => setRadiusWorld(value)}
            />
          </div>
          <span className="w-8 select-none text-[10px] tabular-nums text-muted-foreground">
            {radiusWorld.toPrecision(2)}
          </span>
        </div>
      )}
      <div
        className="flex items-center gap-2"
        title="How strongly the centerline is pulled toward bright voxels"
      >
        <span className="w-12 select-none text-right text-[10px] font-medium uppercase text-muted-foreground">
          Bright
        </span>
        <div className="w-32">
          <Slider
            min={0}
            max={4}
            step={0.05}
            value={[weights.intensity]}
            onValueChange={([value]) => setWeights({ intensity: value })}
          />
        </div>
        <span className="w-8 select-none text-[10px] tabular-nums text-muted-foreground">
          {weights.intensity.toFixed(2)}
        </span>
      </div>
      <Toggle
        size="sm"
        pressed={tubeEnabled}
        onPressedChange={setTubeEnabled}
        className="h-6 text-[10px]"
        title="Also extract the structure's surface around the centerline as a tube mesh (isosurface of the same brightness field)"
      >
        Tube
      </Toggle>
      {tubeEnabled && (
        <div
          className="flex items-center gap-2"
          title="Brightness threshold the tube surface wraps — lower includes dimmer voxels"
        >
          <span className="w-12 select-none text-right text-[10px] font-medium uppercase text-muted-foreground">
            Wrap
          </span>
          <div className="w-32">
            <Slider
              min={0.05}
              max={0.95}
              step={0.01}
              value={[tubeThreshold]}
              onValueChange={([value]) => setTubeThreshold(value)}
            />
          </div>
          <span className="w-8 select-none text-[10px] tabular-nums text-muted-foreground">
            {tubeThreshold.toFixed(2)}
          </span>
        </div>
      )}
      {(tubeEnabled || designing) && <SurfaceQualityControls />}
      {(status === "preview" || status === "saving") && candidate && (
        <div className="flex items-center gap-1">
          <Button
            size="xs"
            variant="default"
            disabled={status === "saving"}
            onClick={() => void save()}
          >
            {status === "saving" ? "Saving…" : designing ? "Add to design" : "Save"}
          </Button>
          <Button
            size="xs"
            variant="outline"
            disabled={status === "saving"}
            onClick={() => void extract()}
            title="Run the extraction again — e.g. after more data streamed in"
          >
            Re-extract
          </Button>
          <Button
            size="xs"
            variant="outline"
            disabled={status === "saving"}
            onClick={clear}
          >
            Discard
          </Button>
        </div>
      )}
      {status === "error" && (
        <Button size="xs" variant="outline" onClick={clear}>
          Dismiss
        </Button>
      )}
      <span className="text-[10px] text-white/50">
        {message ? (
          <span className="text-amber-300/90">{message}</span>
        ) : status === "painting" ? (
          "Painting — release to extract the centerline"
        ) : status === "extracting" ? (
          "Extracting centerline…"
        ) : status === "preview" && candidate ? (
          candidate.points.length < 2 ? (
            `Grown surface: ${candidate.tube?.triangles ?? 0} triangles at level ${candidate.level}`
          ) : (
            `Centerline: ${candidate.points.length} points at level ${candidate.level}` +
            (candidate.tube ? ` — tube: ${candidate.tube.triangles} triangles` : "")
          )
        ) : (
          "Drag along a bright structure to trace its centerline"
        )}
      </span>
    </div>
  );
};
