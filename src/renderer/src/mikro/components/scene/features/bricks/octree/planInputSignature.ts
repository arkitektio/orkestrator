import type { LayerViewRange } from "../../../platform/visibility/visibility";

/**
 * The per-layer planning inputs `planLayerNodes` reads BEYOND the pool's
 * content address (`buildPoolKey`): the layer's affine placement (drives the
 * voxel frustum, the camera's voxel position and the 2D slab mapping), its
 * fixed-LOD override, and its visible range. Scene-wide inputs (mode, lodBias,
 * currentZ, dimSelections, budget) are identical for every layer within one
 * replan and stay out of the signature.
 *
 * Two layers with the same poolKey AND the same signature produce identical
 * plans, so the tracker plans each such equivalence class ONCE and hands every
 * member the same plan object — the common case (one layer per channel of one
 * image) collapses N identical DFS traversals into one. View ranges are
 * compared by VALUE: the visibility tracker keeps per-layer range objects, so
 * identity would split classes that are numerically identical.
 */
export function buildPlanInputSignature(
  affineMatrix: readonly (readonly number[])[] | null | undefined,
  fixedLOD: number | null | undefined,
  viewRange: LayerViewRange | undefined,
): string {
  const affine = affineMatrix ? affineMatrix.map((row) => row.join(",")).join(";") : "I";
  const lod = typeof fixedLOD === "number" ? String(fixedLOD) : "-";
  const range = viewRange
    ? [
        viewRange.xRange[0],
        viewRange.xRange[1],
        viewRange.yRange[0],
        viewRange.yRange[1],
        viewRange.zRange ? `${viewRange.zRange[0]}:${viewRange.zRange[1]}` : "-",
        viewRange.scale,
      ].join(",")
    : "none";
  return `${affine}#${lod}#${range}`;
}
