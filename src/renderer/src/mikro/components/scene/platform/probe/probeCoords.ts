import type { AxisCoords } from "@/mikro/lib/coords/axisPath";
import { probeCoordsFor } from "@/mikro/lib/attributes/planExec";
import { buildSliceMap, resolveFixedDimIndex } from "../coords/selection";
import type { LayerState } from "../model/layerModel";

/**
 * A probed voxel as named level-0 coordinates: spatial axes from the probe's
 * voxel, collapsed dims resolved EXACTLY as the brick pools do (scene-wide
 * selection clamped, else the lens slice's collapsed default) — so a
 * locally-rooted plan reads the same slice the screen shows.
 *
 * Shared by the hover tracker and the probe-point pinner, so a pinned point
 * asks about the very coordinates the live readout did.
 */
export const probeAxisCoords = (
  layer: LayerState,
  voxelIndex: readonly [number, number, number],
  dimSelections: Readonly<Record<string, number>>,
): AxisCoords => {
  const dims = layer.lens.dataset.axisNames;
  const level0 = layer.lens.dataset.dataArrays.reduce<
    LayerState["lens"]["dataset"]["dataArrays"][number] | null
  >((best, da) => (best === null || da.level < best.level ? da : best), null);
  const sliceMap = buildSliceMap(layer.lens.slices);
  const ra = layer.lens.renderAxes;
  const spatial = new Set([ra.x, ra.y, ra.z].filter(Boolean));
  const resolved: Record<string, number> = {};
  dims.forEach((dim, d) => {
    if (spatial.has(dim)) return;
    resolved[dim] = resolveFixedDimIndex(
      sliceMap[dim],
      dimSelections[dim],
      level0?.shape[d] ?? 1,
    );
  });
  return probeCoordsFor({
    axisNames: dims,
    renderAxes: { x: ra.x, y: ra.y, z: ra.z },
    voxelIndex: [voxelIndex[0], voxelIndex[1], voxelIndex[2]],
    dimSelections: resolved,
  });
};
