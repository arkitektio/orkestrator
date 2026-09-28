import { decompress as zstdDecompress } from "fzstd";
import type { FabriksEncoding } from "./fabriksManifest";
import type { VoxelBox } from "./fabriksGrid";

/**
 * Geometry-row decoding: Parquet BLOB columns → renderable typed arrays.
 * Pure and renderer-free so the whole byte contract is unit-testable against
 * fixtures written by fabriks itself; the scene layer only wraps the output in
 * a `BufferGeometry`.
 *
 * ## The row contract (client half of `fabriks/codecs/`)
 *
 *   level                  INT32   octree level, 0 = finest
 *   cell                   INT64   Morton code on that level's grid
 *   positions              BLOB    see below
 *   indices                BLOB    triangle list, uint32 (or uint16)
 *   vertex_count           INT32
 *   index_count            INT32   TOTAL indices, not triangles
 *   object_ids             INT64[] objects in this cell, strictly ascending
 *   object_ordinals        INT32[] each object's dense rank in objects.parquet
 *   object_vertex_offsets  INT32[] START offsets, length n (see below)
 *   object_index_offsets   INT32[] START offsets, length n
 *
 * **positions** are `UINT16_QUANTIZED_PER_CELL`: three little-endian uint16
 * quantized against the cell's GRID box, so a decoder needs only `level`,
 * `cell` and `cellSize` to invert it. The stride is CODEC-DEPENDENT:
 *
 *   codec NONE     stride 6  — exactly `6 · vertex_count` bytes, NO padding
 *   codec MESHOPT  stride 8  — meshopt's vertex codec requires a stride that
 *                             is a multiple of 4, so the writer pads each
 *                             triple to four components (gltfpack does the
 *                             same under EXT_meshopt_compression). Drop the
 *                             fourth on the way out.
 *
 * **There is no normals column.** The renderer computes vertex normals.
 *
 * **Offsets are START offsets, length n — not n+1.** Object `k` spans
 * `[off[k], off[k+1] ?? total)`. Reading them as n+1 fenceposts silently
 * mis-slices the last object, which is why `objectRange` exists rather than
 * the arithmetic being inlined.
 *
 * `encoding.compression` is the PER-BLOB compression and is a different thing
 * from the Parquet page compression (which the Parquet reader handles and the
 * client never sees). Under ZSTD the row's counts are the ONLY statement of a
 * blob's decompressed length — which is exactly why the format refuses to pair
 * ZSTD with MESHOPT.
 */

/** Bytes per vertex in the encoded positions blob, by codec. */
export const positionStride = (codec: FabriksEncoding["codec"]): number => (codec === "MESHOPT" ? 8 : 6);

/** Bytes per index in the encoded indices blob. */
export const indexStride = (indices: FabriksEncoding["indices"]): number => (indices === "UINT16" ? 2 : 4);

