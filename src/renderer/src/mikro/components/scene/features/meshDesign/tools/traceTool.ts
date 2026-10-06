import { Spline } from "lucide-react";

import { reconstructToCandidate } from "../reconstruct/run";
import type { DesignToolRunContext } from "./context";
import type { DesignTool } from "./registry";

/**
 * C — trace: paint along a structure; the reconstructor picked for strokes
 * (`reconstruct/registry` — a fitted tube, or the data's own surface) turns
 * it into a candidate mesh that waits for accept / discard.
 */
export const traceTool: DesignTool = {
  id: "trace",
  key: "c",
  label: "Trace",
  icon: Spline,
  group: "primary",
  gesture: "volume-stroke",
  hint: "Drag along a structure to reconstruct it",
  shortcut: { keys: ["C", "drag"], description: "Trace: drag along a structure to reconstruct a tube" },
  async run(ctx: DesignToolRunContext) {
    const outcome = await reconstructToCandidate({
      gestureKind: "stroke",
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
