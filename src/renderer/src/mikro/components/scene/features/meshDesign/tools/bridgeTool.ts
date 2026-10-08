import { Link2 } from "lucide-react";

import { runStrokeExtraction } from "../brush";
import { designDispatcher } from "../worker/designDispatcher";
import { baseFor, fieldSpacingFor, targetMesh, type DesignToolRunContext } from "./context";
import type { DesignTool } from "./registry";

/**
 * G — bridge: two clicks. The first parks a point; the second runs the
 * brightest geodesic between them through the existing centerline engine and
 * sweeps a capsule chain along it into the active mesh — fragmented tubes
 * become one object. The corridor is a dilated tube around the straight
 * line, so a far detour needs a larger brush radius.
 */
export const bridgeTool: DesignTool = {
  id: "bridge",
  key: "g",
  label: "Bridge",
  icon: Link2,
  group: "more",
  gesture: "volume-click",
  hint: "Click both ends; the brightest path between them joins the mesh",
  shortcut: { keys: ["G", "click ×2"], description: "Bridge: click two points to join them along the brightest path" },
  async run(ctx: DesignToolRunContext) {
    if (!ctx.extraction) return ctx.fail("The click's layer is no longer in the scene");
    const click = ctx.stroke[0];
    const pending = ctx.design.pendingPoint;
    if (!pending) {
      ctx.design.setPendingPoint({ world: click.world, voxel: click.voxel });
      ctx.clear();
      return;
    }
    ctx.design.setPendingPoint(null);
    const { brush, extraction } = ctx;
    const radiusWorld = brush.radiusWorld ?? 4 * Math.min(...extraction.voxelSize);
    let path;
    try {
      path = await runStrokeExtraction(extraction, [pending, click], {
        radiusWorld,
        weights: brush.weights,
        tau: brush.tubeThreshold,
        wantTube: false,
        marcher: brush.marcher,
        stale: ctx.stale,
      });
    } catch (error) {
      return ctx.fail(
        `${error instanceof Error ? error.message : String(error)} — a far detour needs a larger radius`,
      );
    }
    if (!path) return; // stale
    const target = targetMesh(ctx.design);
    const tubeRadius = Math.max(radiusWorld * 0.4, Math.max(...extraction.voxelSize));
    const spec = { kind: "capsuleChain", points: path.points, radius: tubeRadius } as const;
    const fieldSpacing =
      target?.field?.spacing ?? fieldSpacingFor([tubeRadius / 4, tubeRadius / 4, tubeRadius / 4], brush.detailVoxels);
    const finish = {
      marcher: brush.marcher,
      polishIterations: brush.polishIterations,
      detailWorld: brush.detailVoxels * Math.max(...extraction.voxelSize),
    };
    const result = await designDispatcher().run(
      target
        ? { base: baseFor(target, fieldSpacing), ops: [{ type: "stamp", mode: "add", spec }], finish }
        : { base: { kind: "stamp", spec, spacing: fieldSpacing }, ops: [], finish },
      { superseded: ctx.stale },
    );
    if (!result || ctx.stale()) return;
    ctx.design.applySculpt(target?.id ?? null, {
      field: result.field,
      original: result.original,
      current: result.current,
      source: { kind: "tube", layerId: ctx.layerId, level: path.picked.level },
    });
    ctx.clear();
  },
};
