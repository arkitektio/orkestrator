import { LruMap } from "@/lib/generic/lruMap";
import { bindSqlLiteral, escapeSqlLiteral, type BindParam } from "./sqlBind";

/**
 * The shared DuckDB-WASM parquet engine: one connection, one query chain, one
 * grant and one SCOPED secret per store, and the two generic reads —
 * `readAcross` (rows) and `readColumnsTyped` (columns) — over any set of stores.
 *
 * Promoted out of mikro's `AttributeLookupEngine`, which now EXTENDS it with the
 * attribute-plan reads (`lookup`, `peek`, `warm`, `followReference`). Elektro
 * uses it directly for event tables and unit tables. Everything that made the
 * mikro engine right for its hover loop is here, unchanged:
 *
 *  - ONE persistent connection (prepared statements are connection-scoped,
 *    and DuckDB caches parquet footers per connection, so revisiting a table
 *    is range reads only);
 *  - per-store NAMED + SCOPED secrets (`attr_store_<id>`), so concurrent
 *    consumers never clobber each other. Grant/region round-trips run OFF the
 *    query chain; only the `CREATE SECRET` SQL is serialized, and a grant is
 *    recorded as installed only after that SQL succeeds;
 *  - a prepared-statement LRU with a runtime-probed fallback to escaped-literal
 *    SQL for builds that cannot prepare `read_parquet(?)`;
 *  - a result LRU for keyed reads, and all queries serialized on one chain.
 *
 * Dependency-injected (no imports from React, Apollo, or duckdb-wasm): who
 * grants a store is the caller's business — mikro's parquet grant, elektro's.
 * Store ids must therefore be unique ACROSS services sharing one engine; each
 * service builds its own.
 */

/** A row, normalized: bigints narrowed where safe, dates as ISO strings. */
export type ParquetRow = Record<string, unknown>;

/** What a read needs of a store: its id (the grant and secret key). */
export type ParquetStoreRef = {
  id: string;
  /**
   * Bytes the store holds, measured when its upload FINISHED; null while
   * unfinished or unknown. Only sharpens error messages — optional.
   */
  sizeBytes?: number | null;
};

/**
 * What this engine needs of a query result.
 *
 * `toArray()` is the ROW view — one JS object per row — and is what every
 * caller here has always wanted, because they read tens of rows for a hover or
 * a rule editor.
 *
 * `getChild()` is the COLUMNAR view, and it is the whole of why this type grew.
 * DuckDB-WASM answers with an Arrow table; `toArray()` destroys it, at roughly
 * seven allocations per row (an Arrow proxy, a `toJSON` object, an
 * `Object.entries` array and its pairs, a mapped array, a rebuilt object). That
 * is the right trade for tens of rows and ruinous for millions: a point layer
 * reading two coordinate columns over 5.5 M rows would allocate ~77 M objects
 * and gigabytes of transient garbage before a single vertex existed.
 * `getChild(name).toArray()` hands back a `Float64Array` view over the Arrow
 * buffer instead — one allocation, no boxing.
 *
 * Optional, because the type is also satisfied by test doubles and by anything
 * that only ever wanted rows.
 *
 * A child's `toArray()` is a typed array for a numeric column and a plain array
 * of strings for a Utf8 one, which is why the element type is not pinned to
 * `number`: a categorical column is read columnwise too, and claiming otherwise
 * would only move the lie into a cast.
 */
export type QueryResultLike = {
  toArray: () => unknown[];
  getChild?: (name: string) => { toArray: () => ArrayLike<number> | ArrayLike<string> } | null;
  numRows?: number;
};

export type PreparedStatementLike = {
  query: (...params: unknown[]) => Promise<QueryResultLike>;
  close: () => Promise<void>;
};

export type DuckConnectionLike = {
  query: (sql: string) => Promise<QueryResultLike>;
  prepare: (sql: string) => Promise<PreparedStatementLike>;
  close: () => Promise<void>;
};

export type ParquetGrantLike = {
  accessKey: string;
  secretKey: string;
  sessionToken: string;
  bucket: string;
  key: string;
  expiresIn: number;
};

