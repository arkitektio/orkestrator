import { CircleDot } from "lucide-react";

import { reconstructToCandidate } from "../reconstruct/run";
import type { DesignToolRunContext } from "./context";
import type { DesignTool } from "./registry";

/**
 * V — seed: click a structure; the reconstructor picked for clicks
 * (`reconstruct/registry` — a fitted ball, or the data's own surface grown
 * around the click) turns it into a candidate mesh awaiting its verdict.
 */
export const seedTool: DesignTool = {
  id: "seed",
  key: "v",
  label: "Seed",
  icon: CircleDot,
  group: "primary",
  gesture: "volume-click",
  hint: "Click a structure to reconstruct it",
  shortcut: { keys: ["V", "click"], description: "Seed: click a structure to reconstruct a ball" },
  async run(ctx: DesignToolRunContext) {
    const outcome = await reconstructToCandidate({
      gestureKind: "click",
      gesture: ctx.stroke,
      layerId: ctx.layerId,
      extraction: ctx.extraction,
      brush: ctx.brush,
      design: ctx.design,
      stale: ctx.stale,
      publishLive: ctx.publishLive,
    });
    if (!outcome) return; // stale
    if (outcome.ok) ctx.clear();
    else ctx.fail(outcome.message);
  },
};
