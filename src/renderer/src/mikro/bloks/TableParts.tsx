import * as React from "react";

import { asStructure } from "@arkitektio/bsx/renderer/bloks/shared/index";
import { useBlok, useBlokResource, useValue, type BlokRenderArgs } from "@arkitektio/bsx/renderer/runtime/index";
import { HISTOGRAM_BINS, readColumnDomain, readColumnHistogram } from "@/core/data/parquet/columnStats";
import type { ParquetStoreRef } from "@/core/data/parquet/parquetEngine";
import { cn } from "@/core/util/utils";
import { useGetTableDatasetQuery, type TableDatasetFragment } from "@/mikro/api/graphql";
import {
  AttributeServiceProvider,
  useAttributeServiceOrNull,
} from "@/mikro/lib/attributes/AttributeServiceProvider";

import {
  columnHistogramSchema,
  columnStatSchema,
  tableColumnsSchema,
  tableRowsSchema,
} from "./table";
import { columnStatSql, countSql, ROWS_LIMIT_DEFAULT, rowsSql, type RowCondition } from "./tableSql";

/**
 * The renders of the table bloks (`./table`). Each acquires the shared
 * attribute service (ref-counted: one DuckDB connection however many bloks
 * read) and the table's declaration through Apollo, then reads its parquet.
 * They run behind mikro's guard, which the host puts around every module blok.
 */

type Table = TableDatasetFragment;

/** The table a blok names, and why it could not be read. */
const useTable = (raw: unknown): { table: Table | null; error: unknown } => {
  const structure = asStructure(raw);
  const { data, error } = useGetTableDatasetQuery({
    variables: { id: String(structure?.object ?? "") },
    skip: !structure,
  });
  return { table: data?.tableDataset ?? null, error: error ?? null };
};

const storeOf = (table: Table): ParquetStoreRef => ({ id: table.store.id, sizeBytes: table.store.sizeBytes });

/** Every name a blok hands the SQL is one the table declares, said as a sentence when it is not. */
const requireColumns = (table: Table, names: readonly (string | null | undefined)[]) => {
  const declared = new Set(table.columns.map((column) => column.name));
  const missing = names.filter((name): name is string => Boolean(name) && !declared.has(name as string));
  if (missing.length > 0) {
    throw new Error(
      `The table "${table.name}" has no column ${missing.map((name) => `"${name}"`).join(", ")}.`,
    );
  }
};

const withService = (Inner: React.ComponentType<BlokRenderArgs>) => {
  const Render = (args: BlokRenderArgs) => (
    <AttributeServiceProvider>
      <Inner {...args} />
    </AttributeServiceProvider>
  );
  return Render;
};

/* -------------------------------------------------------------------------- */

export const TableColumnsRender = ({ component }: BlokRenderArgs) => {
  const blok = useBlok(component, tableColumnsSchema);
  const { table, error } = useTable(useValue(blok.value));
  const role = useValue(blok.role);
  const roles = role == null ? null : Array.isArray(role) ? role : [role];

  useBlokResource({
    bind: useValue(blok.bind),
    key: JSON.stringify([table?.id, table?.columns, roles, Boolean(error)]),
    enabled: Boolean(table || error),
    clearOnUnmount: useValue(blok.clearOnUnmount) === true,
    load: async () => {
      if (!table) throw error;
      return [...table.columns]
        .filter((column) => !roles || roles.includes(column.role as (typeof roles)[number]))
        .sort((a, b) => a.order - b.order)
        .map(({ name, longName, description, dtype, role, unit, axisType }) => ({
          name,
          longName,
          description,
          dtype,
          role,
          unit,
          axisType,
        }));
    },
  });

  return null;
};

/* -------------------------------------------------------------------------- */

export const ColumnStatRender = withService(({ component }: BlokRenderArgs) => {
  const blok = useBlok(component, columnStatSchema);
  const { table, error } = useTable(useValue(blok.value));
  const column = useValue(blok.column);
  const distinct = useValue(blok.distinct) === true;
  const engine = useAttributeServiceOrNull()?.engine ?? null;

  useBlokResource({
    bind: useValue(blok.bind),
    key: JSON.stringify([table?.store.id, column, distinct, Boolean(error)]),
    enabled: Boolean(column) && Boolean(error || (table && engine)),
    clearOnUnmount: useValue(blok.clearOnUnmount) === true,
    isEmpty: (data) => (data as { rows: number }).rows === 0,
    load: async () => {
      if (!table || !engine) throw error;
      requireColumns(table, [column]);
      const store = storeOf(table);
      const [row] = await engine.readAcross([store], (urlOf) => columnStatSql(urlOf(store.id), column!, distinct));
      const number = (raw: unknown) => (raw == null ? null : Number(raw));
      return {
        rows: Number(row?.n_rows ?? 0),
        nonNull: Number(row?.n_non_null ?? 0),
        min: number(row?.min),
        max: number(row?.max),
        mean: number(row?.mean),
        distinct: distinct ? Number(row?.n_distinct ?? 0) : null,
      };
    },
  });

  return null;
});

