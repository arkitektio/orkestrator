import { cellGridBox, type VoxelBox } from "../fabriksGrid";
import { encodeMorton3, MAX_MORTON_BITS_PER_AXIS } from "@/mikro-next/components/scene/platform/parquet/mortonCell";
import type { FabriksEncoding, FabriksGrid } from "../fabriksManifest";

/**
 * Bake designed meshes into the ROWS of a single-level fabriks collection.
 *
 * This is the pure half of the browser-side producer: geometry in, the exact
 * row contents of `level=0/part-*.parquet`, `catalog/cells.parquet` and
 * `catalog/objects.parquet` out, plus the manifest they imply. Nothing here
 * touches Parquet or the network — `parquetWrite.ts` encodes the rows and
 * `fabriksUpload.ts` ships them — so every byte decision is testable against
 * the reader (`fabriksDecode.ts`) with no I/O in sight.
 *
 * ## Why single-level
 *
 * The client bakes `levels: 1`: every cell is a level-0 leaf and there is no
 * LOD pyramid. `fabriksPlanner.planFabriksCells` accepts a level-0 cell before
 * consulting any budget, so a single-level collection is ALWAYS drawn at full
 * detail — frustum culling is the only lever. That is acceptable for a
 * designed collection (the design session's own triangle cap bounds it) and it
 * is why `maxIndicesPerCell` exists: many small cells keep culling effective.
 * A server-side job re-LODs the prefix into a new version later; the manifest
 * says `decimation: "CUSTOM"` and the collection's provenance carries the flag.
 *
 * ## The cell assignment
 *
 * A row's positions are quantized against its cell's GRID box, so a vertex
 * OUTSIDE that box cannot be represented — clamping it would flatten every
 * triangle that straddles a cell boundary onto the box face. Triangles are
 * therefore CLIPPED against each cell box they overlap (Sutherland–Hodgman
 * against six axis planes), which is exact, and the pieces are re-welded per
 * cell on their quantized coordinates. The boundary plane quantizes to exactly
 * `0` on one side and `65535` on the other, and `65535/65535 · extent + min`
 * is exactly the neighbour's `min`, so seams close bit-for-bit.
 *
 * Coordinates must be non-negative (Morton codes are), so the whole design is
 * translated by `-floor(bboxMin)` first; the caller records that translation
 * as the collection's placement.
 */

export type BakeMesh = {
  /** Positive integer, unique within the bake. Becomes the row's object id. */
  objectId: number;
  /** xyz interleaved, in the collection's (pre-translation) voxel space. */
  positions: Float32Array;
  /** Triangle list into `positions`. */
  indices: Uint32Array | Uint16Array;
};

export type BakeOptions = {
  /** Fixed cell size (voxels, all three slots). Auto-chosen when omitted. */
  cellSize?: number;
  /** Split finer until no cell carries more indices than this. */
  maxIndicesPerCell?: number;
  /** Target uncompressed bytes per Parquet row group. */
  rowGroupBytes?: number;
  /** Start a new geometry part above this many bytes. */
  partBytes?: number;
  /**
   * `"single"`: ONE level-0 cell holds every object (cell size = the next
   * power of two above the extent, no index cap). Objects never share
   * vertices, so the reader's per-cell smooth normals are then exact — no
   * seams — at the price of coarser quantization (`quantizationVoxels`)
   * and no per-cell culling. The designer uses it for small collections.
   */
  cells?: "auto" | "single";
};

/** One `level=0` geometry row, ready for the Parquet encoder. */
export type BakedGeometryRow = {
  level: 0;
  cell: number;
  positions: Uint8Array;
  indices: Uint8Array;
  vertexCount: number;
  indexCount: number;
  objectIds: number[];
  objectOrdinals: number[];
  objectVertexOffsets: number[];
  objectIndexOffsets: number[];
};

export type BakedCellRow = {
  level: 0;
  cell: number;
  vertexCount: number;
  indexCount: number;
  bboxMin: [number, number, number];
  bboxMax: [number, number, number];
  lodError: number;
  objectCount: number;
  childMask: 0;
  part: number;
  rowGroup: number;
  blobBytes: number;
};

export type BakedObjectRow = {
  objectId: number;
  ordinal: number;
  bboxMin: [number, number, number];
  bboxMax: [number, number, number];
  vertexCount: number;
  indexCount: number;
  cells: { level: 0; cell: number }[];
};

