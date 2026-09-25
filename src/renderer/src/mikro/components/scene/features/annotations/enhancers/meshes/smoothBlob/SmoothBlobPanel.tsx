import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { useBrushSkeleton } from "../../paths/brushSkeleton/useBrushSkeleton";
import { useBrushSkeletonStore } from "../../brushSkeletonStore";
import { SurfaceQualityControls } from "../../shared/SurfaceQualityControls";
import { useModeStore } from "../../../../../platform/stores/modeStore";

/**
 * The smooth-blob tool's panel — the `smooth-blob` entry's `ParamsPanel` in
 * `enhancerRegistry`. One click on the volume grows a surface from the
 * probed point; the sliders govern where it stops (Wrap), where it starts
 * (Radius) and how rounded the result is (Smooth — a box blur of the field
 * before the surface is marched, so the geometry itself smooths, not just
 * the shading).
 */
export const SmoothBlobPanel = () => {
  const status = useBrushSkeletonStore((s) => s.status);
  const message = useBrushSkeletonStore((s) => s.message);
  const radiusWorld = useBrushSkeletonStore((s) => s.radiusWorld);
  const radiusBounds = useBrushSkeletonStore((s) => s.radiusBounds);
  const setRadiusWorld = useBrushSkeletonStore((s) => s.setRadiusWorld);
  const tubeThreshold = useBrushSkeletonStore((s) => s.tubeThreshold);
  const setTubeThreshold = useBrushSkeletonStore((s) => s.setTubeThreshold);
  const blobSmoothness = useBrushSkeletonStore((s) => s.blobSmoothness);
  const setBlobSmoothness = useBrushSkeletonStore((s) => s.setBlobSmoothness);
  const blobGap = useBrushSkeletonStore((s) => s.blobGap);
  const setBlobGap = useBrushSkeletonStore((s) => s.setBlobGap);
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
          title="Starting search radius — the sphere grows from here until the surface closes"
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
        title="Brightness threshold the surface wraps — lower includes dimmer voxels"
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
      <div
        className="flex items-center gap-2"
        title="Rounds the surface: blurs the brightness field (in voxels) before it is meshed"
      >
        <span className="w-12 select-none text-right text-[10px] font-medium uppercase text-muted-foreground">
          Smooth
        </span>
        <div className="w-32">
          <Slider
            min={0}
            max={4}
            step={1}
            value={[blobSmoothness]}
            onValueChange={([value]) => setBlobSmoothness(value)}
          />
        </div>
        <span className="w-8 select-none text-[10px] tabular-nums text-muted-foreground">
          {blobSmoothness.toFixed(0)}
        </span>
      </div>
      <SurfaceQualityControls />
      <div
        className="flex items-center gap-2"
        title="How wide a dark gap may be (in voxels) and still count as connected — 0 keeps only the structure the click landed on"
      >
        <span className="w-12 select-none text-right text-[10px] font-medium uppercase text-muted-foreground">
          Gap
        </span>
        <div className="w-32">
          <Slider
            min={0}
            max={8}
            step={1}
            value={[blobGap]}
            onValueChange={([value]) => setBlobGap(value)}
          />
        </div>
        <span className="w-8 select-none text-[10px] tabular-nums text-muted-foreground">
          {blobGap.toFixed(0)}
        </span>
      </div>
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
            title="Grow again from the same point — e.g. after moving a slider"
          >
            Re-grow
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
        ) : status === "extracting" ? (
          "Growing the surface…"
        ) : status === "preview" && candidate ? (
          `Surface: ${candidate.tube?.triangles ?? 0} triangles at level ${candidate.level}`
        ) : (
          "Click a bright structure to grow a surface around it"
        )}
      </span>
    </div>
  );
};
