import { useModeStore } from "../../platform/stores/modeStore";
import { useSceneStore } from "../../platform/stores/sceneStore";
import { useSceneDisplayRemap } from "../../platform/stores/sceneDisplayRemap";
import { isRemapActive } from "../../platform/model/displayRemap";
import { depthRampCssStops } from "../../features/bricks/shaderspec/depthCode";

/** Drawn from the shader's own CPU mirror, so the bar cannot drift from the image. */
const GRADIENT = `linear-gradient(to right, ${depthRampCssStops()})`;

/**
 * The key to the depth view (hold Q / Shift+Q). The ramp spans the visible
 * scene's depth along the view axis (cut to the crop box), shared by every
 * layer, so equal hues mean equal distance from the camera whichever image
 * they come from. Both views are relief-shaded: lit by a surface normal taken
 * from the depth of neighbouring rays, so shape reads without the colormap.
 */
export const DepthCodeLegend = () => {
  const view = useModeStore((s) => (s.displayMode === "3D" ? s.depthView : null));
  const sceneId = useSceneStore((s) => s.id);
  const remap = useSceneDisplayRemap(sceneId);
  if (!view) return null;
  return (
    <div className="pointer-events-none absolute bottom-24 left-8 z-10 flex flex-col gap-0.5 rounded bg-black/40 px-1.5 py-1 font-mono text-[10px] text-white">
      {view === "hues" ? (
        <>
          <span className="text-white/70">Depth from camera</span>
          <div className="h-2 w-40 rounded-sm" style={{ backgroundImage: GRADIENT }} />
          <div className="flex w-40 justify-between text-white/70">
            <span>near</span>
            <span>far</span>
          </div>
          <span className="text-white/50">shaded by surface shape</span>
        </>
      ) : (
        <span className="text-white/70">Relief: shaded by surface shape</span>
      )}
      {isRemapActive(remap) && (
        <span className="text-white/50">axis remap on: depth is display-scaled</span>
      )}
    </div>
  );
};
