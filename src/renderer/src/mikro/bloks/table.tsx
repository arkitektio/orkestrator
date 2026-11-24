import * as React from "react";
import * as z from "zod";

import {
  bindSchema,
  boolSchema,
  classNameSchema,
  sizeSchema,
  structureValueSchema,
  type SpecPort,
} from "@arkitektio/bsx/catalogs";
import { createBlokComponent, markBindSchema, type BlokComponentDefinition, type BlokRenderArgs } from "@arkitektio/bsx/renderer/runtime/index";

import { preloadable } from "@/core/util/preloadable";

import { lazily } from "./lazily";
import { ROW_OPS, ROWS_LIMIT_DEFAULT, ROWS_LIMIT_MAX } from "./tableSql";

/** The service mikro's components need where they are drawn: without it a notice shows in their place. */
export const MIKRO_SERVICE = "mikro";

/**
 * A mikro TableDataset, as bloks: what its columns are, what one column holds,
 * and a page of its rows. Each reads one table, named as a structure
 * (`value={args.table}`), and writes its record (`BlokResourceRecord`) under
 * `bind` for the rest of the blok:
 *
 *     <TableColumns value={args.table} role="ATTRIBUTE" bind={cols} />
 *     <foreach items={cols.data} let="col"><Text text={col.name} /></foreach>
 *     <ColumnStat value={args.table} column={ui.column} bind={stat} />
 *     <Text text={fmt.number(stat.data.mean)} />
 *     <ColumnHistogram value={args.table} column={ui.column} height="8rem" />
 *     <TableRows value={args.table} columns={ui.picked} where={ui.filter} bind={rows} />
 *
 * The reads go through the shared parquet engine (one DuckDB connection, one
 * scoped secret per store); a blok never writes SQL. The renders are lazy
 * (`./TableParts`), see `./lazily`.
 */

const Parts = {
  TableColumns: preloadable<BlokRenderArgs>(() => import("./TableParts").then((module) => ({ default: module.TableColumnsRender }))),
  ColumnStat: preloadable<BlokRenderArgs>(() => import("./TableParts").then((module) => ({ default: module.ColumnStatRender }))),
  ColumnHistogram: preloadable<BlokRenderArgs>(() =>
    import("./TableParts").then((module) => ({ default: module.ColumnHistogramRender })),
  ),
  TableRows: preloadable<BlokRenderArgs>(() => import("./TableParts").then((module) => ({ default: module.TableRowsRender }))),
};

const tableValueSchema = structureValueSchema.describe(
  'The table, a structure reference ({"object", "__identifier": "@mikro/tabledataset"}): typically `{args.table}`.',
);
const columnSchema = z.string().nullish().describe("The column, by its name. Nothing is read while it is unset.");
const clearOnUnmountSchema = boolSchema.describe(
  "Remove the record when this leaves the screen, instead of keeping it marked stale.",
);

const recordBind = (data: string) =>
  markBindSchema(bindSchema.describe(
    `Where the record is written: {"status", "loading", "ready", "failed", "empty", "stale", "error", "data"}. ${data} Seed it in demo_state for the preview, which reads nothing.`,
  ));

/** What a reader writes to its bind: the record of its read, and what it read as `data`. */
const field = (key: string, port: SpecPort) => ({ key, ...port });
const scalar = (kind: string, nullable = false): SpecPort => ({ kind, nullable });
const listOf = (item: SpecPort, nullable = false): SpecPort => ({ kind: "LIST", nullable, children: [field("...", item)] });
const record = (data: SpecPort): SpecPort => ({
  kind: "MODEL",
  children: [
    field("status", scalar("STRING")),
    ...["loading", "ready", "failed", "empty", "stale"].map((key) => field(key, scalar("BOOL"))),
    field("error", scalar("STRING", true)),
    field("data", data),
  ],
});
const model = (fields: Record<string, SpecPort>, nullable = false): SpecPort => ({
  kind: "MODEL",
  nullable,
  children: Object.entries(fields).map(([key, port]) => field(key, port)),
});
const CELL: SpecPort = {
  kind: "UNION",
  nullable: true,
  children: ["STRING", "FLOAT", "BOOL"].map((kind, index) => field(String(index), { kind })),
};

export const COLUMN_ROLES = ["ATTRIBUTE", "COLOR", "COORDINATE", "GROUP_ID", "ID", "LABEL", "TRACK_ID"] as const;

export const tableColumnsSchema = z
  .object({
    value: tableValueSchema,
    role: z
      .union([z.enum(COLUMN_ROLES), z.array(z.enum(COLUMN_ROLES))])
      .optional()
      .describe("Only the columns of this role (or of any of these roles)."),
    bind: recordBind(
      '`data` is the list of columns, in order: {"name", "longName", "description", "dtype", "role", "unit", "axisType"}.',
    ),
    clearOnUnmount: clearOnUnmountSchema,
  })
  .describe("Reads what a TableDataset's columns are. Draws nothing: a picker or a foreach reads the record.");