/** A geometry part: its rows, and how they fall into row groups. */
export type BakedPart = {
  path: string;
  rows: BakedGeometryRow[];
  /** Row count of each row group, in order. */
  rowGroupSizes: number[];
};

export type BakedCollection = {
  grid: FabriksGrid;
  encoding: FabriksEncoding;
  /** Subtract from voxel space to get back to the caller's input space. */
  offset: [number, number, number];
  /** Positional error of the uint16 quantization, in voxels (largest cell axis / 65535). */
  quantizationVoxels: number;
  parts: BakedPart[];
  cells: BakedCellRow[];
  objects: BakedObjectRow[];
};

export const BAKE_ENCODING: FabriksEncoding = {
  positions: "UINT16_QUANTIZED_PER_CELL",
  indices: "UINT32",
  codec: "NONE",
  compression: "NONE",
  boundary: "LOCKED",
  decimation: "CUSTOM",
};

export const DEFAULT_MAX_INDICES_PER_CELL = 60_000;
export const DEFAULT_ROW_GROUP_BYTES = 512 * 1024;
export const DEFAULT_PART_BYTES = 64 * 1024 * 1024;

const QUANT_MAX = 65535;
const EPSILON = 1e-7;

type Vec3 = [number, number, number];

type CellBuilder = {
  cell: number;
  gridBox: VoxelBox;
  /** Running index count over every object piece, for the cap. */
  indexCount: number;
  /** Per object (ascending id): welded vertex table and triangle list. */
  objects: Map<number, ObjectPiece>;
};

type ObjectPiece = {
  /** quantized-key → local vertex index */
  lookup: Map<number, number>;
  quantized: number[]; // 3 per vertex
  floats: number[]; // 3 per vertex, unquantized voxel space (for bboxes)
  indices: number[];
};

const quantKey = (qx: number, qy: number, qz: number): number => qx + qy * 65536 + qz * 65536 * 65536;

/** Clip a convex polygon against the half-space `p[axis] ≥ bound` (or ≤). */
const clipPolygon = (polygon: Vec3[], axis: number, bound: number, keepAbove: boolean): Vec3[] => {
  const out: Vec3[] = [];
  const inside = (p: Vec3) => (keepAbove ? p[axis] >= bound - EPSILON : p[axis] <= bound + EPSILON);
  for (let i = 0; i < polygon.length; i++) {
    const current = polygon[i];
    const next = polygon[(i + 1) % polygon.length];
    const currentIn = inside(current);
    const nextIn = inside(next);
    if (currentIn) out.push(current);
    if (currentIn !== nextIn) {
      const t = (bound - current[axis]) / (next[axis] - current[axis]);
      const p: Vec3 = [
        current[0] + (next[0] - current[0]) * t,
        current[1] + (next[1] - current[1]) * t,
        current[2] + (next[2] - current[2]) * t,
      ];
      p[axis] = bound; // exact on the plane so both sides quantize identically
      out.push(p);
    }
  }
  return out;
};

const clipToBox = (triangle: Vec3[], box: VoxelBox): Vec3[] => {
  let polygon = triangle;
  for (let axis = 0; axis < 3 && polygon.length >= 3; axis++) {
    polygon = clipPolygon(polygon, axis, box.min[axis], true);
    if (polygon.length < 3) break;
    polygon = clipPolygon(polygon, axis, box.max[axis], false);
  }
  return polygon.length >= 3 ? polygon : [];
};

const pieceFor = (builder: CellBuilder, objectId: number): ObjectPiece => {
  let piece = builder.objects.get(objectId);
  if (!piece) {
    piece = { lookup: new Map(), quantized: [], floats: [], indices: [] };
    builder.objects.set(objectId, piece);
  }
  return piece;
};

const addVertex = (piece: ObjectPiece, p: Vec3, box: VoxelBox): number => {
  const q: number[] = [0, 0, 0];
  for (let axis = 0; axis < 3; axis++) {
    const extent = box.max[axis] - box.min[axis];
    const v = Math.round(((p[axis] - box.min[axis]) / extent) * QUANT_MAX);
    q[axis] = Math.min(QUANT_MAX, Math.max(0, v));
  }
  const key = quantKey(q[0], q[1], q[2]);
  const existing = piece.lookup.get(key);
  if (existing !== undefined) return existing;
  const index = piece.quantized.length / 3;
  piece.lookup.set(key, index);
  piece.quantized.push(q[0], q[1], q[2]);
  piece.floats.push(p[0], p[1], p[2]);
  return index;
};

