import { Eraser } from "lucide-react";

import { designDispatcher } from "../worker/designDispatcher";
import { baseFor, fieldSpacingFor, finishFor, targetMesh, type DesignToolRunContext } from "./context";
import type { DesignTool } from "./registry";

/**
 * X — carve: the stroke's capsule is subtracted from the active mesh's field
 * and the surface re-marched, so the cut is a smooth, CLOSED boolean rather
 * than a hole torn into the triangle list.
 */
export const carveTool: DesignTool = {
  id: "carve",
  key: "x",
  label: "Carve",
  icon: Eraser,
  group: "primary",
  gesture: "volume-stroke",
  hint: "Drag over the mesh to carve the brush out of it",
  shortcut: { keys: ["X", "drag"], description: "Carve: drag over the mesh to remove from it" },
  async run(ctx: DesignToolRunContext) {
    const target = targetMesh(ctx.design);
    const radius = ctx.brush.radiusWorld ?? 0;
    if (!target || radius <= 0) {
      return ctx.fail("Nothing to carve — reconstruct a mesh first");
    }
    const fieldSpacing =
      target.field?.spacing ??
      fieldSpacingFor(ctx.extraction?.voxelSize ?? [radius / 4, radius / 4, radius / 4], ctx.brush.detailVoxels);
    const result = await designDispatcher().run(
      {
        base: baseFor(target, fieldSpacing),
        ops: [
          {
            type: "subtractCapsule",
            stroke: ctx.stroke.map((sample) => sample.world),
            radius,
          },
        ],
        finish: finishFor(ctx.brush, fieldSpacing),
        // A mesh without a field still gets one from a carve that missed.
        skipUnchanged: target.field !== null,
      },
      { superseded: ctx.stale },
    );
    if (!result || ctx.stale()) return;
    if (!result.changed && target.field) {
      return ctx.fail("Nothing within the brush — the stroke missed the mesh");
    }
    ctx.design.applySculpt(target.id, {
      field: result.field,
      original: result.original,
      current: result.current,
      source: target.source,
    });
    ctx.clear();
  },
};
