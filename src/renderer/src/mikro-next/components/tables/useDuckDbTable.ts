import type { SortingState } from "@tanstack/react-table";
import type * as duckdb from "@duckdb/duckdb-wasm";
import { useCallback, useEffect, useRef, useState } from "react";

import {
  ensureHttpfs,
  getDuckDb,
  resolveDuckDbEndpoint,
} from "@/mikro-next/lib/duckdb/duckdb";
// Re-exported for the existing consumers of this module's singletons
// (scene mesh collections, attribute lookup engine wiring).
export { ensureHttpfs, getDuckDb, resolveDuckDbEndpoint } from "@/mikro-next/lib/duckdb/duckdb";

import {
  useRequestParquetAccessMutation,
  useRequestGeneralParquetAccessMutation,
} from "@/mikro-next/api/graphql";
import { useDatalayerEndpoint } from "@/app/Arkitekt";
import { useDebounce } from "@/hooks/use-debounce";

// The minimal shape the DuckDB reader needs from a parquet-backed model: a
// ParquetStore id to request an access grant against, and the declared column
// names to build search/filter/export SQL. Both `Table` and `TableDataset`
// satisfy this, so the hook backs either.
export type DuckDbParquetSource = {
  store: { id: string };
  columns: { name: string }[];
};

type PaginationState = {
  pageIndex: number;
  pageSize: number;
};

type DuckDbTableState = {
  rows: Record<string, unknown>[];
  totalRowCount: number;
  loading: boolean;
  error: Error | null;
};

export type DuckDbColumnFilters = Record<string, string>;

export type DuckDbHistogramBucket = {
  value: string;
  count: number;
};

type DuckDbTableResult = DuckDbTableState & {
  loadColumnHistogram: (
    columnName: string,
    limit?: number,
  ) => Promise<DuckDbHistogramBucket[]>;
  exportAsCsv: (selectedColumns?: string[]) => Promise<string>;
};

type CachedGrant = {
  storeId: string;
  accessKey: string;
  secretKey: string;
  sessionToken: string;
  region: string;
  bucket: string;
  key: string;
  expiresAt: number;
};

// How long a keystroke in the global search sits before it reaches DuckDB.
// Every search is two full parquet scans (COUNT + page), so typing must not
// fan out into one pair per character.
const SEARCH_DEBOUNCE_MS = 200;

const escapeSqlIdentifier = (value: string) =>
  `"${value.replaceAll('"', '""')}"`;

const escapeSqlLiteral = (value: string) =>
  `'${value.replaceAll("'", "''")}'`;

const resolveParquetUrl = (grant: CachedGrant) =>
  `s3://${grant.bucket}/${grant.key}`;

// CORS gotcha (dev / any browser origin): DuckDB-WASM's httpfs cannot set the
// forbidden `Host`/`User-Agent` request headers, so it rewrites them to
// `X-Host-Override` / `X-user-agent` on every S3 range request it makes below.
// The browser then lists `x-host-override` in the preflight's
// `Access-Control-Request-Headers`, and the datalayer's S3/MinIO endpoint must
// echo it back in `Access-Control-Allow-Headers` (plus `Range`, `Authorization`,
// the `x-amz-*` signing headers, and GET/HEAD) or the read is blocked with
// "Request header field x-host-override is not allowed". Wildcarding
// `AllowedHeaders: ["*"]` on the bucket CORS is the standard fix. This only
// bites from an http(s) origin like the Vite dev server; the packaged Electron
// app does not enforce CORS the same way.
const buildCreateSecretQuery = (
  grant: CachedGrant,
  datalayerEndpoint?: string,
) => {
  const duckDbEndpoint = resolveDuckDbEndpoint(datalayerEndpoint);
  const secretOptions = [
    "TYPE s3",
    "PROVIDER config",
    `KEY_ID ${escapeSqlLiteral(grant.accessKey)}`,
    `SECRET ${escapeSqlLiteral(grant.secretKey)}`,
    `SESSION_TOKEN ${escapeSqlLiteral(grant.sessionToken)}`,
    `REGION ${escapeSqlLiteral(grant.region)}`,
  ];

  if (duckDbEndpoint) {
    secretOptions.push(`ENDPOINT ${escapeSqlLiteral(duckDbEndpoint.endpoint)}`);
    secretOptions.push(`URL_STYLE ${escapeSqlLiteral("path")}`);
    secretOptions.push(
      `USE_SSL ${escapeSqlLiteral(duckDbEndpoint.useSsl ? "true" : "false")}`,
    );
  }

  return [
    "CREATE OR REPLACE SECRET parquet_access (",
    secretOptions.join(",\n"),
    ")",
  ].join("\n");
};

