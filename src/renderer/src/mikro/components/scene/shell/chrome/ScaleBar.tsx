import { ScaleBarView } from "@/core/data/scene/chrome/ScaleBar";
import { spatialAxisTriple } from "@/core/data/scene/coords/transformGraph";
import { useViewerStore } from "../../platform/stores/viewerStore";
import { useSceneStore } from "../../platform/stores/sceneStore";
import { isPhysicalUnit, unitLabel as resolveUnitLabel } from "../../platform/coords/sceneUnits";
import { useSceneViewAxes } from "../../platform/stores/sceneViewAxes";
import { useSceneDisplayRemap, useSetSceneDisplayRemap } from "../../platform/stores/sceneDisplayRemap";
import { isRemapActive, remapViewSlot } from "../../platform/model/displayRemap";

/**
 * Says, for as long as it is on, that the scene is drawn with an axis remap
 * (`displayRemap.ts`): a distorted view must never pass for a physical one.
 * A click puts it back to 1×.
 */
const RemapChip = () => {
  const sceneId = useSceneStore((s) => s.id);
  const world = useSceneStore((s) => s.transformContext.worldCoordinateSystem);
  const remap = useSceneDisplayRemap(sceneId);
  const setRemap = useSetSceneDisplayRemap();
  if (!isRemapActive(remap)) return null;
  const axis = (spatialAxisTriple(world)[remap.slot] ?? "?").toUpperCase();
  return (
    <button
      onClick={() => setRemap(sceneId, { ...remap, factor: 1 })}
      title="The scene is drawn with this axis remapped, so lengths along it are not physical. Click to go back to 1×."
      className="absolute bottom-16 left-8 z-10 rounded bg-amber-500/80 px-1.5 py-0.5 font-mono text-[10px] text-black hover:bg-amber-400"
    >
      {axis} ×{remap.factor.toFixed(2)} · display only
    </button>
  );
};

export const ScaleBar = () => {
  const show = useViewerStore((s) => s.showScaleBar);
  const worldUnitsPerPixel = useViewerStore((s) => s.worldUnitsPerPixel);
  const spatialUnit = useSceneStore((s) => s.spatialUnit);
  const sceneId = useSceneStore((s) => s.id);
  const remap = useSceneDisplayRemap(sceneId);
  const view = useSceneViewAxes(sceneId);

  // The bar measures screen x. When that is the remapped axis it would state
  // a length that is not there, and no ruler beats a wrong one.
  const xRemapped = isRemapActive(remap) && remapViewSlot(remap, view) === 0;

  return (
    <>
      <RemapChip />
      {/* A pixel-grid world measures nothing physical — a ruler would just
          restate indices, so the bar only exists where the world carries a
          real unit. */}
      {show && isPhysicalUnit(spatialUnit) && !xRemapped && (
        <ScaleBarView
          worldUnitsPerPixel={worldUnitsPerPixel}
          unitLabel={resolveUnitLabel(spatialUnit)}
        />
      )}
    </>
  );
};
