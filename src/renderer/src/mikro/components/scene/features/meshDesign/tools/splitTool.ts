import { Split } from "lucide-react";

import { meshToField } from "../field/sculptField";
import { splitField } from "../field/split";
import { designDispatcher } from "../worker/designDispatcher";
import { fieldSpacingFor, finishFor } from "./context";
import type { BrushSkeletonState } from "../brush";
import type { DesignMesh, MeshDesignState } from "../store/meshDesignStore";
import type { DesignTool } from "./registry";
import type { Vec3 } from "../field/stamps";

/**
 * K — split: two clicks ON the mesh surface. The inside region parts along
 * the watershed between the two seeds; the far side becomes a NEW mesh with
 * its own object id.
 */
export const splitTool: DesignTool = {
  id: "split",
  key: "k",
  label: "Split",
  icon: Split,
  group: "more",
  gesture: "surface",
  hint: "Click both sides of the waist; the mesh parts between them",
  shortcut: { keys: ["K", "click ×2"], description: "Split: click two points to part the mesh between them" },
};

/** Apply the second click. True when the mesh actually split. */
export async function applySplit(
  design: MeshDesignState,
  brush: BrushSkeletonState,
  target: DesignMesh,
  seedA: Vec3,
  seedB: Vec3,
): Promise<boolean> {
  const fieldSpacing = target.field?.spacing ?? fieldSpacingFor([1, 1, 1], brush.detailVoxels);
  const field = target.field ?? meshToField(target.original, fieldSpacing);
  const parts = splitField(field, seedA, seedB);
  if (!parts) return false;
  // The watershed itself stays here (it needs the whole field in hand and
  // is one pass); the two re-marches go to the worker, one after the other.
  const finish = (half: typeof field) =>
    designDispatcher().run({ base: { kind: "field", field: half }, ops: [], finish: finishFor(brush, fieldSpacing) });
  const a = await finish(parts.a);
  const b = await finish(parts.b);
  if (!a || !b) return false;
  // The near half replaces the mesh (ONE undo step); the far half is new.
  design.applySculpt(target.id, { field: a.field, original: a.original, current: a.current, source: target.source });
  design.applySculpt(null, { field: b.field, original: b.original, current: b.current, source: target.source });
  return true;
}
