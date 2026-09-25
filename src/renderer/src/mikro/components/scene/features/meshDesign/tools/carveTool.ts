import { marchField, meshToField, subtractCapsule } from "../field/sculptField";
import { finishDesignGeometry } from "../ops/postProcess";
import { fieldSpacingFor, targetMesh, type DesignToolRunContext } from "./context";
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
  gesture: "volume-stroke",
  roiTool: null,
  hint: "Removing — drag over the mesh to take brushed areas away",
  shortcut: { keys: ["X", "drag"], description: "Carve the brush out of the mesh" },
  async run(ctx: DesignToolRunContext) {
    const target = targetMesh(ctx.design);
    const radius = ctx.brush.radiusWorld ?? 0;
    if (!target || radius <= 0) {
      return ctx.fail("Nothing to remove from — brush a mesh first (hold C and drag)");
    }
    const fieldSpacing =
      target.field?.spacing ??
      fieldSpacingFor(ctx.extraction?.voxelSize ?? [radius / 4, radius / 4, radius / 4], ctx.brush.detailVoxels);
    const field = target.field ?? meshToField(target.original, fieldSpacing);
    const carved = subtractCapsule(
      field,
      ctx.stroke.map((sample) => sample.world as [number, number, number]),
      radius,
    );
    if (carved === field && target.field) {
      return ctx.fail("Nothing within the brush — the stroke missed the mesh");
    }
    const marched = marchField(carved, ctx.brush.marcher);
    const { original, current } = await finishDesignGeometry(marched, {
      polishIterations: ctx.brush.polishIterations,
      detailWorld: ctx.brush.detailVoxels * fieldSpacing,
    });
    if (ctx.stale()) return;
    ctx.design.applySculpt(target.id, { field: carved, original, current, source: target.source });
    ctx.clear();
  },
};
