import { Slider } from "@/core/ui/slider";
import { ToggleGroup, ToggleGroupItem } from "@/core/ui/toggle-group";
import { useBrushSkeletonStore } from "../brushSkeletonStore";
import { MARCHER_IDS, MARCHERS, type MarcherId } from "../meshes/marcher";
import { ParamRow } from "./ParamRow";

/**
 * The surface-quality rows shared by the brush and blob panels: which
 * marcher extracts the surface, how much it is polished, and how much detail
 * (in voxels of the extraction level) survives into the design.
 *
 * Detail is sub-voxel capable on purpose: the marched surface carries real
 * sub-voxel information along its edges (interpolated crossings), and a
 * thin tube keeps its roundness only below ~0.5 voxel of error. Above 2
 * voxels the corridor is marched at a coarser level instead
 * (`planning.levelForSpacing`), so the slider stops there.
 */
export const DETAIL_MIN = 0.1;
export const DETAIL_MAX = 2;

export const SurfaceQualityControls = () => {
  const marcher = useBrushSkeletonStore((s) => s.marcher);
  const setMarcher = useBrushSkeletonStore((s) => s.setMarcher);
  const polish = useBrushSkeletonStore((s) => s.polishIterations);
  const setPolish = useBrushSkeletonStore((s) => s.setPolishIterations);
  const detailVoxels = useBrushSkeletonStore((s) => s.detailVoxels);
  const setDetailVoxels = useBrushSkeletonStore((s) => s.setDetailVoxels);

  return (
    <>
      <ParamRow label="Marcher" title="Which algorithm turns the field into a surface">
        <ToggleGroup
          type="single"
          size="sm"
          value={marcher}
          onValueChange={(value) => {
            if (value) setMarcher(value as MarcherId);
          }}
        >
          {MARCHER_IDS.map((id) => (
            <ToggleGroupItem key={id} value={id} className="h-5 px-2 text-[10px]" title={MARCHERS[id].description}>
              {MARCHERS[id].label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </ParamRow>
      <ParamRow
        label="Polish"
        title="Shrink-free (Taubin) smoothing passes on the extracted surface — removes marching artefacts before simplifying; 0 = off"
        readout={String(polish)}
      >
        <Slider min={0} max={20} step={1} value={[polish]} onValueChange={([value]) => setPolish(value)} />
      </ParamRow>
      <ParamRow
        label="Detail"
        title="Surface detail in voxels of the extraction level: the mesh stays within this many voxels of the marched surface. 1 = the data's own resolution; below keeps sub-voxel shape, above 2 marches a coarser level"
        readout={`${detailVoxels.toFixed(2)} vx`}
      >
        <Slider
          min={DETAIL_MIN}
          max={DETAIL_MAX}
          step={0.05}
          value={[detailVoxels]}
          onValueChange={([value]) => setDetailVoxels(value)}
        />
      </ParamRow>
    </>
  );
};