export const columnStatSchema = z
  .object({
    value: tableValueSchema,
    column: columnSchema,
    distinct: boolSchema.describe("Also count the distinct values. A full scan of the column: leave it off unless shown."),
    bind: recordBind(
      '`data` is {"rows", "nonNull", "min", "max", "mean", "distinct"}; min/max/mean are null for a column with no numbers, distinct is null unless asked for.',
    ),
    clearOnUnmount: clearOnUnmountSchema,
  })
  .describe("Reads how full one column of a TableDataset is and how its numbers spread, in one scan. Draws nothing.");

export const columnHistogramSchema = z
  .object({
    value: tableValueSchema,
    column: columnSchema,
    bins: z.number().optional().describe("How many bars. Defaults to 32."),
    height: sizeSchema.describe('CSS height of the bars. Defaults to "6rem".'),
    bind: recordBind('`data` is {"domain": {"min", "max"}, "bins": [counts]}, or null for a column with no numbers.'),
    clearOnUnmount: clearOnUnmountSchema,
    className: classNameSchema,
  })
  .describe("Draws how the numbers of one column of a TableDataset are distributed, as bars over its range.");

const conditionSchema = z.object({
  column: z.string(),
  op: z.enum(ROW_OPS).optional(),
  value: z.union([z.string(), z.number(), z.boolean(), z.array(z.union([z.string(), z.number()]))]).optional(),
});

export const tableRowsSchema = z
  .object({
    value: tableValueSchema,
    columns: z
      .array(z.string())
      .nullish()
      .describe("The columns to read, by name. Defaults to every column."),
    where: z
      .array(conditionSchema)
      .nullish()
      .describe(
        `Conditions every row must meet: [{"column", "op", "value"}], op one of ${ROW_OPS.join(", ")} (default eq). "in" takes a list; "contains" matches text, ignoring case.`,
      ),
    orderBy: z.string().nullish().describe("The column to sort by."),
    descending: boolSchema.describe("Sort from the largest."),
    limit: z.number().optional().describe(`Rows per page. Defaults to ${ROWS_LIMIT_DEFAULT}, at most ${ROWS_LIMIT_MAX}.`),
    offset: z.number().optional().describe("Rows to skip: the page is offset / limit."),
    bind: recordBind('`data` is {"rows": [{column: value}], "total"}: total counts every row the conditions keep.'),
    clearOnUnmount: clearOnUnmountSchema,
  })
  .describe("Reads one page of a TableDataset's rows, filtered and sorted. Draws nothing: a foreach or a Table reads the record.");

const reader = (
  name: string,
  schema: z.ZodObject<Record<string, z.ZodTypeAny>>,
  data: SpecPort,
  Part: React.ComponentType<BlokRenderArgs>,
): BlokComponentDefinition =>
  createBlokComponent(
    { name, schema, service: MIKRO_SERVICE, writesRecordTo: "bind", bindKinds: { bind: record(data) } },
    lazily(Part),
  );

const COLUMN = model({
  name: scalar("STRING"),
  longName: scalar("STRING", true),
  description: scalar("STRING", true),
  dtype: scalar("STRING"),
  role: scalar("STRING", true),
  unit: scalar("STRING", true),
  axisType: scalar("STRING", true),
});

export const TableColumnsBlok = reader("TableColumns", tableColumnsSchema, listOf(COLUMN, true), Parts.TableColumns);
export const ColumnStatBlok = reader(
  "ColumnStat",
  columnStatSchema,
  model(
    {
      rows: scalar("INT"),
      nonNull: scalar("INT"),
      min: scalar("FLOAT", true),
      max: scalar("FLOAT", true),
      mean: scalar("FLOAT", true),
      distinct: scalar("INT", true),
    },
    true,
  ),
  Parts.ColumnStat,
);
export const ColumnHistogramBlok = reader(
  "ColumnHistogram",
  columnHistogramSchema,
  model({ domain: model({ min: scalar("FLOAT"), max: scalar("FLOAT") }), bins: listOf(scalar("INT")) }, true),
  Parts.ColumnHistogram,
);
export const TableRowsBlok = reader(
  "TableRows",
  tableRowsSchema,
  model({ rows: listOf({ kind: "DICT", children: [field("...", CELL)] }), total: scalar("INT") }, true),
  Parts.TableRows,
);

export const MIKRO_TABLE_BLOKS: readonly BlokComponentDefinition[] = [
  TableColumnsBlok,
  ColumnStatBlok,
  ColumnHistogramBlok,
  TableRowsBlok,
];