const resolveHistogramValueExpression = (columnName: string) => {
  const identifier = escapeSqlIdentifier(columnName);
  return `COALESCE(TRY_CAST(${identifier} AS VARCHAR), '(null)')`;
};

const normalizeValue = (value: unknown): unknown => {
  if (typeof value === "bigint") {
    const asNumber = Number(value);
    return Number.isSafeInteger(asNumber) ? asNumber : value.toString();
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (Array.isArray(value)) {
    return value.map((entry) => normalizeValue(entry));
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, entry]) => [
        key,
        normalizeValue(entry),
      ]),
    );
  }

  return value;
};

const rowToRecord = (row: unknown): Record<string, unknown> => {
  if (
    row &&
    typeof row === "object" &&
    "toJSON" in row &&
    typeof row.toJSON === "function"
  ) {
    return normalizeValue(row.toJSON()) as Record<string, unknown>;
  }

  return normalizeValue((row ?? {}) as Record<string, unknown>) as Record<
    string,
    unknown
  >;
};

const buildSearchClause = (table: DuckDbParquetSource, search: string) => {
  const trimmedSearch = search.trim();
  if (!trimmedSearch) {
    return "";
  }

  const escapedSearch = escapeSqlLiteral(`%${trimmedSearch}%`);
  const searchableColumns = table.columns.map(
    (column) =>
      `TRY_CAST(${escapeSqlIdentifier(column.name)} AS VARCHAR) ILIKE ${escapedSearch}`,
  );

  return searchableColumns.length
    ? `WHERE (${searchableColumns.join(" OR ")})`
    : "";
};

const buildWhereClause = (
  table: DuckDbParquetSource,
  search: string,
  columnFilters: DuckDbColumnFilters,
) => {
  const predicates: string[] = [];
  const globalSearchClause = buildSearchClause(table, search);

  if (globalSearchClause) {
    predicates.push(globalSearchClause.replace(/^WHERE\s+/u, ""));
  }

  Object.entries(columnFilters).forEach(([columnName, rawValue]) => {
    const trimmedValue = rawValue.trim();
    if (!trimmedValue) {
      return;
    }

    predicates.push(
      `TRY_CAST(${escapeSqlIdentifier(columnName)} AS VARCHAR) ILIKE ${escapeSqlLiteral(`%${trimmedValue}%`)}`,
    );
  });

  return predicates.length ? `WHERE ${predicates.join(" AND ")}` : "";
};

const buildSortingClause = (sorting: SortingState) => {
  if (!sorting.length) {
    return "";
  }

  return `ORDER BY ${sorting
    .map(
      (entry) =>
        `${escapeSqlIdentifier(entry.id)} ${entry.desc ? "DESC" : "ASC"}`,
    )
    .join(", ")}`;
};

const buildCountQuery = (
  table: DuckDbParquetSource,
  parquetUrl: string,
  search: string,
  columnFilters: DuckDbColumnFilters,
) => {
  const fromClause = `FROM read_parquet(${escapeSqlLiteral(parquetUrl)})`;
  const whereClause = buildWhereClause(table, search, columnFilters);
  return `SELECT COUNT(*) AS total_row_count ${fromClause} ${whereClause}`;
};

