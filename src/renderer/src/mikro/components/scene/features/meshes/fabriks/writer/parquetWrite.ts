import { parquetWriteBuffer } from "hyparquet-writer";
import type { SchemaElement } from "hyparquet";
import type { BakedCellRow, BakedGeometryRow, BakedObjectRow, BakedPart } from "./fabriksBake";

/**
 * Baked rows → Parquet bytes, with the SAME schema the Python producer writes
 * (`fabriksCore.test.ts`'s fixtures are the oracle, and `fabriksBake.test.ts`
 * asserts schema parity against them element by element).
 *
 * The schema is explicit rather than inferred: hyparquet-writer would guess
 * INT32 for small INT64 columns, JSON for the list columns, and a UTF8
 * converted type for the blobs — each of which the reader would then decode
 * differently. INT64 columns take bigints, which is what hyparquet hands back.
 *
 * Page compression is SNAPPY (hyparquet-writer's built-in; hyparquet reads it
 * without a plugin). This is Parquet-level compression and unrelated to the
 * manifest's `encoding.compression`, which describes the blobs inside the
 * cells and stays `NONE`.
 */

const optional = (name: string, type: SchemaElement["type"], extra: Partial<SchemaElement> = {}): SchemaElement => ({
  name,
  type,
  repetition_type: "OPTIONAL",
  ...extra,
});

const list = (name: string, element: SchemaElement[]): SchemaElement[] => [
  { name, repetition_type: "OPTIONAL", converted_type: "LIST", logical_type: { type: "LIST" }, num_children: 1 },
  { name: "list", repetition_type: "REPEATED", num_children: 1 },
  ...element,
];

const root = (children: number): SchemaElement => ({ name: "schema", repetition_type: "REQUIRED", num_children: children });

export const GEOMETRY_SCHEMA: SchemaElement[] = [
  root(10),
  optional("level", "INT32"),
  optional("cell", "INT64"),
  optional("positions", "BYTE_ARRAY"),
  optional("indices", "BYTE_ARRAY"),
  optional("vertex_count", "INT32"),
  optional("index_count", "INT32"),
  ...list("object_ids", [optional("element", "INT64")]),
  ...list("object_ordinals", [optional("element", "INT32")]),
  ...list("object_vertex_offsets", [optional("element", "INT32")]),
  ...list("object_index_offsets", [optional("element", "INT32")]),
];

const BBOX = (): SchemaElement[] =>
  ["bbox_min_x", "bbox_min_y", "bbox_min_z", "bbox_max_x", "bbox_max_y", "bbox_max_z"].map((name) =>
    optional(name, "DOUBLE"),
  );

export const CELL_CATALOG_SCHEMA: SchemaElement[] = [
  root(16),
  optional("level", "INT32"),
  optional("cell", "INT64"),
  optional("vertex_count", "INT32"),
  optional("index_count", "INT32"),
  ...BBOX(),
  optional("lod_error", "DOUBLE"),
  optional("object_count", "INT32"),
  optional("child_mask", "INT32", {
    converted_type: "UINT_8",
    logical_type: { type: "INTEGER", bitWidth: 8, isSigned: false },
  }),
  optional("part", "INT32"),
  optional("row_group", "INT32"),
  optional("blob_bytes", "INT64"),
];

export const OBJECT_CATALOG_SCHEMA: SchemaElement[] = [
  root(11),
  optional("object_id", "INT64"),
  optional("ordinal", "INT32"),
  ...BBOX(),
  optional("vertex_count", "INT32"),
  optional("index_count", "INT32"),
  ...list("cells", [
    { name: "element", repetition_type: "OPTIONAL", num_children: 2 },
    optional("level", "INT32"),
    optional("cell", "INT64"),
  ]),
];

const column = (name: string, data: unknown[]) => ({ name, data });

const write = (
  schema: SchemaElement[],
  columns: { name: string; data: unknown[] }[],
  rowGroupSize: number | number[],
): Uint8Array =>
  new Uint8Array(
    parquetWriteBuffer({
      columnData: columns as Parameters<typeof parquetWriteBuffer>[0]["columnData"],
      schema,
      codec: "SNAPPY",
      statistics: false,
      rowGroupSize,
    }),
  );

/** One geometry part, its row groups exactly as `rowGroupSizes` says. */
export function writeGeometryPart(part: BakedPart): Uint8Array {
  const rows: BakedGeometryRow[] = part.rows;
  return write(
    GEOMETRY_SCHEMA,
    [
      column("level", rows.map((r) => r.level)),
      column("cell", rows.map((r) => BigInt(r.cell))),
      column("positions", rows.map((r) => r.positions)),
      column("indices", rows.map((r) => r.indices)),
      column("vertex_count", rows.map((r) => r.vertexCount)),
      column("index_count", rows.map((r) => r.indexCount)),
      column("object_ids", rows.map((r) => r.objectIds.map(BigInt))),
      column("object_ordinals", rows.map((r) => r.objectOrdinals)),
      column("object_vertex_offsets", rows.map((r) => r.objectVertexOffsets)),
      column("object_index_offsets", rows.map((r) => r.objectIndexOffsets)),
    ],
    part.rowGroupSizes,
  );
}

export function writeCellCatalog(rows: readonly BakedCellRow[]): Uint8Array {
  return write(
    CELL_CATALOG_SCHEMA,
    [
      column("level", rows.map((r) => r.level)),
      column("cell", rows.map((r) => BigInt(r.cell))),
      column("vertex_count", rows.map((r) => r.vertexCount)),
      column("index_count", rows.map((r) => r.indexCount)),
      column("bbox_min_x", rows.map((r) => r.bboxMin[0])),
      column("bbox_min_y", rows.map((r) => r.bboxMin[1])),
      column("bbox_min_z", rows.map((r) => r.bboxMin[2])),
      column("bbox_max_x", rows.map((r) => r.bboxMax[0])),
      column("bbox_max_y", rows.map((r) => r.bboxMax[1])),
      column("bbox_max_z", rows.map((r) => r.bboxMax[2])),
      column("lod_error", rows.map((r) => r.lodError)),
      column("object_count", rows.map((r) => r.objectCount)),
      column("child_mask", rows.map((r) => r.childMask)),
      column("part", rows.map((r) => r.part)),
      column("row_group", rows.map((r) => r.rowGroup)),
      column("blob_bytes", rows.map((r) => BigInt(r.blobBytes))),
    ],
    Math.max(1, rows.length),
  );
}

export function writeObjectCatalog(rows: readonly BakedObjectRow[]): Uint8Array {
  return write(
    OBJECT_CATALOG_SCHEMA,
    [
      column("object_id", rows.map((r) => BigInt(r.objectId))),
      column("ordinal", rows.map((r) => r.ordinal)),
      column("bbox_min_x", rows.map((r) => r.bboxMin[0])),
      column("bbox_min_y", rows.map((r) => r.bboxMin[1])),
      column("bbox_min_z", rows.map((r) => r.bboxMin[2])),
      column("bbox_max_x", rows.map((r) => r.bboxMax[0])),
      column("bbox_max_y", rows.map((r) => r.bboxMax[1])),
      column("bbox_max_z", rows.map((r) => r.bboxMax[2])),
      column("vertex_count", rows.map((r) => r.vertexCount)),
      column("index_count", rows.map((r) => r.indexCount)),
      column("cells", rows.map((r) => r.cells.map((c) => ({ level: c.level, cell: BigInt(c.cell) })))),
    ],
    Math.max(1, rows.length),
  );
}