export type ParquetEngineDeps = {
  /** Open a connection on the shared DuckDB with httpfs already loaded. */
  connect: () => Promise<DuckConnectionLike>;
  requestGrant: (storeId: string) => Promise<ParquetGrantLike>;
  requestRegion: () => Promise<string>;
  /** Datalayer S3 endpoint (resolveDuckDbEndpoint shape); null = AWS default. */
  endpoint?: { endpoint: string; useSsl: boolean } | null;
  /** Secret-name prefix, unique per service (see `secretName`). Mikro's is the default. */
  secretPrefix?: string;
};

export const RESULT_LRU_SIZE = 256;
export const STATEMENT_LRU_SIZE = 32;
export const GRANT_EXPIRY_SKEW_MS = 60_000;

/**
 * The secret's name. DuckDB secrets are global to the DATABASE, not the
 * connection, and the database is one singleton shared by every service — so
 * the name carries a per-service prefix, or elektro's store 5 would replace
 * mikro's store 5's secret (a different scope) and break its reads silently.
 */
export const secretName = (storeId: string, prefix = "attr_store_") =>
  `${prefix}${storeId.replaceAll(/[^a-zA-Z0-9_]/g, "_")}`;

/**
 * The queried URL comes from the GRANT, never from the store's declared
 * bucket/key: the secret is scoped to the grant's `s3://bucket/key`, and a
 * URL built from anything else can silently miss that scope — DuckDB then
 * falls back to its default AWS endpoint (the classic
 * `https://<bucket>.s3.amazonaws.com` CORS failure). One source, no mismatch.
 */
export const grantUrl = (grant: ParquetGrantLike) => `s3://${grant.bucket}/${grant.key}`;

/** Unambiguous result-LRU key: strings are quoted so values never collide. */
export const resultKey = (statementKey: string, keyValues: readonly BindParam[]): string =>
  `${statementKey}|${keyValues
    .map((value) => (typeof value === "string" ? JSON.stringify(value) : String(value)))
    .join(",")}`;