const buildRowsQuery = (
  table: DuckDbParquetSource,
  parquetUrl: string,
  search: string,
  columnFilters: DuckDbColumnFilters,
  sorting: SortingState,
  pageIndex: number,
  pageSize: number,
) => {
  const fromClause = `FROM read_parquet(${escapeSqlLiteral(parquetUrl)})`;
  const whereClause = buildWhereClause(table, search, columnFilters);
  const sortingClause = buildSortingClause(sorting);
  const offset = pageIndex * pageSize;

  return [
    `SELECT * ${fromClause}`,
    whereClause,
    sortingClause,
    `LIMIT ${pageSize}`,
    `OFFSET ${offset}`,
  ]
    .filter(Boolean)
    .join(" ");
};

const buildExportQuery = (
  table: DuckDbParquetSource,
  parquetUrl: string,
  search: string,
  columnFilters: DuckDbColumnFilters,
  sorting: SortingState,
  selectedColumns?: string[],
) => {
  const fromClause = `FROM read_parquet(${escapeSqlLiteral(parquetUrl)})`;
  const whereClause = buildWhereClause(table, search, columnFilters);
  const sortingClause = buildSortingClause(sorting);
  const availableColumns = new Set(table.columns.map((column) => column.name));
  const exportColumns =
    selectedColumns?.filter((columnName) => availableColumns.has(columnName)) ??
    table.columns.map((column) => column.name);

  return [
    `SELECT ${exportColumns.map((columnName) => escapeSqlIdentifier(columnName)).join(", ")}`,
    fromClause,
    whereClause,
    sortingClause,
  ]
    .filter(Boolean)
    .join(" ");
};

const escapeCsvValue = (value: unknown) => {
  const normalized = normalizeValue(value);
  const text = normalized == null ? "" : String(normalized);

  if (
    text.includes(",") ||
    text.includes('"') ||
    text.includes("\n") ||
    text.includes("\r")
  ) {
    return `"${text.replaceAll('"', '""')}"`;
  }

  return text;
};

// Shared by the hook's own full-table export and by callers that already hold
// the rows they want to write (a selection kept in component state), so both
// paths quote and order cells identically.
export const rowsToCsv = (
  rows: Record<string, unknown>[],
  columns: string[],
) => {
  const headerRow = columns
    .map((columnName) => escapeCsvValue(columnName))
    .join(",");
  const csvRows = rows.map((row) =>
    columns.map((columnName) => escapeCsvValue(row[columnName])).join(","),
  );

  return [headerRow, ...csvRows].join("\n");
};

const buildHistogramQuery = (
  table: DuckDbParquetSource,
  parquetUrl: string,
  search: string,
  columnFilters: DuckDbColumnFilters,
  columnName: string,
  limit: number,
) => {
  const fromClause = `FROM read_parquet(${escapeSqlLiteral(parquetUrl)})`;
  const whereClause = buildWhereClause(table, search, columnFilters);
  const valueExpression = resolveHistogramValueExpression(columnName);

  return [
    `SELECT ${valueExpression} AS histogram_value, COUNT(*) AS histogram_count`,
    fromClause,
    whereClause,
    `GROUP BY ${valueExpression}`,
    "ORDER BY histogram_count DESC, histogram_value ASC",
    `LIMIT ${limit}`,
  ]
    .filter(Boolean)
    .join(" ");
};

// ---------------------------------------------------------------------------
// Pure load machinery — no React, no DuckDB import, so it is unit-testable
// against a mocked connection.
// ---------------------------------------------------------------------------

// Every load run takes a ticket; only the holder of the latest ticket may
// publish its result. A run that finds itself superseded (a newer search,
// page or sort arrived while it was scanning) must drop its result on the
// floor instead of racing the newer run for `setState`.
export class RunSequence {
  private latest = 0;

  begin(): number {
    this.latest += 1;
    return this.latest;
  }

  isCurrent(id: number): boolean {
    return id === this.latest;
  }
}

// The last COUNT(*) result, keyed on everything that can change it. The count
// SQL text already encodes the parquet url, the searchable columns, the
// search and the column filters — and nothing else — so it is the key: a
// page or sort change leaves it untouched and skips the full-table scan.
export type DuckDbCountCache = { key: string; total: number } | null;

