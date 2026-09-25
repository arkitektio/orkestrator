import { EXCLUDE_FROM_CAPTURE } from "@/core/lib/scene/capture/captureVisibility";
import { useViewerStore } from "../../platform/stores/viewerStore";
import { Line } from "@/core/lib/scene/draw/Line";

/**
 * The origin crosshair: X in red, Y in green, marking where the stage is.
 *
 * Excluded from captures — it orients you while you work, but in a saved PNG or
 * an exported animation it reads as data that isn't there.
 */
export const SceneAxis = () => {
  // Toggled from the scene's view-settings popover, alongside the scale bar and
  // grid — it used to be a side effect of an interaction mode.
  const showSceneAxis = useViewerStore((s) => s.showSceneAxis);

  if (!showSceneAxis) return null;

  const stageRangeX = 400;
  const stageRangeY = 400;

  return (
    <group userData={{ [EXCLUDE_FROM_CAPTURE]: true }}>
      <Line
        points={[
          [-stageRangeX / 2, 0, 0.1],
          [stageRangeX / 2, 0, 0.1],
        ]}
        color="#ef4444"
        lineWidth={1}
      />
      <Line
        points={[
          [0, -stageRangeY / 2, 0.1],
          [0, stageRangeY / 2, 0.1],
        ]}
        color="#22c55e"
        lineWidth={1}
      />
    </group>
  );
};
