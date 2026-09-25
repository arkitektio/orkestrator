import { parquetRead } from "hyparquet";
import type { AsyncBuffer, FileMetaData } from "hyparquet";

import {
  computeSmoothNormals,
  decodeGeometryRow,
  type DecodedCell,
  type FabriksGeometryRow,
  type MeshoptDecoderLike,
} from "./fabriksDecode";
import { cellGridBox } from "./fabriksGrid";
import type { FabriksEncoding, FabriksGrid } from "./fabriksManifest";
import { PARQUET_COMPRESSORS } from "@/mikro/components/scene/platform/parquet/parquetPart";
import { toBytes, toNumber, toNumberArray } from "@/mikro/components/scene/platform/parquet/rowValues";

/**
 * The post-fetch half of a row-group read — Parquet parse, wanted-filter and
 * geometry decode — as ONE pure function over a prefetched byte span, so the
 * exact same code runs on the main thread (tests, the sync fallback) and in a
 * decode worker (`fabriksDecode-worker.ts`).
 *
 * Everything a call needs travels as plain data: the span bytes, the parsed
 * footer (hyparquet's `FileMetaData` is parsed thrift — objects, arrays,
 * numbers, bigints, byte arrays — and survives structured clone), the row
 * range, and the manifest's `grid`/`encoding`. Nothing here may touch the
 * transport: a worker cannot fetch through the credential-rotating
 * `S3ParquetStore`, which is exactly why the fetch stays on the main thread and
 * only the CPU-bound half moved (README, "Known gaps").
 */

/** The geometry columns a fetch reads — the row contract's client half. */
export const GEOMETRY_COLUMNS = [
  "level",
  "cell",
  "positions",
  "indices",
  "vertex_count",
  "index_count",
  "object_ids",
  "object_ordinals",
  "object_vertex_offsets",
  "object_index_offsets",
];

/** A geometry row keyed for lookup, before decode. */
export const parseGeometryRow = (row: Record<string, unknown>): FabriksGeometryRow => ({
  level: toNumber(row.level, "level"),
  cell: toNumber(row.cell, "cell"),
  positions: toBytes(row.positions, "positions"),
  indices: toBytes(row.indices, "indices"),
  vertexCount: toNumber(row.vertex_count, "vertex_count"),
  indexCount: toNumber(row.index_count, "index_count"),
  objectIds: toNumberArray(row.object_ids, "object_ids"),
  objectOrdinals: toNumberArray(row.object_ordinals, "object_ordinals"),
  objectVertexOffsets: toNumberArray(row.object_vertex_offsets, "object_vertex_offsets"),
  objectIndexOffsets: toNumberArray(row.object_index_offsets, "object_index_offsets"),
});

/** One row group's worth of decode work, as thread-crossable plain data. */
export type FabriksDecodeRequest = {
  /** The part's path — error context only; nothing is fetched from it. */
  path: string;
  /** The whole part's length (the AsyncBuffer contract needs it). */
  fileByteLength: number;
  /** Byte offset of `spanBytes` within the part. */
  spanStart: number;
  /** The prefetched span holding every column chunk of the row group. On the
   * worker path this arrives as a structured-clone COPY — the original is
   * owned by the S3ParquetStore byte cache and must never be transferred. */
  spanBytes: Uint8Array;
  /** The part's parsed footer. */
  metadata: FileMetaData;
  rowStart: number;
  rowEnd: number;
  /** Morton codes of the planned cells; neighbour rows are skipped unparsed. */
  wantedCells: readonly number[];
  grid: FabriksGrid;
  encoding: FabriksEncoding;
  /** Smooth-shading mode: also compute per-vertex normals here, off the main
   * thread. Flat mode (the default) omits this and carries no normals at all. */
  computeNormals?: boolean;
};

export type FabriksDecodedCell = DecodedCell & { key: string };

/**
 * Parse and decode the wanted cells out of one prefetched row-group span.
 *
 * A slice outside the span throws rather than falling back to a reader: the
 * footer is already parsed and a row group's column chunks are contiguous by
 * construction, so an out-of-span read means the catalog and the geometry
 * disagree — and a worker has no transport to fall back to anyway.
 */
export async function decodeRowGroupSpan(
  request: FabriksDecodeRequest,
  decoder: MeshoptDecoderLike | null,
): Promise<FabriksDecodedCell[]> {
  const { spanBytes, spanStart, fileByteLength } = request;
  const spanEnd = spanStart + spanBytes.byteLength;
  const file: AsyncBuffer = {
    byteLength: fileByteLength,
    slice: async (start: number, end?: number): Promise<ArrayBuffer> => {
      const stop = end ?? fileByteLength;
      if (start < spanStart || stop > spanEnd) {
        throw new Error(
          `${request.path}: a read of [${start}, ${stop}) falls outside the prefetched ` +
            `row-group span [${spanStart}, ${spanEnd}); the footer and the span disagree.`,
        );
      }
      const out = new ArrayBuffer(Math.max(0, stop - start));
      new Uint8Array(out).set(spanBytes.subarray(start - spanStart, stop - spanStart));
      return out;
    },
  };

  let rows: Record<string, unknown>[] = [];
  await parquetRead({
    file,
    metadata: request.metadata,
    columns: GEOMETRY_COLUMNS,
    compressors: PARQUET_COMPRESSORS,
    // NOT optional: hyparquet's utf8 default turns the geometry blobs into
    // mojibake (see `parquetPart.readRows`). Every parquetRead call on the
    // geometry path must carry this.
    utf8: false,
    rowFormat: "object",
    rowStart: request.rowStart,
    rowEnd: request.rowEnd,
    onComplete: (result) => {
      rows = result as unknown as Record<string, unknown>[];
    },
  });

  const wanted = new Set(request.wantedCells);
  const cells: FabriksDecodedCell[] = [];
  for (const raw of rows) {
    // Cell first, full parse after: a shared row group carries neighbours
    // too, and parsing their ten columns just to discard them is pure waste.
    if (!wanted.has(toNumber(raw.cell, "cell"))) continue;
    const row = parseGeometryRow(raw);
    const gridBox = cellGridBox(request.grid, row.level, row.cell);
    const cell = decodeGeometryRow(row, request.encoding, gridBox, decoder);
    if (request.computeNormals) {
      const normals = computeSmoothNormals(cell.positions, cell.indices);
      cells.push({
        key: `${row.level}:${row.cell}`,
        ...cell,
        normals,
        bytes: cell.bytes + normals.byteLength,
      });
      continue;
    }
    cells.push({ key: `${row.level}:${row.cell}`, ...cell });
  }
  return cells;
}
