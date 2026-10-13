import { useEffect } from "react";
import { X } from "lucide-react";

import { useViewerStore } from "../../platform/stores/viewerStore";

/** How long "why nothing happened" stays up. */
const NOTICE_MS = 3500;

/**
 * The crop box's one piece of chrome: what the gesture expects next while it
 * runs, and a way to remove the box once it is set. Subscribes only to
 * UI-cadence fields — never to the box itself, which moves as its depth is set.
 */
export const CropChip = () => {
  const phase = useViewerStore((s) => s.cropPhase);
  const hasBox = useViewerStore((s) => s.cropBox !== null);
  const notice = useViewerStore((s) => s.cropNotice);
  const clearCrop = useViewerStore((s) => s.clearCrop);
  const clearCropNotice = useViewerStore((s) => s.clearCropNotice);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(clearCropNotice, NOTICE_MS);
    return () => clearTimeout(timer);
  }, [notice, clearCropNotice]);

  const hint =
    phase === "arm"
      ? "Click the first corner of the crop box · Esc cancels"
      : phase === "rect"
        ? "Move to the opposite corner, then click · Esc cancels"
        : phase === "depth"
          ? "Move up or down to set the depth, then click · Esc cancels"
          : notice === "edge-on"
            ? "Tilt the view towards the XY plane to draw a crop box"
            : null;

  if (!hint && !hasBox) return null;

  return (
    <div className="absolute bottom-24 left-1/2 z-30 -translate-x-1/2 flex items-center gap-2 rounded-md bg-black/60 px-2 py-1 text-[10px] text-white/80 backdrop-blur-sm">
      {hint ? (
        <span className={phase === "idle" ? "text-amber-300/90" : undefined}>{hint}</span>
      ) : (
        <>
          <span>Cropped to a box</span>
          <button
            type="button"
            onClick={clearCrop}
            title="Remove the crop box (Shift+S)"
            className="flex items-center gap-0.5 rounded px-1 text-white/70 hover:bg-white/10 hover:text-white"
          >
            <X className="h-3 w-3" />
            Show all
          </button>
        </>
      )}
    </div>
  );
};
