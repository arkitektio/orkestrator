import { runGrowLoop } from "../../annotations/enhancers/paths/brushSkeleton/extraction";
import { unionPieceIntoDesign, type DesignToolRunContext } from "./context";
import type { DesignTool } from "./registry";

/**
 * W — the wand: like the blob, but the wrap threshold is seeded from the
 * CLICKED voxel's own windowed intensity minus a tolerance — "grow whatever
 * is about as bright as this", no slider fiddling.
 */
export const WAND_TOLERANCE = 0.15;

export const wandTool: DesignTool = {
  id: "wand",
  key: "w",
  label: "Wand",
  gesture: "volume-click",
  roiTool: "BLOB",
  hint: "Wand — click a structure; it grows at the clicked brightness",
  shortcut: { keys: ["W", "click"], description: "Grow at the clicked voxel's own brightness" },
  async run(ctx: DesignToolRunContext) {
    if (!ctx.extraction) return ctx.fail("The click's layer is no longer in the scene");
    const { brush, extraction } = ctx;
    const seed = ctx.stroke[0];
    // Raw value at the seed, normalized through the SAME window the cost
    // field uses (`climWindow` — engineContext.window carries it).
    const raw = extraction.engineContext.sampleResident(
      seed.voxel,
      extraction.startLevel,
      extraction.engineContext.channel,
    );
    const { min, max } = extraction.engineContext.window;
    if (raw === null || !(max > min)) {
      return ctx.fail("The clicked voxel is not resident yet — let streaming settle and try again");
    }
    const normalized = Math.min(1, Math.max(0, (raw - min) / (max - min)));
    const tau = Math.max(0.02, normalized - WAND_TOLERANCE);
    const radiusWorld = brush.radiusWorld ?? 4 * Math.min(...extraction.voxelSize);
    const outcome = await runGrowLoop(extraction, {
      seed,
      startRadius: radiusWorld,
      weights: brush.weights,
      tau,
      smoothVoxels: Math.max(0, Math.floor(brush.blobSmoothness)),
      gapVoxels: Math.max(0, Math.floor(brush.blobGap)),
      minSpacingWorld:
        brush.detailVoxels >= 2 ? brush.detailVoxels * Math.max(...extraction.voxelSize) : undefined,
      marcher: brush.marcher,
      stale: ctx.stale,
      publishLive: ctx.publishLive,
    });
    if (ctx.stale()) return;
    if (!outcome || outcome.tube.triangles === 0) {
      return ctx.fail("Nothing near the clicked brightness around the point — try a brighter spot");
    }
    const taken = await unionPieceIntoDesign(ctx, outcome.tube, outcome.spacing, outcome.level, "blob");
    if (ctx.stale()) return;
    if (taken) ctx.clear();
    else ctx.fail("The grown surface collapsed to nothing");
  },
};
