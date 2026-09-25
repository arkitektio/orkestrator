import { runStrokeExtraction } from "../../annotations/enhancers/paths/brushSkeleton/extraction";
import { unionPieceIntoDesign, type DesignToolRunContext } from "./context";
import type { DesignTool } from "./registry";

/**
 * C — the brush: paint along a structure, the corridor's tube surface is
 * extracted and unioned onto the active mesh.
 */
export const brushTool: DesignTool = {
  id: "brush",
  key: "c",
  label: "Brush",
  gesture: "volume-stroke",
  roiTool: "BRUSH",
  hint: "Brushing — drag along a structure to add it to the mesh",
  shortcut: { keys: ["C", "drag"], description: "Brush a structure onto the mesh" },
  async run(ctx: DesignToolRunContext) {
    if (!ctx.extraction) return ctx.fail("The stroke's layer is no longer in the scene");
    const { brush } = ctx;
    const radiusWorld = brush.radiusWorld ?? 4 * Math.min(...ctx.extraction.voxelSize);
    let extraction;
    try {
      extraction = await runStrokeExtraction(ctx.extraction, ctx.stroke, {
        radiusWorld,
        weights: brush.weights,
        tau: brush.tubeThreshold,
        wantTube: true,
        marcher: brush.marcher,
        minSpacingWorld:
          brush.detailVoxels >= 2 ? brush.detailVoxels * Math.max(...ctx.extraction.voxelSize) : undefined,
        stale: ctx.stale,
      });
    } catch (error) {
      return ctx.fail(error instanceof Error ? error.message : String(error));
    }
    if (!extraction) return; // stale
    const { picked, tube, notes } = extraction;
    const taken = tube ? await unionPieceIntoDesign(ctx, tube, picked.spacing, picked.level, "tube") : false;
    if (ctx.stale()) return;
    if (taken) ctx.clear();
    else ctx.fail(notes.length > 0 ? notes.join("; ") : "The stroke found no surface to add");
  },
};
