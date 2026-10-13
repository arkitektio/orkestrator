import { marchField, meshToField, subtractCapsule, unionMesh, type SculptField } from "../field/sculptField";
import { applyStamp, smoothInSphere, stampFromSpec, stampToField, type StampSpec, type Vec3 } from "../field/stamps";
import { finishDesignGeometry } from "../ops/postProcess";
import { simplifyToError } from "../ops/simplify";
import { taubinSmooth } from "../ops/smoothMesh";
import { weldSoup } from "../ops/weld";
import type { DesignGeometry } from "../store/meshDesignStore";

/**
 * The designer's geometry work, as DATA: where a mesh's field starts, what
 * is done to it, and how the result is turned back into a surface. Every
 * tool ends in this same tail — field op → march → polish → simplify — and
 * all of it is heavy (a field is up to 8 M cells; the polish and the
 * simplifier walk the whole surface), so it runs in a worker
 * (`designDispatcher.ts`). The job is plain data precisely so it can go
 * there; `runDesignJob` is the one function both the worker and the
 * same-thread fallback call, so the two cannot disagree.
 *
 * A reconstructed SURFACE arrives as the triangle soup the extraction
 * answered, and is never voxelized at the data's resolution:
 *
 *  - on its own (`base: soup`) it is only welded, polished and simplified —
 *    it already IS the mesh, and it gets no field until something is unioned
 *    into or carved out of it;
 *  - on its way INTO a field (`op: unionSoup`, and the `mesh` base that
 *    gives such a mesh its field later) it is simplified first, to a
 *    fraction of the Detail error (`FIELD_INPUT_DETAIL`). Signed distance
 *    from a few thousand triangles costs a fraction of what it does from the
 *    hundred thousand the march emitted, and the fraction keeps the detour
 *    well inside the error the result is simplified to anyway.
 */

/** How much of the Detail error geometry may lose before it is voxelized. */
export const FIELD_INPUT_DETAIL = 0.25;

export type DesignJobBase =
  /** An existing field (a mesh that has been edited before). */
  | { kind: "field"; field: SculptField }
  /** A mesh that has no field yet: simplified (see above), then voxelized at `spacing`. */
  | { kind: "mesh"; geometry: DesignGeometry; spacing: number }
  /** Nothing yet: the field is the stamp's own, at `spacing`. */
  | { kind: "stamp"; spec: StampSpec; spacing: number }
  /** Nothing yet, and no field either: a triangle soup that becomes the mesh. Takes no ops. */
  | { kind: "soup"; positions: Float32Array };

export type DesignOp =
  | { type: "unionMesh"; geometry: DesignGeometry }
  /** Union a reconstructed surface (triangle soup) in, simplified first. */
  | { type: "unionSoup"; positions: Float32Array }
  /** Union another FIELD in (marched to a surface first, like a mesh). */
  | { type: "unionField"; field: SculptField }
  | { type: "stamp"; mode: "add" | "subtract"; spec: StampSpec }
  | { type: "subtractCapsule"; stroke: Vec3[]; radius: number }
  | { type: "smoothSpheres"; points: Vec3[]; radius: number };

export type DesignFinish = { polishIterations: number; detailWorld: number };

export type DesignJob = {
  base: DesignJobBase;
  ops: DesignOp[];
  finish: DesignFinish;
  /** Skip the march when no op changed the field (`changed: false` comes
   * back with empty geometry) — a carve that missed costs nothing more. */
  skipUnchanged?: boolean;
};

export type DesignJobResult = {
  /** Null for a `soup` base: the mesh has no field yet. */
  field: SculptField | null;
  /** Polished, before simplification — what re-simplifying restarts from. */
  original: DesignGeometry;
  /** What renders and commits; carries vertex normals. */
  current: DesignGeometry;
  /** Whether any op changed the base field. */
  changed: boolean;
};

const EMPTY: DesignGeometry = { positions: new Float32Array(0), indices: new Uint32Array(0) };

