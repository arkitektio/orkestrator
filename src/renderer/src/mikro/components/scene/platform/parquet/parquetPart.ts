import { parquetMetadataAsync, parquetRead } from "hyparquet";
import type { AsyncBuffer, FileMetaData, RowGroup } from "hyparquet";
import { decompress as zstdDecompress } from "fzstd";
// A range reader is the TRANSPORT's contract, not a Parquet concept, so it has
// one definition next door. Re-exported because every caller of this module
// needs it.
import type { RangeReader } from "./transport";

export type { RangeReader };

/**
 * One open Parquet object: its footer, parsed once, and the row groups a
 * planner asks for.
 *
 * This is where the format's locator pays off. A cell catalog row names the
 * `(part, rowGroup)` holding a cell, so a frame costs one footer per part
 * touched — cached for the life of the reader — plus ONE ranged read per row
 * group it actually needs. Not the level, not the part, and not a read per
 * column chunk: hyparquet slices per column chunk, and a geometry row group has
 * ten to seventeen columns, so handing it the raw ranged reader would turn one
 * 512 KiB row group into ten small authenticated round trips. `readRowGroup`
 * therefore prefetches the group's whole byte span — column chunks of one row
 * group are contiguous by construction — and serves hyparquet's slices from
 * that buffer.
 *
 * The footer is why `byteLength` is a constructor argument rather than
 * something discovered: it sits at the END of the file, our store speaks
 * get/get-range only, and there is no HEAD. The manifest records the length
 * precisely so this can work.
 */

/** Parquet page compression. Only ZSTD needs supplying — hyparquet ships the rest. */
export const PARQUET_COMPRESSORS = {
  ZSTD: (input: Uint8Array) => zstdDecompress(input),
};


/**
 * hyparquet's file abstraction over a ranged reader.
 *
 * Deliberately not a `Blob` or a URL: every read has to go through our signed,
 * credential-rotating fetcher, and hyparquet's `AsyncBuffer` is exactly the
 * seam for that.
 */
export function asyncBufferFor(path: string, byteLength: number, read: RangeReader): AsyncBuffer {
  return {
    byteLength,
    async slice(start: number, end?: number): Promise<ArrayBuffer> {
      const stop = end ?? byteLength;
      if (stop <= start) return new ArrayBuffer(0);
      const bytes = await read(path, start, stop);
      // Copy rather than expose the reader's buffer: hyparquet holds slices,
      // and a cached Uint8Array must not be mutated underneath it.
      const out = new ArrayBuffer(bytes.byteLength);
      new Uint8Array(out).set(bytes);
      return out;
    },
  };
}

/**
 * The half-open byte span holding every column chunk of one row group.
 *
 * A chunk starts at its dictionary page when it has one, else its first data
 * page. Some writers record `dictionary_page_offset: 0` to mean "none" — a
 * dictionary at offset 0 is impossible (the file starts with the `PAR1`
 * magic), so zero and offsets past the data page are ignored, the same guard
 * arrow-rs uses.
 */
export function rowGroupByteSpan(group: RowGroup): { start: number; end: number } {
  let start = Number.POSITIVE_INFINITY;
  let end = 0;
  for (const column of group.columns) {
    const meta = column.meta_data;
    if (!meta) continue;
    const dataStart = Number(meta.data_page_offset);
    const dictionary = meta.dictionary_page_offset;
    const chunkStart =
      dictionary !== undefined && Number(dictionary) > 0 && Number(dictionary) < dataStart
        ? Number(dictionary)
        : dataStart;
    start = Math.min(start, chunkStart);
    end = Math.max(end, chunkStart + Number(meta.total_compressed_size));
  }
  if (!Number.isFinite(start) || end <= start) {
    throw new Error("A row group's column chunks carry no metadata; its bytes cannot be located.");
  }
  return { start, end };
}

export class ParquetPart {
  private metadataPromise: Promise<FileMetaData> | null = null;
  private readonly file: AsyncBuffer;

  constructor(
    readonly path: string,
    readonly byteLength: number,
    private readonly read: RangeReader,
  ) {
    this.file = asyncBufferFor(path, byteLength, read);
  }

  /** The footer, parsed once and reused for every row group read out of this part. */
  metadata(): Promise<FileMetaData> {
    if (!this.metadataPromise) {
      this.metadataPromise = parquetMetadataAsync(this.file).catch((error: unknown) => {
        this.metadataPromise = null; // allow a retry after a transient failure
        throw error;
      });
    }
    return this.metadataPromise;
  }

