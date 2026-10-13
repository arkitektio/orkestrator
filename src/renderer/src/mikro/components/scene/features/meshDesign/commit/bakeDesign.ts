import { singleCellQuantization, type BakeMesh } from "../../meshes/fabriks/writer/fabriksBake";
import { buildFabriksPrefix } from "../../meshes/fabriks/writer/fabriksPrefix";

/**
 * A design session as a fabriks PREFIX: the bake and the Parquet encoding,
 * with nothing but the bytes and the few numbers the registration records
 * coming back. Pure and free of the session — it runs in the design worker
 * (`worker/designDispatcher.ts` `bake`), because clipping, quantizing and
 * compressing a whole collection is seconds of work a commit dialog should
 * not freeze for.
 */

/** One mesh of the session as the bake takes it: an object id and its geometry. */
export type DesignBakeMesh = BakeMesh;

/** Above this quantization step (voxels) a single cell is too coarse to be worth the seamless normals. */
export const SINGLE_CELL_MAX_QUANTIZATION = 0.05;

export type DesignBake = {
  /** Every file of the prefix, by relative path; the manifest is the last entry. */
  files: Map<string, Uint8Array>;
  totalBytes: number;
  /** `world = voxel + offset`: the translation the collection's placement records. */
  offset: [number, number, number];
  cellSize: [number, number, number];
  cells: "single" | "auto";
  quantizationVoxels: number;
};

/**
 * One cell when the uint16 quantization stays below 0.05 voxel (extents up
 * to ~3,000 voxels): objects then never straddle a cell border, so the
 * reader's per-cell smooth normals are seamless. Larger designs take the
 * culling-friendly auto grid. Decided from the bounds, so the design is
 * baked once.
 */
export function bakeDesign(meshes: readonly DesignBakeMesh[]): DesignBake {
  const cells = singleCellQuantization(meshes) <= SINGLE_CELL_MAX_QUANTIZATION ? "single" : "auto";
  const prefix = buildFabriksPrefix(meshes, { cells });
  return {
    files: prefix.files,
    totalBytes: prefix.totalBytes,
    offset: prefix.baked.offset,
    cellSize: prefix.baked.grid.cellSize as [number, number, number],
    cells,
    quantizationVoxels: prefix.baked.quantizationVoxels,
  };
}

/** The buffers a bake owns, each once — its transfer list. */
export const bakeTransfers = (bake: DesignBake): ArrayBuffer[] => {
  const buffers = new Set<ArrayBuffer>();
  for (const bytes of bake.files.values()) buffers.add(bytes.buffer as ArrayBuffer);
  return [...buffers];
};
