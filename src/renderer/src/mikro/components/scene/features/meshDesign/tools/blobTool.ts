import { runGrowLoop } from "../../annotations/enhancers/paths/brushSkeleton/extraction";
import { unionPieceIntoDesign, type DesignToolRunContext } from "./context";
import type { DesignTool } from "./registry";

/**
 * V — the blob: one probed click grows a smoothed surface around the bright
 * structure until it closes, then unions it onto the active mesh.
 */
export const blobTool: DesignTool = {
  id: "blob",
  key: "v",
  label: "Blob",
  gesture: "volume-click",
  roiTool: "BLOB",
  hint: "Click a structure to grow it onto the mesh",
  shortcut: { keys: ["V", "click"], description: "Grow a blob onto the mesh" },
  async run(ctx: DesignToolRunContext) {
    if (!ctx.extraction) return ctx.fail("The click's layer is no longer in the scene");
    const { brush } = ctx;
    const radiusWorld = brush.radiusWorld ?? 4 * Math.min(...ctx.extraction.voxelSize);
    const outcome = await runGrowLoop(ctx.extraction, {
      seed: ctx.stroke[0],
      startRadius: radiusWorld,
      weights: brush.weights,
      tau: brush.tubeThreshold,
      smoothVoxels: Math.max(0, Math.floor(brush.blobSmoothness)),
      gapVoxels: Math.max(0, Math.floor(brush.blobGap)),
      minSpacingWorld:
        brush.detailVoxels >= 2 ? brush.detailVoxels * Math.max(...ctx.extraction.voxelSize) : undefined,
      marcher: brush.marcher,
      stale: ctx.stale,
      publishLive: ctx.publishLive,
    });
    if (ctx.stale()) return;
    if (!outcome || outcome.tube.triangles === 0) {
      return ctx.fail("Nothing brighter than the Wrap threshold near the probe point — lower Wrap and try again");
    }
    const taken = await unionPieceIntoDesign(ctx, outcome.tube, outcome.spacing, outcome.level, "blob");
    if (ctx.stale()) return;
    if (taken) ctx.clear();
    else ctx.fail("The grown surface collapsed to nothing");
  },
};
