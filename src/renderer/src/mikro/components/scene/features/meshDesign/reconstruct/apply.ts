import type { BrushSample } from "../brush";
import { isEmptyMesh, type DesignMesh, type LastReconstruction, type MeshDesignState, type ReconstructGesture } from "../store/meshDesignStore";
import { baseFor, fieldSpacingFor } from "../tools/context";
import { designDispatcher } from "../worker/designDispatcher";
import type { DesignJob } from "../worker/designJob";
import type { Reconstructor, ReconstructResult } from "./registry";
import type { ReconstructSettings } from "./settings";

/**
 * A reconstruction's way into the session: the reconstructor answered, and
 * its result goes STRAIGHT into the mesh — one job, one undo step. There is
 * no preview awaiting a verdict; the result stays tunable instead
 * (`LastReconstruction`): a re-run lands here again with `retune` set and
 * replaces it in place, starting from the mesh as it was before.
 *
 * The geometry itself is a job for the worker (`worker/designJob.ts`); this
 * module only says what to build and files the result.
 */

/**
 * The job that puts `result` into `target` — or makes a mesh of it when
 * there is no target (or only an empty one). Null when the result has no
 * surface at all.
 */
export function reconstructionJob(
  result: ReconstructResult,
  target: DesignMesh | null,
  settings: Pick<ReconstructSettings, "detailVoxels" | "polishIterations">,
): DesignJob | null {
  const { detailVoxels, polishIterations } = settings;
  const into = target && !isEmptyMesh(target) ? target : null;
  if (result.kind === "surface") {
    if (result.tube.triangles === 0) return null;
    const positions = result.tube.positions;
    const finish = { polishIterations, detailWorld: detailVoxels * Math.max(...result.spacing) };
    // On its own the surface IS the mesh: no field, until an edit needs one.
    if (!into) return { base: { kind: "soup", positions }, ops: [], finish };
    return {
      base: baseFor(into, fieldSpacingFor(result.spacing, detailVoxels)),
      ops: [{ type: "unionSoup", positions }],
      finish,
    };
  }
  const spacing = fieldSpacingFor([result.spacing, result.spacing, result.spacing], detailVoxels);
  const finish = { polishIterations, detailWorld: detailVoxels * spacing };
  if (!into) return { base: { kind: "stamp", spec: result.spec, spacing }, ops: [], finish };
  return { base: baseFor(into, spacing), ops: [{ type: "stamp", mode: "add", spec: result.spec }], finish };
}

/**
 * Put a reconstructor's result into the session. A first run unions it into
 * the SELECTED mesh, or starts a new mesh when nothing is selected; a re-run
 * (`retune`) replaces what the first run made. Resolves false when the
 * result has no surface, or when it was withdrawn or overtaken meanwhile.
 */
export async function applyReconstruction(
  design: MeshDesignState,
  result: ReconstructResult,
  meta: {
    reconstructor: Reconstructor;
    gestureKind: ReconstructGesture;
    gesture: readonly BrushSample[];
    layerId: string;
    paramsKey: string;
    settings: ReconstructSettings;
    retune?: LastReconstruction;
    superseded?: () => boolean;
  },
): Promise<boolean> {
  const { retune } = meta;
  const target = retune
    ? retune.before
    : ((design.selectedId ? design.meshes.find((mesh) => mesh.id === design.selectedId) : undefined) ?? null);
  const job = reconstructionJob(result, target, meta.settings);
  if (!job) return false;
  const built = await designDispatcher().run(job, { superseded: meta.superseded });
  // The dispatcher only withdraws a job that is still QUEUED. One that was
  // already running comes back regardless, and a result nobody is waiting
  // for must not land: the gesture that overtook it resolved its target
  // before this one existed, and would then overwrite it.
  if (meta.superseded?.()) return false;
  if (!built || built.current.indices.length === 0) return false;
  const sculpt = {
    field: built.field,
    original: built.original,
    current: built.current,
    source: { kind: meta.reconstructor.sourceKind, layerId: meta.layerId, level: result.level },
  };
  const record = { reconstructorId: meta.reconstructor.id, paramsKey: meta.paramsKey, note: result.note ?? null };
  if (retune) return design.retuneReconstruction(retune.id, sculpt, record);
  design.applyReconstruction(target?.id ?? null, sculpt, {
    ...record,
    gestureKind: meta.gestureKind,
    gesture: meta.gesture.map((sample) => ({ world: sample.world, voxel: sample.voxel })),
    layerId: meta.layerId,
  });
  return true;
}