/* -------------------------------------------------------------------------- */

type Histogram = { domain: { min: number; max: number }; bins: number[] } | null;

const Bars = ({ histogram, height, className }: { histogram: Histogram; height?: string; className?: string }) => {
  const peak = histogram ? Math.max(1, ...histogram.bins) : 1;
  return (
    <div className={cn("flex w-full min-w-0 flex-col gap-1", className)}>
      <div className="flex w-full items-end gap-px" style={{ height: height ?? "6rem" }}>
        {histogram?.bins.map((count, index) => (
          <div
            key={index}
            className="flex-1 rounded-t-sm bg-primary/70"
            style={{ height: `${(count / peak) * 100}%`, minHeight: count > 0 ? 1 : 0 }}
            title={String(count)}
          />
        ))}
      </div>
      {histogram && (
        <div className="flex justify-between text-xs text-muted-foreground tabular-nums">
          <span>{histogram.domain.min.toLocaleString()}</span>
          <span>{histogram.domain.max.toLocaleString()}</span>
        </div>
      )}
    </div>
  );
};

export const ColumnHistogramRender = withService(({ component }: BlokRenderArgs) => {
  const blok = useBlok(component, columnHistogramSchema);
  const { table, error } = useTable(useValue(blok.value));
  const column = useValue(blok.column);
  const bins = Math.min(Math.max(Math.round(useValue(blok.bins) ?? HISTOGRAM_BINS), 1), 256);
  const height = useValue(blok.height);
  const className = useValue(blok.className);
  const engine = useAttributeServiceOrNull()?.engine ?? null;

  const record = useBlokResource({
    bind: useValue(blok.bind),
    key: JSON.stringify([table?.store.id, column, bins, Boolean(error)]),
    enabled: Boolean(column) && Boolean(error || (table && engine)),
    clearOnUnmount: useValue(blok.clearOnUnmount) === true,
    load: async (): Promise<Histogram> => {
      if (!table || !engine) throw error;
      requireColumns(table, [column]);
      const target = { table: { store: storeOf(table) }, column: { name: column! } };
      const domain = await readColumnDomain(engine, target);
      return domain ? { domain, bins: await readColumnHistogram(engine, target, domain, bins) } : null;
    },
  });

  if (!column) {
    return <p className={cn("text-sm text-muted-foreground", className)}>No column chosen.</p>;
  }
  if (record.failed) {
    return <p className={cn("text-sm text-muted-foreground", className)}>{record.error}</p>;
  }
  if (record.ready && record.data == null) {
    return <p className={cn("text-sm text-muted-foreground", className)}>&ldquo;{column}&rdquo; holds no numbers.</p>;
  }
  return <Bars histogram={record.data as Histogram} height={height} className={className} />;
});

/* -------------------------------------------------------------------------- */

export const TableRowsRender = withService(({ component }: BlokRenderArgs) => {
  const blok = useBlok(component, tableRowsSchema);
  const { table, error } = useTable(useValue(blok.value));
  const columns = useValue(blok.columns) ?? undefined;
  const where = (useValue(blok.where) ?? undefined) as RowCondition[] | undefined;
  const orderBy = useValue(blok.orderBy) ?? undefined;
  const descending = useValue(blok.descending) === true;
  const limit = useValue(blok.limit) ?? ROWS_LIMIT_DEFAULT;
  const offset = useValue(blok.offset) ?? 0;
  const engine = useAttributeServiceOrNull()?.engine ?? null;
  const request = { columns, where, orderBy, descending, limit, offset };

  useBlokResource({
    bind: useValue(blok.bind),
    key: JSON.stringify([table?.store.id, request, Boolean(error)]),
    enabled: Boolean(error || (table && engine)),
    clearOnUnmount: useValue(blok.clearOnUnmount) === true,
    isEmpty: (data) => (data as { rows: unknown[] }).rows.length === 0,
    load: async () => {
      if (!table || !engine) throw error;
      requireColumns(table, [...(columns ?? []), ...(where ?? []).map((condition) => condition.column), orderBy]);
      const store = storeOf(table);
      const [rows, count] = await Promise.all([
        engine.readAcross([store], (urlOf) => rowsSql(urlOf(store.id), request)),
        engine.readAcross([store], (urlOf) => countSql(urlOf(store.id), where)),
      ]);
      return { rows, total: Number(count[0]?.n ?? 0) };
    },
  });

  return null;
});
