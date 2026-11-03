import { Bone } from "lucide-react";
import { Button } from "@/core/ui/button";
import { Toggle } from "@/core/ui/toggle";
import { useBrushSkeleton } from "./useBrushSkeleton";
import { useBrushSkeletonStore } from "../../brushSkeletonStore";
import { SurfaceQualityControls } from "../../shared/SurfaceQualityControls";
import {
  EnhancerLayout,
  EnhancerOption,
  SkeletonBrushIllustration,
} from "../../shared/EnhancerOption";
import { SliderRow } from "../../shared/ParamRow";

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

  return (
    <EnhancerLayout
      id="intensity-skeleton"
      title="Skeleton brush"
      icon={Bone}
      advanced={{
        explain: (
          <>
            <p>
              The stroke marks a tube of the volume. Inside it, a brightness
              field is built and its centerline — the ridge the bright voxels
              run along — is extracted, then simplified into a path.
            </p>
            <p className="mt-1">
              Radius is how far around the stroke it may search; Bright how
              strongly the line is pulled onto bright voxels.
              {tubeEnabled &&
                " The tube is the isosurface of the same field: Wrap is the brightness it wraps, lower takes in dimmer voxels."}
            </p>
          </>
        ),
        tunes: (
          <>
            {radiusWorld !== null && radiusBounds !== null && (
              <SliderRow
                label="Radius"
                title="How far around the stroke the centerline may search"
                min={radiusBounds[0]}
                max={radiusBounds[1]}
                step={radiusBounds[0] / 4}
                value={radiusWorld}
                readout={radiusWorld.toPrecision(2)}
                onChange={setRadiusWorld}
              />
            )}
            <SliderRow
              label="Bright"
              title="How strongly the centerline is pulled toward bright voxels"
              min={0}
              max={4}
              step={0.05}
              value={weights.intensity}
              readout={weights.intensity.toFixed(2)}
              onChange={(intensity) => setWeights({ intensity })}
            />
            {tubeEnabled && (
              <>
                <SliderRow
                  label="Wrap"
                  title="Brightness threshold the tube surface wraps — lower includes dimmer voxels"
                  min={0.05}
                  max={0.95}
                  step={0.01}
                  value={tubeThreshold}
                  readout={tubeThreshold.toFixed(2)}
                  onChange={setTubeThreshold}
                />
                <SurfaceQualityControls />
              </>
            )}
          </>
        ),
      }}
    >
      <EnhancerOption
        selected
        illustration={<SkeletonBrushIllustration />}
        title="Skeleton brush"
        description="Paint over a bright structure — its centerline becomes a path"
      />
      {/* What comes out, not how: a choice, so it stays in the main column. */}
      <Toggle
        size="sm"
        pressed={tubeEnabled}
        onPressedChange={setTubeEnabled}
        className="h-6 self-start text-[10px]"
        title="Also extract the structure's surface around the centerline as a tube mesh (isosurface of the same brightness field)"
      >
        Also extract a tube surface
      </Toggle>
      {(status === "preview" || status === "saving") && candidate && (
        <div className="flex items-center gap-1">
          <Button
            size="xs"
            variant="default"
            disabled={status === "saving"}
            onClick={() => void save()}
          >
            {status === "saving" ? "Saving…" : "Save"}
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
      <span className="text-[10px] text-muted-foreground">
        {message ? (
          <span className="text-amber-300/90">{message}</span>
        ) : status === "painting" ? (
          "Painting — release to extract the centerline"
        ) : status === "extracting" ? (
          "Extracting centerline…"
        ) : status === "preview" && candidate ? (
          `Centerline: ${candidate.points.length} points at level ${candidate.level}` +
          (candidate.tube ? ` — tube: ${candidate.tube.triangles} triangles` : "")
        ) : (
          "Drag along a bright structure to trace its centerline"
        )}
      </span>
    </EnhancerLayout>
  );
};