/**
 * Distribute every (clipped) triangle into cells at `cellSize`. Returns null
 * when some cell exceeds `maxIndicesPerCell` and a finer grid is still
 * possible, so the caller can halve and retry.
 */
const assignCells = (
  meshes: readonly BakeMesh[],
  offset: Vec3,
  grid: FabriksGrid,
  maxIndicesPerCell: number,
): Map<number, CellBuilder> | null => {
  const cells = new Map<number, CellBuilder>();
  const size = grid.cellSize;
  const a: Vec3 = [0, 0, 0];
  const b: Vec3 = [0, 0, 0];
  const c: Vec3 = [0, 0, 0];

  for (const mesh of meshes) {
    const pos = mesh.positions;
    const idx = mesh.indices;
    for (let t = 0; t + 2 < idx.length; t += 3) {
      const corners = [a, b, c];
      for (let k = 0; k < 3; k++) {
        const v = idx[t + k] * 3;
        corners[k][0] = pos[v] - offset[0];
        corners[k][1] = pos[v + 1] - offset[1];
        corners[k][2] = pos[v + 2] - offset[2];
      }
      // Cell index range the triangle's bbox touches (usually one cell).
      const lo = [0, 0, 0];
      const hi = [0, 0, 0];
      for (let axis = 0; axis < 3; axis++) {
        const min = Math.min(a[axis], b[axis], c[axis]);
        const max = Math.max(a[axis], b[axis], c[axis]);
        lo[axis] = Math.max(0, Math.floor(min / size[axis]));
        // A vertex exactly on a boundary belongs to the lower cell too; the
        // clip against the upper cell yields a degenerate piece and is dropped.
        hi[axis] = Math.max(lo[axis], Math.ceil(max / size[axis]) - 1);
      }
      for (let cz = lo[2]; cz <= hi[2]; cz++) {
        for (let cy = lo[1]; cy <= hi[1]; cy++) {
          for (let cx = lo[0]; cx <= hi[0]; cx++) {
            const cell = encodeMorton3(cx, cy, cz);
            let builder = cells.get(cell);
            if (!builder) {
              builder = { cell, gridBox: cellGridBox(grid, 0, cell), indexCount: 0, objects: new Map() };
              cells.set(cell, builder);
            }
            const single = lo[0] === hi[0] && lo[1] === hi[1] && lo[2] === hi[2];
            const polygon = single
              ? [[...a] as Vec3, [...b] as Vec3, [...c] as Vec3]
              : clipToBox([[...a], [...b], [...c]], builder.gridBox);
            if (polygon.length < 3) continue;
            const piece = pieceFor(builder, mesh.objectId);
            const local = polygon.map((p) => addVertex(piece, p, builder.gridBox));
            // Fan-triangulate the convex piece, preserving winding.
            for (let k = 1; k + 1 < local.length; k++) {
              const i0 = local[0];
              const i1 = local[k];
              const i2 = local[k + 1];
              if (i0 === i1 || i1 === i2 || i0 === i2) continue; // collapsed by quantization
              piece.indices.push(i0, i1, i2);
              builder.indexCount += 3;
            }
            if (builder.indexCount > maxIndicesPerCell && size[0] > 1) return null;
          }
        }
      }
    }
  }
  return cells;
};

// Accepts typed arrays directly so callers never box a whole Float32Array.
const bboxOf = (floats: ArrayLike<number>): { min: Vec3; max: Vec3 } => {
  const min: Vec3 = [Infinity, Infinity, Infinity];
  const max: Vec3 = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < floats.length; i += 3) {
    for (let axis = 0; axis < 3; axis++) {
      const v = floats[i + axis];
      if (v < min[axis]) min[axis] = v;
      if (v > max[axis]) max[axis] = v;
    }
  }
  return { min, max };
};

const mergeBox = (into: { min: Vec3; max: Vec3 }, box: { min: Vec3; max: Vec3 }) => {
  for (let axis = 0; axis < 3; axis++) {
    into.min[axis] = Math.min(into.min[axis], box.min[axis]);
    into.max[axis] = Math.max(into.max[axis], box.max[axis]);
  }
};

