import { ScaleBarView } from "@/core/lib/scene/chrome/ScaleBar";
import { useViewerStore } from "../../platform/stores/viewerStore";
import { useSceneStore } from "../../platform/stores/sceneStore";
import { isPhysicalUnit, unitLabel as resolveUnitLabel } from "../../platform/coords/sceneUnits";

export const ScaleBar = () => {
  const show = useViewerStore((s) => s.showScaleBar);
  const worldUnitsPerPixel = useViewerStore((s) => s.worldUnitsPerPixel);
  const spatialUnit = useSceneStore((s) => s.spatialUnit);

  if (!show) return null;
  // A pixel-grid world measures nothing physical — a ruler would just restate
  // indices, so the bar only exists where the world carries a real unit.
  if (!isPhysicalUnit(spatialUnit)) return null;

  return (
    <ScaleBarView
      worldUnitsPerPixel={worldUnitsPerPixel}
      unitLabel={resolveUnitLabel(spatialUnit)}
    />
  );
};