const normalizeValue = (value: unknown): unknown => {
  if (typeof value === "bigint") {
    const asNumber = Number(value);
    return Number.isSafeInteger(asNumber) ? asNumber : value.toString();
  }
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map((entry) => normalizeValue(entry));
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

export const rowToRecord = (row: unknown): ParquetRow => {
  if (
    row &&
    typeof row === "object" &&
    "toJSON" in row &&
    typeof (row as { toJSON: unknown }).toJSON === "function"
  ) {
    return normalizeValue((row as { toJSON: () => unknown }).toJSON()) as ParquetRow;
  }
  return normalizeValue((row ?? {}) as Record<string, unknown>) as ParquetRow;
};

export type StoredGrant = ParquetGrantLike & { expiresAt: number };

export type StatementEntry = {
  statement: PreparedStatementLike;
  /** A query has succeeded on it — later failures are real, not capability gaps. */
  proven: boolean;
};

export class ParquetQueryEngine {
  protected connectionPromise: Promise<DuckConnectionLike> | null = null;
  protected chain: Promise<unknown> = Promise.resolve();
  protected regionPromise: Promise<string> | null = null;
  protected region: string | null = null;
  /** Store id → freshest settled grant (network result, chain-free). */
  protected grants = new Map<string, StoredGrant>();
  /** Store id → inflight grant fetch, so concurrent misses share one request. */
  protected grantFetches = new Map<string, Promise<StoredGrant>>();
  /** Store id → the grant whose scoped secret is INSTALLED on the connection. */
  protected installedSecrets = new Map<string, StoredGrant>();
  protected statements = new LruMap<StatementEntry>(STATEMENT_LRU_SIZE, (entry) => {
    void entry.statement.close().catch(() => undefined);
  });
  protected results = new LruMap<readonly ParquetRow[]>(RESULT_LRU_SIZE);
  protected inflight = new Map<string, Promise<readonly ParquetRow[] | null>>();
  /** Flipped when this build cannot prepare the plan SQL; probed at runtime. */
  protected preferLiteral = false;
  protected disposed = false;

  constructor(protected readonly deps: ParquetEngineDeps) {}

  /**
   * Run one ad-hoc read across an arbitrary set of parquet stores.
   *
   * The plan path above answers "what is under this point?" for one store with
   * a prepared, cached statement. This answers the other question a client
   * asks of the same parquet — what values does this COLUMN hold — which is
   * neither per-point nor cacheable by key tuple, and which spans more than
   * one store the moment a `colorBy` reaches its column through a `references`
   * hop. Both share the expensive parts: one connection, one region, one grant
   * per store, and a SCOPED secret per store rather than a single overwritten
   * `parquet_access` (which is exactly why the tables UI's reader cannot serve
   * a joined read).
   *
   * `buildSql` receives the grant URL of each store by id. It must take the URL
   * from HERE and not from the store's declared bucket/key: the secret is
   * scoped to the grant's own `s3://bucket/key`, and a URL built from anything
   * else falls outside that scope and silently reaches for DuckDB's default AWS
   * endpoint.
   *
   * Unbatched and uncached on purpose — callers here are user-initiated
   * (opening a rule editor, rebuilding a colour LUT), not a hover hot path.
   */
  async readAcross(
    stores: readonly ParquetStoreRef[],
    buildSql: (urlOf: (storeId: string) => string) => string,
  ): Promise<readonly ParquetRow[]> {
    if (this.disposed) return [];
    // Distinct stores only: a joined read routinely names the same store twice
    // (a self-referencing table), and installing its secret twice is waste.
    const distinct = new Map(stores.map((store) => [store.id, store]));
    // Off the chain, so the token round trips overlap each other and whatever
    // DuckDB work is queued ahead of this read.
    const grantsReady = new Map(
      [...distinct.values()].map((store) => {
        const pending = this.grantFor(store);
        pending.catch(() => undefined); // observed again inside the task
        return [store.id, pending] as const;
      }),
    );

    return this.enqueue(async () => {
      if (this.disposed) return [];
      const connection = await this.ensureConnection();
      const urls = new Map<string, string>();
      for (const [storeId, store] of distinct) {
        const grant = await grantsReady.get(storeId)!;
        await this.installSecret(connection, store, grant);
        urls.set(storeId, grantUrl(grant));
      }
      if (this.disposed) return [];
      const sql = buildSql((storeId) => {
        const url = urls.get(storeId);
        if (!url) {
          throw new Error(
            `readAcross was not given the store ${storeId} its SQL reads from`,
          );
        }
        return url;
      });
      const result = await connection.query(sql);
      return result.toArray().map((row) => rowToRecord(row));
    });
  }

  /**
   * The same read, kept COLUMNAR.
   *
   * A sibling of `readAcross` rather than a replacement: the row shape is what
   * a hover and a rule editor want, and rewriting them to walk typed arrays
   * would be worse code for no gain at the sizes they read. This is for the
   * one caller that reads a whole column — coordinates for a point layer —
   * where the row shape is the cost. See `QueryResultLike`.
   *
   * Every named column comes back as an array of the same length, in the
   * order DuckDB produced them, so `x[i]` and `y[i]` belong to the same row
   * without anything having to pair them up.
   *
   * `castBigIntToDouble` is already set on the connection, so an int64 id
   * column arrives as a `Float64Array` and needs no conversion here. A Utf8
   * column arrives as a plain array of strings — still one allocation for the
   * column rather than one object per row, which is the point.
   */
  async readColumnsTyped(
    stores: readonly ParquetStoreRef[],
    buildSql: (urlOf: (storeId: string) => string) => string,
    columns: readonly string[],
  ): Promise<Record<string, ArrayLike<number> | ArrayLike<string>> | null> {
    if (this.disposed) return null;
    const distinct = new Map(stores.map((store) => [store.id, store]));
    const grantsReady = new Map(
      [...distinct.values()].map((store) => {
        const pending = this.grantFor(store);
        pending.catch(() => undefined);
        return [store.id, pending] as const;
      }),
    );

    return this.enqueue(async () => {
      if (this.disposed) return null;
      const connection = await this.ensureConnection();
      const urls = new Map<string, string>();
      for (const [storeId, store] of distinct) {
        const grant = await grantsReady.get(storeId)!;
        await this.installSecret(connection, store, grant);
        urls.set(storeId, grantUrl(grant));
      }
      if (this.disposed) return null;
      const sql = buildSql((storeId) => {
        const url = urls.get(storeId);
        if (!url) {
          throw new Error(`readColumnsTyped was not given the store ${storeId} its SQL reads from`);
        }
        return url;
      });
      const result = await connection.query(sql);
      if (!result.getChild) {
        // A result that cannot answer columnwise. Null rather than silently
        // falling back to the row path, whose cost is the reason this exists.
        return null;
      }
      const out: Record<string, ArrayLike<number> | ArrayLike<string>> = {};
      for (const name of columns) {
        const child = result.getChild(name);
        if (!child) return null;
        out[name] = child.toArray();
      }
      return out;
    });
  }

  dispose(): void {
    this.disposed = true;
    const statements = this.statements.drain();
    this.results.drain();
    this.inflight.clear();
    this.grants.clear();
    this.grantFetches.clear();
    this.installedSecrets.clear();
    const connection = this.connectionPromise;
    this.connectionPromise = null;
    void this.chain
      .catch(() => undefined)
      .then(async () => {
        for (const entry of statements) {
          await entry.statement.close().catch(() => undefined);
        }
        if (connection) {
          await connection.then((c) => c.close()).catch(() => undefined);
        }
      });
  }

  // ---- internals ----------------------------------------------------------

  protected cachedQuery(
    statementKey: string,
    sql: string,
    keyValues: readonly BindParam[],
    store: ParquetStoreRef,
    isStale: () => boolean,
    /** Run as escaped-literal SQL regardless of the prepare probe. */
    literal: boolean,
  ): Promise<readonly ParquetRow[] | null> {
    const cacheKey = resultKey(statementKey, keyValues);
    const cached = this.results.get(cacheKey);
    if (cached !== undefined) return Promise.resolve(cached);
    const running = this.inflight.get(cacheKey);
    if (running !== undefined) return running;

    // Kick the grant fetch NOW, off the chain: the token round-trip overlaps
    // whatever queued DuckDB work precedes this query instead of stalling it.
    const grantReady = this.grantFor(store);
    grantReady.catch(() => undefined); // observed again inside the task

    const task = this.enqueue(async () => {
      if (this.disposed || isStale()) return null;
      const again = this.results.get(cacheKey);
      if (again !== undefined) return again;
      const connection = await this.ensureConnection();
      const grant = await grantReady;
      await this.installSecret(connection, store, grant);
      // The connection/secret legs can await network; a request superseded
      // meanwhile must still never issue SQL.
      if (this.disposed || isStale()) return null;
      const params: BindParam[] = [grantUrl(grant), ...keyValues];
      const rows = await this.runQuery(connection, statementKey, sql, params, literal);
      this.results.set(cacheKey, rows);
      return rows;
    }).finally(() => {
      this.inflight.delete(cacheKey);
    });
    this.inflight.set(cacheKey, task);
    return task;
  }

  /** Serialize DuckDB work; a failed task never breaks the chain. */
  protected enqueue<T>(task: () => Promise<T>): Promise<T> {
    const result = this.chain.then(task, task);
    this.chain = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  }

  protected ensureConnection(): Promise<DuckConnectionLike> {
    if (!this.connectionPromise) {
      this.connectionPromise = this.deps.connect().catch((error) => {
        this.connectionPromise = null;
        throw error;
      });
    }
    return this.connectionPromise as Promise<DuckConnectionLike>;
  }

  /**
   * The store's access grant — network only, deduped, never on the query
   * chain. Region and grant are requested in PARALLEL (the region is the
   * same for every store and memoized after the first resolve). A grant
   * within the expiry skew of running out is refetched.
   */
  protected grantFor(store: ParquetStoreRef): Promise<StoredGrant> {
    const cached = this.grants.get(store.id);
    if (cached && cached.expiresAt > Date.now() + GRANT_EXPIRY_SKEW_MS) {
      return Promise.resolve(cached);
    }
    let fetching = this.grantFetches.get(store.id);
    if (!fetching) {
      this.regionPromise ??= this.deps
        .requestRegion()
        .then((region) => {
          this.region = region;
          return region;
        })
        .catch((error) => {
          this.regionPromise = null; // do not cache failures
          throw error;
        });
      fetching = Promise.all([this.deps.requestGrant(store.id), this.regionPromise])
        .then(([grant]) => {
          const stored: StoredGrant = {
            ...grant,
            expiresAt: Date.now() + grant.expiresIn * 1000,
          };
          this.grants.set(store.id, stored);
          return stored;
        })
        .finally(() => {
          this.grantFetches.delete(store.id);
        });
      this.grantFetches.set(store.id, fetching);
    }
    return fetching;
  }

  /**
   * Install the store's scoped secret for `grant` unless that exact grant is
   * already the one on the connection. SQL only — runs inside the chain; the
   * network half happened in `grantFor`. Recorded as installed only AFTER
   * the CREATE succeeds, so a failed CREATE never leaves an hour-long
   * "secret exists" illusion behind.
   */
  protected async installSecret(
    connection: DuckConnectionLike,
    store: ParquetStoreRef,
    grant: StoredGrant,
  ): Promise<void> {
    if (this.installedSecrets.get(store.id) === grant) return;
    const options = [
      "TYPE s3",
      "PROVIDER config",
      `KEY_ID ${escapeSqlLiteral(grant.accessKey)}`,
      `SECRET ${escapeSqlLiteral(grant.secretKey)}`,
      `SESSION_TOKEN ${escapeSqlLiteral(grant.sessionToken)}`,
      `REGION ${escapeSqlLiteral(this.region ?? "us-east-1")}`,
      `SCOPE ${escapeSqlLiteral(grantUrl(grant))}`,
    ];
    const endpoint = this.deps.endpoint;
    if (endpoint) {
      options.push(`ENDPOINT ${escapeSqlLiteral(endpoint.endpoint)}`);
      options.push(`URL_STYLE ${escapeSqlLiteral("path")}`);
      options.push(`USE_SSL ${escapeSqlLiteral(endpoint.useSsl ? "true" : "false")}`);
    }
    await connection.query(
      `CREATE OR REPLACE SECRET "${secretName(store.id, this.deps.secretPrefix)}" (${options.join(", ")})`,
    );
    this.installedSecrets.set(store.id, grant);
  }

  protected async runQuery(
    connection: DuckConnectionLike,
    statementKey: string,
    sql: string,
    params: readonly BindParam[],
    literal = false,
  ): Promise<readonly ParquetRow[]> {
    if (!this.preferLiteral && !literal) {
      let entry: StatementEntry | null = null;
      try {
        entry = await this.ensureStatement(connection, statementKey, sql);
      } catch {
        // This build cannot prepare the SQL (`read_parquet(?)` unsupported):
        // a capability gap, fall through to literal.
      }
      if (entry) {
        try {
          const result = await entry.statement.query(...params);
          entry.proven = true;
          return result.toArray().map((row) => rowToRecord(row));
        } catch (error) {
          this.statements.take(statementKey);
          // A statement that has answered before failing now is a REAL error
          // (network, credentials) and must surface — only a first-use
          // failure (bigint binding, placeholder support) means the build
          // cannot prepare, which the literal fallback below probes.
          if (entry.proven) throw error;
        }
      }
    }
    const result = await connection.query(bindSqlLiteral(sql, params));
    // A deliberate literal run says nothing about what the build can prepare.
    if (!literal) this.preferLiteral = true;
    return result.toArray().map((row) => rowToRecord(row));
  }

  protected async ensureStatement(
    connection: DuckConnectionLike,
    statementKey: string,
    sql: string,
  ): Promise<StatementEntry> {
    const cached = this.statements.get(statementKey);
    if (cached) return cached;
    const entry: StatementEntry = {
      statement: await connection.prepare(sql),
      proven: false,
    };
    this.statements.set(statementKey, entry);
    return entry;
  }

}