const nextPowerOfTwo = (n: number): number => 2 ** Math.ceil(Math.log2(Math.max(1, n)));

/** Bake every mesh into single-level fabriks rows. Throws on unusable input. */
export function bakeFabriksCollection(
  meshes: readonly BakeMesh[],
  options: BakeOptions = {},
): BakedCollection {
  if (meshes.length === 0) throw new Error("A fabriks collection needs at least one mesh.");
  const ids = new Set<number>();
  for (const mesh of meshes) {
    if (!Number.isInteger(mesh.objectId) || mesh.objectId < 1) {
      throw new Error(`Object ids are positive integers; got ${mesh.objectId}.`);
    }
    if (ids.has(mesh.objectId)) throw new Error(`Object id ${mesh.objectId} is used twice.`);
    ids.add(mesh.objectId);
    if (mesh.indices.length % 3 !== 0) {
      throw new Error(`Object ${mesh.objectId}'s indices (${mesh.indices.length}) are not a triangle list.`);
    }
  }

  const maxIndicesPerCell = options.maxIndicesPerCell ?? DEFAULT_MAX_INDICES_PER_CELL;

  // Global bounds → non-negative frame.
  const global = { min: [Infinity, Infinity, Infinity] as Vec3, max: [-Infinity, -Infinity, -Infinity] as Vec3 };
  for (const mesh of meshes) mergeBox(global, bboxOf(mesh.positions));
  if (!global.min.every(Number.isFinite)) throw new Error("The meshes carry no vertices.");
  const offset: Vec3 = [Math.floor(global.min[0]), Math.floor(global.min[1]), Math.floor(global.min[2])];
  const extent = Math.max(
    global.max[0] - offset[0],
    global.max[1] - offset[1],
    global.max[2] - offset[2],
    1,
  );

  // Cell size: given, or a power of two aiming at ~8 cells along the longest
  // axis, then halved until no cell exceeds the index cap. Never below 1 and
  // never more than 2^17 cells per axis (the Morton contract).
  const minCellSize = nextPowerOfTwo(Math.ceil(extent / 2 ** MAX_MORTON_BITS_PER_AXIS));
  const single = options.cells === "single";
  let cellSize = options.cellSize ?? (single ? nextPowerOfTwo(extent + 1) : Math.max(minCellSize, nextPowerOfTwo(extent / 8)));
  if (cellSize < minCellSize) {
    throw new Error(`A cell size of ${cellSize} needs more than 2^17 cells along an axis of ${extent} voxels.`);
  }
  let grid: FabriksGrid = { cellSize: [cellSize, cellSize, cellSize], levels: 1, sortKey: "MORTON" };
  let cells = assignCells(meshes, offset, grid, single ? Number.POSITIVE_INFINITY : maxIndicesPerCell);
  while (cells === null) {
    if (single || options.cellSize !== undefined || cellSize / 2 < minCellSize) {
      // Cannot split further: accept the oversized cell rather than refuse.
      cells = assignCells(meshes, offset, grid, Number.POSITIVE_INFINITY);
      break;
    }
    cellSize /= 2;
    grid = { cellSize: [cellSize, cellSize, cellSize], levels: 1, sortKey: "MORTON" };
    cells = assignCells(meshes, offset, grid, maxIndicesPerCell);
  }
  if (!cells) throw new Error("unreachable: cell assignment produced nothing");

  // Ordinals: dense rank by ascending object id.
  const sortedIds = [...ids].sort((x, y) => x - y);
  const ordinalOf = new Map(sortedIds.map((id, ordinal) => [id, ordinal]));
  const objectRows = new Map<number, BakedObjectRow>(
    sortedIds.map((id) => [
      id,
      {
        objectId: id,
        ordinal: ordinalOf.get(id)!,
        bboxMin: [Infinity, Infinity, Infinity],
        bboxMax: [-Infinity, -Infinity, -Infinity],
        vertexCount: 0,
        indexCount: 0,
        cells: [],
      },
    ]),
  );

  // Rows, sorted by Morton code.
  const lodError = Math.max(...grid.cellSize) / QUANT_MAX;
  const sortedCells = [...cells.values()].sort((x, y) => x.cell - y.cell);
  const geometryRows: BakedGeometryRow[] = [];
  const cellRows: BakedCellRow[] = [];
  for (const builder of sortedCells) {
    const objectIds = [...builder.objects.keys()].filter((id) => builder.objects.get(id)!.indices.length > 0).sort((x, y) => x - y);
    if (objectIds.length === 0) continue;
    let vertexCount = 0;
    let indexCount = 0;
    const objectVertexOffsets: number[] = [];
    const objectIndexOffsets: number[] = [];
    const bbox = { min: [Infinity, Infinity, Infinity] as Vec3, max: [-Infinity, -Infinity, -Infinity] as Vec3 };
    for (const id of objectIds) {
      const piece = builder.objects.get(id)!;
      objectVertexOffsets.push(vertexCount);
      objectIndexOffsets.push(indexCount);
      vertexCount += piece.quantized.length / 3;
      indexCount += piece.indices.length;
    }
    const positions = new Uint8Array(vertexCount * 6);
    const positionView = new DataView(positions.buffer);
    const indices = new Uint8Array(indexCount * 4);
    const indexView = new DataView(indices.buffer);
    let vertexCursor = 0;
    let indexCursor = 0;
    for (const id of objectIds) {
      const piece = builder.objects.get(id)!;
      const base = vertexCursor;
      for (let i = 0; i < piece.quantized.length; i++) {
        positionView.setUint16((vertexCursor * 3 + i) * 2, piece.quantized[i], true);
      }
      vertexCursor += piece.quantized.length / 3;
      // Indices address the cell's CONCATENATED vertex array.
      for (let i = 0; i < piece.indices.length; i++) {
        indexView.setUint32((indexCursor + i) * 4, base + piece.indices[i], true);
      }
      indexCursor += piece.indices.length;

      const pieceBox = bboxOf(piece.floats);
      mergeBox(bbox, pieceBox);
      const objectRow = objectRows.get(id)!;
      mergeBox({ min: objectRow.bboxMin, max: objectRow.bboxMax }, pieceBox);
      objectRow.vertexCount += piece.quantized.length / 3;
      objectRow.indexCount += piece.indices.length;
      objectRow.cells.push({ level: 0, cell: builder.cell });
    }
    geometryRows.push({
      level: 0,
      cell: builder.cell,
      positions,
      indices,
      vertexCount,
      indexCount,
      objectIds,
      objectOrdinals: objectIds.map((id) => ordinalOf.get(id)!),
      objectVertexOffsets,
      objectIndexOffsets,
    });
    cellRows.push({
      level: 0,
      cell: builder.cell,
      vertexCount,
      indexCount,
      bboxMin: bbox.min,
      bboxMax: bbox.max,
      lodError,
      objectCount: objectIds.length,
      childMask: 0,
      part: 0, // assigned below
      rowGroup: 0,
      blobBytes: positions.byteLength + indices.byteLength,
    });
  }

  // Parts and row groups, by cumulative blob bytes.
  const rowGroupBytes = options.rowGroupBytes ?? DEFAULT_ROW_GROUP_BYTES;
  const partBytes = options.partBytes ?? DEFAULT_PART_BYTES;
  const parts: BakedPart[] = [];
  let current: BakedPart | null = null;
  let partSize = 0;
  let groupSize = 0;
  let groupRows = 0;
  const closeGroup = () => {
    if (current && groupRows > 0) current.rowGroupSizes.push(groupRows);
    groupSize = 0;
    groupRows = 0;
  };
  for (let i = 0; i < geometryRows.length; i++) {
    const bytes = cellRows[i].blobBytes;
    if (!current || (partSize > 0 && partSize + bytes > partBytes)) {
      closeGroup();
      current = { path: `level=0/part-${String(parts.length).padStart(5, "0")}.parquet`, rows: [], rowGroupSizes: [] };
      parts.push(current);
      partSize = 0;
    } else if (groupRows > 0 && groupSize + bytes > rowGroupBytes) {
      closeGroup();
    }
    current.rows.push(geometryRows[i]);
    cellRows[i].part = parts.length - 1;
    cellRows[i].rowGroup = current.rowGroupSizes.length;
    partSize += bytes;
    groupSize += bytes;
    groupRows += 1;
  }
  closeGroup();

  return {
    grid,
    encoding: BAKE_ENCODING,
    offset,
    quantizationVoxels: Math.max(...grid.cellSize) / QUANT_MAX,
    parts,
    cells: cellRows,
    objects: sortedIds.map((id) => objectRows.get(id)!),
  };
}