export const resolveCountCacheKey = (
  table: DuckDbParquetSource,
  parquetUrl: string,
  search: string,
  columnFilters: DuckDbColumnFilters,
) => buildCountQuery(table, parquetUrl, search, columnFilters);

export type DuckDbBatch = { toArray(): unknown[] };

// The slice of `AsyncDuckDBConnection` the loader uses. Load queries go
// through `send()` rather than `query()` on purpose: `query()` is one blocking
// RUN_QUERY task inside the worker, which `cancelSent()` cannot reach, whereas
// `send()` polls the pending query one task at a time and a cancel message
// slips in between polls. That is what makes superseding a keystroke's scan
// actually stop the scan instead of merely ignoring its result.
export type DuckDbQuerySender = {
  send(text: string): Promise<AsyncIterable<DuckDbBatch>>;
};

const collectRows = async (sender: DuckDbQuerySender, sql: string) => {
  const reader = await sender.send(sql);
  const rows: Record<string, unknown>[] = [];

  // The reader must be drained fully before the next statement is sent on
  // the same connection; a half-read result would be clobbered by it.
  for await (const batch of reader) {
    for (const row of batch.toArray()) {
      rows.push(rowToRecord(row));
    }
  }

  return rows;
};

export type DuckDbTablePage = {
  rows: Record<string, unknown>[];
  totalRowCount: number;
  countCache: DuckDbCountCache;
};

// Loads one page for the table. Returns `null` when `isCurrent()` reports
// the run superseded between the count and the page query, so the caller
// never waits on a page it will not show.
export const loadDuckDbTablePage = async ({
  connection,
  parquetUrl,
  table,
  search,
  columnFilters,
  sorting,
  pagination,
  countCache,
  isCurrent = () => true,
}: {
  connection: DuckDbQuerySender;
  parquetUrl: string;
  table: DuckDbParquetSource;
  search: string;
  columnFilters: DuckDbColumnFilters;
  sorting: SortingState;
  pagination: PaginationState;
  countCache: DuckDbCountCache;
  isCurrent?: () => boolean;
}): Promise<DuckDbTablePage | null> => {
  const countKey = resolveCountCacheKey(table, parquetUrl, search, columnFilters);

  let totalRowCount: number;
  if (countCache && countCache.key === countKey) {
    totalRowCount = countCache.total;
  } else {
    const [countRow] = await collectRows(connection, countKey);
    totalRowCount = Number(countRow?.total_row_count ?? 0);
  }

  if (!isCurrent()) {
    return null;
  }

  const rows = await collectRows(
    connection,
    buildRowsQuery(
      table,
      parquetUrl,
      search,
      columnFilters,
      sorting,
      pagination.pageIndex,
      pagination.pageSize,
    ),
  );

  return {
    rows,
    totalRowCount,
    countCache: { key: countKey, total: totalRowCount },
  };
};

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

type LiveConnection = {
  connection: duckdb.AsyncDuckDBConnection;
  // What the connection was set up for; a different grant or endpoint means
  // the secret it carries is wrong and it must be rebuilt.
  identity: string;
  parquetUrl: string;
};

const resolveConnectionIdentity = (
  grant: CachedGrant,
  datalayerEndpoint?: string,
) =>
  [
    grant.bucket,
    grant.key,
    grant.accessKey,
    grant.sessionToken,
    datalayerEndpoint ?? "",
  ].join("|");

const closeQuietly = (connection: duckdb.AsyncDuckDBConnection) =>
  connection.close().catch(() => undefined);

