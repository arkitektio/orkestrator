import { ScaleBarView } from "@/lib/scene/chrome/ScaleBar";
import { useMorphologyStore } from "../stores/morphologyStore";

/** The shared ruler, fed by the canvas's µm-per-pixel readout. */
export const MorphologyScaleBar = () => {
  const show = useMorphologyStore((s) => s.hud.scaleBar);
  const worldUnitsPerPixel = useMorphologyStore((s) => s.worldUnitsPerPixel);
  if (!show) return null;
  return <ScaleBarView worldUnitsPerPixel={worldUnitsPerPixel} unitLabel="µm" />;
};