  /**
   * The half-open row range of one row group.
   *
   * hyparquet has no `readRowGroup(i)`: row groups are selected by row-index
   * overlap, so the group's position is its cumulative row offset.
   */
  async rowRange(rowGroup: number): Promise<{ rowStart: number; rowEnd: number }> {
    const meta = await this.metadata();
    const groups = meta.row_groups;
    if (rowGroup < 0 || rowGroup >= groups.length) {
      throw new Error(
        `${this.path} has ${groups.length} row groups and the catalog names row group ${rowGroup}; ` +
          `the catalog and the geometry disagree.`,
      );
    }
    let rowStart = 0;
    for (let group = 0; group < rowGroup; group++) rowStart += Number(groups[group].num_rows);
    return { rowStart, rowEnd: rowStart + Number(groups[rowGroup].num_rows) };
  }

  /**
   * Read rows as plain objects.
   *
   * `utf8: false` is NOT optional. hyparquet defaults it to true, and its
   * conversion treats any bare BYTE_ARRAY as a string — which is exactly what
   * every geometry blob is — fabriks's `positions`/`indices`, konnektion's
   * `positions`/`edges`/`ghost_positions`. Leaving the default on turns every
   * one of them into mojibake with no error anywhere.
   */
  async readRows(
    columns: string[],
    range?: { rowStart: number; rowEnd: number },
  ): Promise<Record<string, unknown>[]> {
    return this.readWith(this.file, columns, range);
  }

  /**
   * Everything a decoder on ANY thread needs to read one row group: the
   * parsed footer, the group's row range, and its whole byte span in ONE
   * ranged read (through the transport's cache and credential rotation, which
   * is why this half stays on the main thread — see each format's
   * `*DecodeCore.ts`).
   */
  async rowGroupPayload(rowGroup: number): Promise<{
    metadata: FileMetaData;
    rowStart: number;
    rowEnd: number;
    spanStart: number;
    spanBytes: Uint8Array;
  }> {
    const metadata = await this.metadata();
    const range = await this.rowRange(rowGroup);
    const span = rowGroupByteSpan(metadata.row_groups[rowGroup]);
    const spanBytes = await this.read(this.path, span.start, span.end);
    return {
      metadata,
      rowStart: range.rowStart,
      rowEnd: range.rowEnd,
      spanStart: span.start,
      spanBytes,
    };
  }

  /**
   * The degenerate payload for a part with NO row-group locator (legal, if
   * unusual): the whole file as one span — correct and merely slow, exactly
   * what "reading the part whole" promises.
   */
  async wholePayload(): Promise<{
    metadata: FileMetaData;
    rowStart: number;
    rowEnd: number;
    spanStart: number;
    spanBytes: Uint8Array;
  }> {
    const metadata = await this.metadata();
    const spanBytes = await this.read(this.path, 0, this.byteLength);
    const rowEnd = metadata.row_groups.reduce((sum, group) => sum + Number(group.num_rows), 0);
    return { metadata, rowStart: 0, rowEnd, spanStart: 0, spanBytes };
  }

  /**
   * Read exactly the rows of one row group, with ONE ranged read for its
   * bytes: the group's span is prefetched whole and hyparquet's per-column
   * slices are served from it. A slice outside the span (there should be
   * none — the footer is already parsed) falls through to the ranged reader.
   */
  async readRowGroup(rowGroup: number, columns: string[]): Promise<Record<string, unknown>[]> {
    const meta = await this.metadata();
    const range = await this.rowRange(rowGroup);
    const span = rowGroupByteSpan(meta.row_groups[rowGroup]);
    const prefetched = await this.read(this.path, span.start, span.end);
    const file: AsyncBuffer = {
      byteLength: this.byteLength,
      slice: async (start: number, end?: number): Promise<ArrayBuffer> => {
        const stop = end ?? this.byteLength;
        if (start >= span.start && stop <= span.end) {
          const out = new ArrayBuffer(Math.max(0, stop - start));
          new Uint8Array(out).set(prefetched.subarray(start - span.start, stop - span.start));
          return out;
        }
        return this.file.slice(start, stop);
      },
    };
    return this.readWith(file, columns, range);
  }

  private async readWith(
    file: AsyncBuffer,
    columns: string[],
    range?: { rowStart: number; rowEnd: number },
  ): Promise<Record<string, unknown>[]> {
    const metadata = await this.metadata();
    let rows: Record<string, unknown>[] = [];
    await parquetRead({
      file,
      metadata,
      columns,
      compressors: PARQUET_COMPRESSORS,
      utf8: false,
      rowFormat: "object",
      ...(range ? { rowStart: range.rowStart, rowEnd: range.rowEnd } : {}),
      onComplete: (result) => {
        rows = result as unknown as Record<string, unknown>[];
      },
    });
    return rows;
  }
}