/** Area-weighted vertex normals — what `computeVertexNormals` would produce. */
export function vertexNormals(geometry: DesignGeometry): Float32Array {
  const { positions, indices } = geometry;
  const normals = new Float32Array(positions.length);
  for (let t = 0; t + 2 < indices.length; t += 3) {
    const a = indices[t] * 3;
    const b = indices[t + 1] * 3;
    const c = indices[t + 2] * 3;
    const ux = positions[b] - positions[a];
    const uy = positions[b + 1] - positions[a + 1];
    const uz = positions[b + 2] - positions[a + 2];
    const vx = positions[c] - positions[a];
    const vy = positions[c + 1] - positions[a + 1];
    const vz = positions[c + 2] - positions[a + 2];
    const nx = uy * vz - uz * vy;
    const ny = uz * vx - ux * vz;
    const nz = ux * vy - uy * vx;
    for (const v of [a, b, c]) {
      normals[v] += nx;
      normals[v + 1] += ny;
      normals[v + 2] += nz;
    }
  }
  for (let v = 0; v < normals.length; v += 3) {
    const length = Math.hypot(normals[v], normals[v + 1], normals[v + 2]);
    if (length > 0) {
      normals[v] /= length;
      normals[v + 1] /= length;
      normals[v + 2] /= length;
    }
  }
  return normals;
}

/** Geometry as the field takes it in: within a fraction of Detail of the input. */
const forField = (geometry: DesignGeometry, finish: DesignFinish): Promise<DesignGeometry> =>
  simplifyToError(geometry, finish.detailWorld * FIELD_INPUT_DETAIL);

const applyOp = async (field: SculptField, op: DesignOp, finish: DesignFinish): Promise<SculptField> => {
  switch (op.type) {
    case "unionMesh":
      return unionMesh(field, op.geometry);
    case "unionSoup":
      // Polished first: the simplifier then fits the shape, not the marching grain.
      return unionMesh(
        field,
        await forField(taubinSmooth(weldSoup(op.positions), { iterations: finish.polishIterations }), finish),
      );
    case "unionField":
      return unionMesh(field, marchField(op.field));
    case "stamp":
      return applyStamp(field, stampFromSpec(op.spec), op.mode);
    case "subtractCapsule":
      return subtractCapsule(field, op.stroke, op.radius);
    case "smoothSpheres": {
      let out = field;
      for (const point of op.points) out = smoothInSphere(out, point, op.radius);
      return out;
    }
  }
};

const finished = async (geometry: DesignGeometry, finish: DesignFinish) => {
  const { original, current } = await finishDesignGeometry(geometry, finish);
  return { original, current: { ...current, normals: vertexNormals(current) } };
};

export async function runDesignJob(job: DesignJob): Promise<DesignJobResult> {
  const { base, finish } = job;
  if (base.kind === "soup") {
    if (job.ops.length > 0) throw new Error("A soup base has no field for an op to act on.");
    return { field: null, ...(await finished(weldSoup(base.positions), finish)), changed: false };
  }
  const start =
    base.kind === "field"
      ? base.field
      : base.kind === "mesh"
        ? meshToField(await forField(base.geometry, finish), base.spacing)
        : stampToField(stampFromSpec(base.spec), base.spacing);
  let field = start;
  for (const op of job.ops) field = await applyOp(field, op, finish);
  const changed = field !== start;
  if (!changed && job.skipUnchanged) return { field, original: EMPTY, current: EMPTY, changed };
  return { field, ...(await finished(marchField(field), finish)), changed };
}

/** The buffers a result owns, each once — its transfer list. */
export const resultTransfers = (result: DesignJobResult): ArrayBuffer[] => {
  const buffers = new Set<ArrayBuffer>();
  for (const array of [
    result.field?.data,
    result.original.positions,
    result.original.indices,
    result.current.positions,
    result.current.indices,
    result.current.normals,
  ]) {
    if (array) buffers.add(array.buffer as ArrayBuffer);
  }
  return [...buffers];
};