export const useDuckDbTable = ({
  table,
  pagination,
  sorting,
  search,
  columnFilters,
}: {
  table: DuckDbParquetSource;
  pagination: PaginationState;
  sorting: SortingState;
  search: string;
  columnFilters: DuckDbColumnFilters;
}): DuckDbTableResult => {
  const [requestParquetAccess] = useRequestParquetAccessMutation();
  const [requestGeneralParquetAccess] = useRequestGeneralParquetAccessMutation();
  const grantRef = useRef<CachedGrant | null>(null);
  const [state, setState] = useState<DuckDbTableState>({
    rows: [],
    totalRowCount: 0,
    loading: true,
    error: null,
  });
  const datalayer = useDatalayerEndpoint();

  // The input stays bound to the raw `search`; DuckDB only sees it once the
  // user pauses.
  const debouncedSearch = useDebounce(search, SEARCH_DEBOUNCE_MS);

  // One connection for the hook's lifetime. httpfs + the S3 secret are set up
  // once per grant instead of once per query, and the connection is rebuilt
  // only when the grant (or datalayer endpoint) it was built for changes.
  const liveRef = useRef<LiveConnection | null>(null);
  const openingRef = useRef<Promise<LiveConnection> | null>(null);
  const disposedRef = useRef(false);
  // A single DuckDB connection is a single statement stream: everything that
  // touches it (page loads, histograms, exports) is chained here so two
  // results can never interleave.
  const queueRef = useRef<Promise<unknown>>(Promise.resolve());
  const [runs] = useState(() => new RunSequence());
  const loadInFlightRef = useRef(false);
  const countCacheRef = useRef<DuckDbCountCache>(null);

  const ensureGrant = useCallback(async () => {
    const cachedGrant = grantRef.current;
    if (
      cachedGrant &&
      cachedGrant.storeId === table.store.id &&
      cachedGrant.expiresAt > Date.now() + 30_000
    ) {
      return cachedGrant;
    }

    const [parquetResponse, generalResponse] = await Promise.all([
      requestParquetAccess({
        variables: { input: { storeId: table.store.id } },
      }),
      requestGeneralParquetAccess({
        variables: { input: {} },
      }),
    ]);
    const parquetGrant = parquetResponse.data?.requestParquetAccess;
    const generalGrant = generalResponse.data?.requestGeneralParquetAccess;

    if (!parquetGrant) {
      throw new Error("Failed to request parquet access");
    }

    if (!generalGrant) {
      throw new Error("Failed to request general parquet access");
    }

    const resolvedGrant: CachedGrant = {
      storeId: table.store.id,
      accessKey: parquetGrant.accessKey,
      secretKey: parquetGrant.secretKey,
      sessionToken: parquetGrant.sessionToken,
      region: generalGrant.region,
      bucket: parquetGrant.bucket,
      key: parquetGrant.key,
      expiresAt: Date.now() + parquetGrant.expiresIn * 1000,
    };

    grantRef.current = resolvedGrant;
    return resolvedGrant;
  }, [requestGeneralParquetAccess, requestParquetAccess, table.store.id]);

  const acquireConnection = useCallback(async (): Promise<LiveConnection> => {
    const grant = await ensureGrant();
    const identity = resolveConnectionIdentity(grant, datalayer);

    const live = liveRef.current;
    if (live && live.identity === identity) {
      return live;
    }

    const opening = openingRef.current;
    if (opening) {
      const opened = await opening.catch(() => null);
      if (opened && opened.identity === identity) {
        return opened;
      }
    }

    const nextOpening = (async () => {
      const stale = liveRef.current;
      liveRef.current = null;
      if (stale) {
        await closeQuietly(stale.connection);
      }

      const db = await getDuckDb();
      const connection = await db.connect();
      try {
        await ensureHttpfs(connection);
        await connection.query(buildCreateSecretQuery(grant, datalayer));
      } catch (error) {
        await closeQuietly(connection);
        throw error;
      }

      if (disposedRef.current) {
        await closeQuietly(connection);
        throw new Error("DuckDB table unmounted while connecting");
      }

      const next: LiveConnection = {
        connection,
        identity,
        parquetUrl: resolveParquetUrl(grant),
      };
      liveRef.current = next;
      return next;
    })();

    openingRef.current = nextOpening;
    try {
      return await nextOpening;
    } finally {
      if (openingRef.current === nextOpening) {
        openingRef.current = null;
      }
    }
  }, [datalayer, ensureGrant]);

  const enqueue = useCallback(<T,>(task: () => Promise<T>): Promise<T> => {
    const next = queueRef.current.catch(() => undefined).then(task);
    queueRef.current = next;
    return next;
  }, []);

  useEffect(() => {
    disposedRef.current = false;

    return () => {
      disposedRef.current = true;
      const live = liveRef.current;
      liveRef.current = null;
      if (!live) {
        return;
      }

      // Abort whatever is scanning, then close once the queue has drained so
      // no task is left holding a closed connection.
      void live.connection.cancelSent().catch(() => undefined);
      void queueRef.current
        .catch(() => undefined)
        .then(() => closeQuietly(live.connection));
    };
  }, []);

  const loadColumnHistogram = useCallback(
    async (columnName: string, limit = 8) => {
      const histogramRows = await enqueue(async () => {
        const { connection, parquetUrl } = await acquireConnection();
        const result = await connection.query(
          buildHistogramQuery(
            table,
            parquetUrl,
            debouncedSearch,
            columnFilters,
            columnName,
            limit,
          ),
        );

        return result.toArray().map((row) => rowToRecord(row));
      });

      return histogramRows.map((row) => ({
        value: String(row.histogram_value ?? "(null)"),
        count: Number(row.histogram_count ?? 0),
      }));
    },
    [acquireConnection, columnFilters, debouncedSearch, enqueue, table],
  );

  const exportAsCsv = useCallback(
    async (selectedColumns?: string[]) => {
      const exportRows = await enqueue(async () => {
        const { connection, parquetUrl } = await acquireConnection();
        const result = await connection.query(
          buildExportQuery(
            table,
            parquetUrl,
            debouncedSearch,
            columnFilters,
            sorting,
            selectedColumns,
          ),
        );

        return result.toArray().map((row) => rowToRecord(row));
      });

      const availableColumns = new Set(table.columns.map((column) => column.name));
      const exportColumns =
        selectedColumns?.filter((columnName) => availableColumns.has(columnName)) ??
        table.columns.map((column) => column.name);

      return rowsToCsv(exportRows, exportColumns);
    },
    [acquireConnection, columnFilters, debouncedSearch, enqueue, sorting, table],
  );

  useEffect(() => {
    const runId = runs.begin();

    const load = async () => {
      setState((current) => ({ ...current, loading: true, error: null }));

      // A superseded run may be mid-scan on the shared connection. Ask DuckDB
      // to abandon it so the queue reaches this run without waiting for a
      // result nobody will show.
      if (loadInFlightRef.current && liveRef.current) {
        await liveRef.current.connection.cancelSent().catch(() => undefined);
      }

      try {
        const page = await enqueue(async () => {
          if (!runs.isCurrent(runId)) {
            return null;
          }

          const { connection, parquetUrl } = await acquireConnection();
          if (!runs.isCurrent(runId)) {
            return null;
          }

          loadInFlightRef.current = true;
          try {
            return await loadDuckDbTablePage({
              connection,
              parquetUrl,
              table,
              search: debouncedSearch,
              columnFilters,
              sorting,
              pagination,
              countCache: countCacheRef.current,
              isCurrent: () => runs.isCurrent(runId),
            });
          } finally {
            loadInFlightRef.current = false;
          }
        });

        if (page === null || !runs.isCurrent(runId)) {
          return;
        }

        countCacheRef.current = page.countCache;
        setState({
          rows: page.rows,
          totalRowCount: page.totalRowCount,
          loading: false,
          error: null,
        });
      } catch (error) {
        if (!runs.isCurrent(runId)) {
          return;
        }

        setState({
          rows: [],
          totalRowCount: 0,
          loading: false,
          error: error instanceof Error ? error : new Error(String(error)),
        });
      }
    };

    void load();
  }, [
    acquireConnection,
    columnFilters,
    debouncedSearch,
    enqueue,
    pagination.pageIndex,
    pagination.pageSize,
    runs,
    sorting,
    table,
  ]);

  return {
    ...state,
    exportAsCsv,
    loadColumnHistogram,
  };
};