export type FabriksGeometryRow = {
  level: number;
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

export type DecodedCell = {
  /** Dequantized positions in the collection's voxel space, xyz interleaved. */
  positions: Float32Array;
  indices: Uint32Array | Uint16Array;
  /**
   * Per-vertex object ordinal, as FLOAT32 rather than an integer attribute.
   * An integer vertex attribute needs `gpuType = THREE.IntType` on WebGL2 and
   * a `uint` declaration in TSL on WebGPU; a float needs neither and is exact
   * to 2^24, which is also the format's own ordinal ceiling.
   */
  objectOrdinals: Float32Array;
  /**
   * Smooth per-vertex normals, present ONLY when the decode request asked for
   * them (`computeNormals` — the smooth-shading mode). Flat mode shades from
   * screen-space derivatives and carries nothing.
   */
  normals?: Float32Array;
  /** Approximate CPU/GPU footprint, for the cell cache's byte accounting. */
  bytes: number;
};

/** The subset of three's MeshoptDecoder this module needs (injectable for tests). */
export type MeshoptDecoderLike = {
  decodeVertexBuffer: (
    target: Uint8Array,
    count: number,
    size: number,
    source: Uint8Array,
    filter?: string,
  ) => void;
  decodeIndexBuffer: (target: Uint8Array, count: number, size: number, source: Uint8Array) => void;
};

/** Half-open `[start, end)` of object `k` within a cell's concatenated arrays. */
export function objectRange(
  offsets: readonly number[],
  index: number,
  total: number,
): { start: number; end: number } {
  const start = offsets[index] ?? 0;
  const end = index + 1 < offsets.length ? offsets[index + 1] : total;
  return { start, end };
}

const alignedCopy = (bytes: Uint8Array): ArrayBuffer => {
  // Parquet-backed blobs are views at arbitrary offsets; typed-array views
  // require element-aligned offsets, so copy once into a fresh buffer.
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  return buffer;
};

/**
 * Undo the per-blob compression. Under ZSTD the expected length comes from the
 * row's counts — the frame carries no reliable size of its own — so a
 * mismatch here means the row and the geometry came from different writes.
 */
const decompressBlob = (
  blob: Uint8Array,
  compression: FabriksEncoding["compression"],
  expectedBytes: number,
  what: string,
): Uint8Array => {
  if (compression !== "ZSTD") return blob;
  const out = zstdDecompress(blob);
  if (out.byteLength !== expectedBytes) {
    throw new Error(
      `${what} decompressed to ${out.byteLength} bytes and its row declares ${expectedBytes}; ` +
        `the row and the geometry belong to different writes.`,
    );
  }
  return out;
};

const decodePositions = (
  row: FabriksGeometryRow,
  encoding: FabriksEncoding,
  gridBox: VoxelBox,
  decoder: MeshoptDecoderLike | null,
): Float32Array => {
  const count = row.vertexCount;
  const stride = positionStride(encoding.codec);

  let quantized: Uint16Array;
  if (encoding.codec === "MESHOPT") {
    if (!decoder) throw new Error("MESHOPT geometry requires a MeshoptDecoder");
    const target = new Uint8Array(count * stride);
    decoder.decodeVertexBuffer(target, count, stride, row.positions);
    quantized = new Uint16Array(target.buffer);
  } else {
    const expected = count * stride;
    const blob = decompressBlob(row.positions, encoding.compression, expected, "A positions blob");
    if (blob.byteLength < expected) {
      throw new Error(
        `A positions blob holds ${blob.byteLength} bytes and its row declares ${count} vertices ` +
          `(${expected} bytes at ${stride} bytes a vertex).`,
      );
    }
    quantized = new Uint16Array(alignedCopy(blob.subarray(0, expected)));
  }

  // q / 65535 spans the cell's grid box per component.
  const componentsPerVertex = stride / 2; // 3 raw, 4 padded under meshopt
  const extent = [
    gridBox.max[0] - gridBox.min[0],
    gridBox.max[1] - gridBox.min[1],
    gridBox.max[2] - gridBox.min[2],
  ];
  const out = new Float32Array(count * 3);
  for (let v = 0; v < count; v++) {
    const src = v * componentsPerVertex;
    const dst = v * 3;
    out[dst] = gridBox.min[0] + (quantized[src] / 65535) * extent[0];
    out[dst + 1] = gridBox.min[1] + (quantized[src + 1] / 65535) * extent[1];
    out[dst + 2] = gridBox.min[2] + (quantized[src + 2] / 65535) * extent[2];
  }
  return out;
};

const decodeIndices = (
  row: FabriksGeometryRow,
  encoding: FabriksEncoding,
  decoder: MeshoptDecoderLike | null,
): Uint32Array | Uint16Array => {
  const count = row.indexCount;
  const stride = indexStride(encoding.indices);

  let raw: ArrayBuffer;
  if (encoding.codec === "MESHOPT") {
    if (!decoder) throw new Error("MESHOPT geometry requires a MeshoptDecoder");
    const target = new Uint8Array(count * stride);
    decoder.decodeIndexBuffer(target, count, stride, row.indices);
    raw = target.buffer;
  } else {
    const expected = count * stride;
    const blob = decompressBlob(row.indices, encoding.compression, expected, "An indices blob");
    if (blob.byteLength < expected) {
      throw new Error(
        `An indices blob holds ${blob.byteLength} bytes and its row declares ${count} indices ` +
          `(${expected} bytes at ${stride} bytes an index).`,
      );
    }
    raw = alignedCopy(blob.subarray(0, expected));
  }

  const values = stride === 2 ? new Uint16Array(raw) : new Uint32Array(raw);
  // Widen when the cell's CONCATENATED vertex array outgrows uint16. Indices
  // address that concatenation, not one object, so a writer may legitimately
  // declare UINT16 for a cell that later exceeds it — gate on the count, never
  // on the declaration.
  if (stride === 2 && row.vertexCount > 0xffff) return Uint32Array.from(values);
  return values;
};

/** Per-vertex object ordinals, expanded from the objects' start offsets. */
const expandOrdinals = (row: FabriksGeometryRow): Float32Array => {
  const out = new Float32Array(row.vertexCount);
  for (let k = 0; k < row.objectOrdinals.length; k++) {
    const { start, end } = objectRange(row.objectVertexOffsets, k, row.vertexCount);
    out.fill(row.objectOrdinals[k], start, Math.min(end, row.vertexCount));
  }
  return out;
};

/**
 * Smooth per-vertex normals over raw arrays — `BufferGeometry.
 * computeVertexNormals`'s exact math (area-weighted face-normal accumulation,
 * `cb × ab` winding, zero vectors left zero by the `length() || 1` normalize),
 * without the geometry object, so it runs in the decode worker. Kept in
 * LOCKSTEP with three's implementation: the manager still calls three's
 * version as the fallback when a normals-mode toggle races a fetch, and the
 * two must not disagree across cells.
 *
 * Same per-CELL limitation as three's: a border vertex only sees this cell's
 * triangles, so normals seam at cell boundaries. Only the writer, with the
 * whole object's connectivity, could do better.
 */
export function computeSmoothNormals(
  positions: Float32Array,
  indices: Uint32Array | Uint16Array,
): Float32Array {
  const normals = new Float32Array(positions.length);
  for (let i = 0; i < indices.length; i += 3) {
    const a = indices[i] * 3;
    const b = indices[i + 1] * 3;
    const c = indices[i + 2] * 3;
    const abx = positions[a] - positions[b];
    const aby = positions[a + 1] - positions[b + 1];
    const abz = positions[a + 2] - positions[b + 2];
    const cbx = positions[c] - positions[b];
    const cby = positions[c + 1] - positions[b + 1];
    const cbz = positions[c + 2] - positions[b + 2];
    const nx = cby * abz - cbz * aby;
    const ny = cbz * abx - cbx * abz;
    const nz = cbx * aby - cby * abx;
    normals[a] += nx;
    normals[a + 1] += ny;
    normals[a + 2] += nz;
    normals[b] += nx;
    normals[b + 1] += ny;
    normals[b + 2] += nz;
    normals[c] += nx;
    normals[c + 1] += ny;
    normals[c + 2] += nz;
  }
  for (let v = 0; v < normals.length; v += 3) {
    const x = normals[v];
    const y = normals[v + 1];
    const z = normals[v + 2];
    const length = Math.sqrt(x * x + y * y + z * z) || 1;
    normals[v] = x / length;
    normals[v + 1] = y / length;
    normals[v + 2] = z / length;
  }
  return normals;
}

/** Decode one geometry row into voxel-space arrays. Throws on a malformed row. */
export function decodeGeometryRow(
  row: FabriksGeometryRow,
  encoding: FabriksEncoding,
  gridBox: VoxelBox,
  decoder: MeshoptDecoderLike | null,
): DecodedCell {
  if (row.indexCount % 3 !== 0) {
    throw new Error(`An index count of ${row.indexCount} is not a triangle list.`);
  }
  const positions = decodePositions(row, encoding, gridBox, decoder);
  const indices = decodeIndices(row, encoding, decoder);
  const objectOrdinals = expandOrdinals(row);
  return {
    positions,
    indices,
    objectOrdinals,
    bytes: positions.byteLength + indices.byteLength + objectOrdinals.byteLength,
  };
}
