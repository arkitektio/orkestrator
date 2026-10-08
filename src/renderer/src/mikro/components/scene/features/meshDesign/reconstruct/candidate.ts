import type { BrushSample } from "../brush";
import { weldSoup } from "../ops/weld";
import type { DesignCandidate, MeshDesignState, ReconstructGesture } from "../store/meshDesignStore";
import { fieldSpacingFor } from "../tools/context";
import { designDispatcher } from "../worker/designDispatcher";
import type { DesignJob } from "../worker/designJob";
import type { Reconstructor, ReconstructResult } from "./registry";
import type { ReconstructSettings } from "./settings";

/**
 * A reconstruction's life between "the reconstructor answered" and "it is
 * part of a mesh": built into a previewable CANDIDATE, then committed (one
 * undo step) or dropped on the user's verdict. The geometry itself — field,
 * march, polish, simplify — is a job for the worker (`worker/designJob.ts`);
 * this module only says what to build and files the result.
 */

let candidateCounter = 0;

/**
 * Turn a reconstructor's result into a standalone mesh — field, polished and
 * simplified geometry — so the preview is exactly what accepting it into an
 * empty target produces. Null when the result has no surface, or when
 * `superseded` withdrew it while it was still queued.
 */
export async function buildCandidate(
  result: ReconstructResult,
  meta: {
    reconstructor: Reconstructor;
    gestureKind: ReconstructGesture;
    gesture: readonly BrushSample[];
    layerId: string;
    paramsKey: string;
    settings: ReconstructSettings;
    superseded?: () => boolean;
  },
): Promise<DesignCandidate | null> {
  const { detailVoxels, polishIterations, marcher } = meta.settings;
  let base: DesignJob["base"];
  let piece: DesignCandidate["piece"];
  let detailWorld: number;
  if (result.kind === "surface") {
    if (result.tube.triangles === 0) return null;
    const geometry = weldSoup(result.tube.positions);
    if (geometry.indices.length === 0) return null;
    base = { kind: "mesh", geometry, spacing: fieldSpacingFor(result.spacing, detailVoxels) };
    piece = { kind: "surface", geometry };
    detailWorld = detailVoxels * Math.max(...result.spacing);
  } else {
    const spacing = fieldSpacingFor([result.spacing, result.spacing, result.spacing], detailVoxels);
    base = { kind: "stamp", spec: result.spec, spacing };
    piece = { kind: "stamp", spec: result.spec };
    detailWorld = detailVoxels * spacing;
  }
  const finish = { marcher, polishIterations, detailWorld };
  const built = await designDispatcher().run({ base, ops: [], finish }, { superseded: meta.superseded });
  if (!built || built.current.indices.length === 0) return null;
  return {
    id: ++candidateCounter,
    reconstructorId: meta.reconstructor.id,
    gestureKind: meta.gestureKind,
    gesture: meta.gesture.map((sample) => ({ world: sample.world, voxel: sample.voxel })),
    layerId: meta.layerId,
    level: result.level,
    paramsKey: meta.paramsKey,
    field: built.field,
    original: built.original,
    current: built.current,
    piece,
    sourceKind: meta.reconstructor.sourceKind,
    finish,
    guide: result.kind === "stamp" ? result.guide : undefined,
    note: result.note ?? null,
  };
}

/**
 * ACCEPT the pending candidate: union it into the selected mesh, or start a
 * new mesh from it when nothing is selected — ONE `applySculpt`, one undo
 * step. Resolves false when there was nothing pending.
 *
 * Callers that go on to read the session must re-read the store afterwards:
 * `design` is a snapshot, and this changes the meshes under it.
 */
export async function commitCandidate(design: MeshDesignState): Promise<boolean> {
  const candidate = design.candidate;
  if (!candidate) return false;
  // Off the screen first: a second accept (Enter held, a new stroke landing)
  // must find nothing to apply.
  design.setCandidate(null);
  const source = { kind: candidate.sourceKind, layerId: candidate.layerId, level: candidate.level };
  const target = design.selectedId ? design.meshes.find((mesh) => mesh.id === design.selectedId) : undefined;
  // No target, or a freshly started empty one: the candidate IS the mesh.
  if (!target || (!target.field && target.original.indices.length === 0)) {
    design.applySculpt(target?.id ?? null, {
      field: candidate.field,
      original: candidate.original,
      current: candidate.current,
      source,
    });
    return true;
  }
  const union = await designDispatcher().run({
    base: target.field
      ? { kind: "field", field: target.field }
      : { kind: "mesh", geometry: target.original, spacing: candidate.field.spacing },
    ops: [
      candidate.piece.kind === "surface"
        ? { type: "unionMesh", geometry: candidate.piece.geometry }
        : { type: "stamp", mode: "add", spec: candidate.piece.spec },
    ],
    finish: candidate.finish,
  });
  if (!union) return false;
  design.applySculpt(target.id, { field: union.field, original: union.original, current: union.current, source });
  return true;
}
