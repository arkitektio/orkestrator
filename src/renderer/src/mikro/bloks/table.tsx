import * as React from "react";
import * as z from "zod";

import {
  bindSchema,
  boolSchema,
  classNameSchema,
  sizeSchema,
  structureValueSchema,
} from "@/core/blok/renderer/bloks/shared";
import { createBlokComponent, type BlokComponentDefinition, type BlokRenderArgs } from "@/core/blok/renderer/runtime";

import { lazily } from "./lazily";
import { ROW_OPS, ROWS_LIMIT_DEFAULT, ROWS_LIMIT_MAX } from "./tableSql";

/**
 * A mikro TableDataset, as bloks: what its columns are, what one column holds,
 * and a page of its rows. Each reads one table, named as a structure
 * (`value="@args.table"`), and writes its record (`BlokResourceRecord`) under
 * `bind` for the rest of the blok:
 *
 *     <TableColumns value="@args.table" role="ATTRIBUTE" bind="cols" />
 *     <foreach items="@cols.data" let="#col"><Text text="@col.name" /></foreach>
 *     <ColumnStat value="@args.table" column="@ui.column" bind="stat" />
 *     <Text text="@utils.fmt.number(stat.data.mean)" />
 *     <ColumnHistogram value="@args.table" column="@ui.column" height="8rem" />
 *     <TableRows value="@args.table" columns="@ui.picked" where="@ui.filter" bind="rows" />
 *
 * The reads go through the shared parquet engine (one DuckDB connection, one
 * scoped secret per store); a blok never writes SQL. The renders are lazy
 * (`./TableParts`), see `./lazily`.
 */

const Parts = {
  TableColumns: React.lazy(() => import("./TableParts").then((module) => ({ default: module.TableColumnsRender }))),
  ColumnStat: React.lazy(() => import("./TableParts").then((module) => ({ default: module.ColumnStatRender }))),
  ColumnHistogram: React.lazy(() =>
    import("./TableParts").then((module) => ({ default: module.ColumnHistogramRender })),
  ),
  TableRows: React.lazy(() => import("./TableParts").then((module) => ({ default: module.TableRowsRender }))),
};

const tableValueSchema = structureValueSchema.describe(
  'The table, a structure reference ({"object", "__identifier": "@mikro/tabledataset"}): typically @args.table.',
);
const columnSchema = z.string().nullish().describe("The column, by its name. Nothing is read while it is unset.");
const clearOnUnmountSchema = boolSchema.describe(
  "Remove the record when this leaves the screen, instead of keeping it marked stale.",
);

const recordBind = (data: string) =>
  bindSchema.describe(
    `Where the record is written: {"status", "loading", "ready", "failed", "empty", "stale", "error", "data"}. ${data} Seed it in demo_state for the preview, which reads nothing.`,
  );

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
  value: z.unknown().optional(),
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
  Part: React.ComponentType<BlokRenderArgs>,
): BlokComponentDefinition => createBlokComponent({ name, schema, writesRecordTo: "bind" }, lazily(Part));

export const TableColumnsBlok = reader("TableColumns", tableColumnsSchema, Parts.TableColumns);
export const ColumnStatBlok = reader("ColumnStat", columnStatSchema, Parts.ColumnStat);
export const ColumnHistogramBlok = reader("ColumnHistogram", columnHistogramSchema, Parts.ColumnHistogram);
export const TableRowsBlok = reader("TableRows", tableRowsSchema, Parts.TableRows);

export const MIKRO_TABLE_BLOKS: readonly BlokComponentDefinition[] = [
  TableColumnsBlok,
  ColumnStatBlok,
  ColumnHistogramBlok,
  TableRowsBlok,
];
