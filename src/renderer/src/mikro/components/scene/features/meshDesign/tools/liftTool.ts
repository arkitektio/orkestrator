import type { Vec3 } from "../../annotations/enhancers/shared/strokeModel";
import { createField, marchField, meshToField, unionMesh, type SculptField } from "../field/sculptField";
import { finishDesignGeometry } from "../ops/postProcess";
import { fieldSpacingFor, targetMesh, type DesignToolRunContext } from "./context";
import type { DesignTool } from "./registry";

/**
 * L — lift a LABEL instance: click a segmented object — on the 2D plane or
 * the 3D label raymarcher (both answer raw integer ids; the 3D one probes
 * first-hit, so the object you see is the one you lift) — and the whole
 * connected region of that id floods into a field and unions onto the
 * design: the bridge between automatic segmentation and hand-finishing.
 *
 * The flood runs at the layer's displayed level via `sampleResident`; at a
 * coarse level a boundary voxel can answer a NEIGHBOUR's id
 * (`residentSampling.ts`), so the tool notes the level it lifted at.
 */
export const LIFT_MAX_VOXELS = 2_000_000;

export const liftTool: DesignTool = {
  id: "lift",
  key: "l",
  label: "Lift",
  gesture: "volume-click",
  roiTool: "BLOB",
  hint: "Lift — click a labelled instance (2D or 3D) to pull it into the design",
  shortcut: { keys: ["L", "click"], description: "Lift a label instance into the design" },
  async run(ctx: DesignToolRunContext) {
    if (!ctx.extraction) return ctx.fail("The click's layer is no longer in the scene");
    const { extraction, brush } = ctx;
    const level = extraction.startLevel;
    const step = extraction.levelSteps[level];
    const sample = (levelVoxel: readonly [number, number, number]): number | null =>
      extraction.engineContext.sampleResident(
        [levelVoxel[0] * step[0], levelVoxel[1] * step[1], levelVoxel[2] * step[2]] as Vec3,
        level,
        extraction.engineContext.channel,
      );

    const seedBase = ctx.stroke[0].voxel;
    const seedLevel: [number, number, number] = [
      Math.floor(seedBase[0] / step[0]),
      Math.floor(seedBase[1] / step[1]),
      Math.floor(seedBase[2] / step[2]),
    ];
    const seedId = sample(seedLevel);
    if (seedId === null || seedId === 0) {
      return ctx.fail(seedId === 0 ? "The click landed on background (label 0)" : "The clicked voxel is not resident yet");
    }

    // Flood the connected region of `seedId` at this level, budgeted.
    const visited = new Set<number>();
    const key = (x: number, y: number, z: number) => x + y * 1_048_576 + z * 1_048_576 * 1_048_576;
    const region: [number, number, number][] = [];
    const queue: [number, number, number][] = [seedLevel];
    visited.add(key(...seedLevel));
    let truncated = false;
    while (queue.length > 0) {
      const voxel = queue.pop()!;
      if (sample(voxel) !== seedId) continue;
      region.push(voxel);
      if (region.length > LIFT_MAX_VOXELS) {
        truncated = true;
        break;
      }
      for (const [dx, dy, dz] of [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]] as const) {
        const next: [number, number, number] = [voxel[0] + dx, voxel[1] + dy, voxel[2] + dz];
        if (next.some((v, a) => v < 0 || v * step[a] >= extraction.shape[a])) continue;
        const k = key(...next);
        if (visited.has(k)) continue;
        visited.add(k);
        queue.push(next);
      }
    }
    if (region.length === 0) return ctx.fail("The instance has no resident voxels here yet");

    // Region → a binary field in WORLD space (level voxel centers through the
    // affine; the field grid is world-axis-aligned at the level's spacing).
    const spacing = fieldSpacingFor(extraction.voxelSize.map((v, a) => v * step[a]) as unknown as Vec3, 1);
    const worldPoints: [number, number, number][] = region.map((voxel) => {
      const p = ctx.stroke[0].world; // reuse the array shape; recompute below
      void p;
      const world = {
        x: (voxel[0] + 0.5) * step[0],
        y: (voxel[1] + 0.5) * step[1],
        z: (voxel[2] + 0.5) * step[2],
      };
      const v = new Float32Array([world.x, world.y, world.z]);
      // level-voxel → world through the layer affine.
      const m = extraction.affine.elements;
      return [
        m[0] * v[0] + m[4] * v[1] + m[8] * v[2] + m[12],
        m[1] * v[0] + m[5] * v[1] + m[9] * v[2] + m[13],
        m[2] * v[0] + m[6] * v[1] + m[10] * v[2] + m[14],
      ];
    });
    const min: [number, number, number] = [Infinity, Infinity, Infinity];
    const max: [number, number, number] = [-Infinity, -Infinity, -Infinity];
    for (const p of worldPoints) {
      for (let a = 0; a < 3; a++) {
        min[a] = Math.min(min[a], p[a] - spacing);
        max[a] = Math.max(max[a], p[a] + spacing);
      }
    }
    const lifted: SculptField = createField(min, max, spacing);
    for (const p of worldPoints) {
      const x = Math.round((p[0] - lifted.min[0]) / lifted.spacing - 0.5);
      const y = Math.round((p[1] - lifted.min[1]) / lifted.spacing - 0.5);
      const z = Math.round((p[2] - lifted.min[2]) / lifted.spacing - 0.5);
      if (x < 0 || y < 0 || z < 0 || x >= lifted.size[0] || y >= lifted.size[1] || z >= lifted.size[2]) continue;
      lifted.data[x + y * lifted.size[0] + z * lifted.size[0] * lifted.size[1]] = -lifted.band;
    }

    const target = targetMesh(ctx.design);
    let field = lifted;
    if (target) {
      const base = target.field ?? meshToField(target.original, lifted.spacing);
      field = unionMesh(base, marchField(lifted, brush.marcher));
    }
    const marched = marchField(field, brush.marcher);
    const { original, current } = await finishDesignGeometry(marched, {
      polishIterations: Math.max(brush.polishIterations, 6), // a binary lift NEEDS polish
      detailWorld: brush.detailVoxels * spacing,
    });
    if (ctx.stale()) return;
    ctx.design.applySculpt(target?.id ?? null, {
      field,
      original,
      current,
      source: { kind: "blob", layerId: ctx.layerId, level },
    });
    if (truncated) ctx.fail(`Lifted the first ${LIFT_MAX_VOXELS.toLocaleString()} voxels — the instance is larger`);
    else if (level > 0) ctx.fail(`Lifted at pyramid level ${level} — boundary voxels may borrow a neighbour's id`);
    else ctx.clear();
  },
};
