import type {
  AttributeColumnLike,
  AttributePlanLike,
  AttributeRow,
  ParquetStoreLike,
  TableHopLike,
} from "./attributeTypes";
import { hopKey } from "./attributeTypes";
import { LruMap } from "./lruMap";
import type { BindParam, HeldMap, HeldValue } from "./planExec";
import { buildKeyValues } from "./planExec";
import { tableHopSql } from "./planSql";
import { bindSqlLiteral, escapeSqlIdentifier, escapeSqlLiteral } from "./sqlBind";

/**
 * The DuckDB half of attribute-plan execution. Owns exactly what
 * `MeshParquetSource` owns for meshes — grants, scoped secrets, SQL, row
 * normalization — tuned for the hover loop:
 *
 *  - ONE persistent connection (prepared statements are connection-scoped,
 *    and DuckDB caches parquet footers per connection, so revisiting a table
 *    is range reads only);
 *  - per-store NAMED + SCOPED secrets (`attr_store_<id>`), so concurrent
 *    consumers and the table UI's global secret never clobber each other.
 *    Grant/region round-trips run OFF the query chain (network overlaps
 *    queued DuckDB work); only the `CREATE SECRET` SQL is serialized, and a
 *    grant is recorded as installed only after that SQL succeeds;
 *  - the statement is DERIVED from the hop (`planSql.ts`) — a plan carries
 *    `keyColumns` and `attributes`, never SQL — with the user's projection
 *    folded in, so a narrowed hop reads only its column chunks;
 *  - a prepared-statement LRU keyed by hop identity (plus projection), with a
 *    runtime-probed fallback to escaped-literal SQL for builds that cannot
 *    prepare `read_parquet(?)`. A statement that has answered before is
 *    PROVEN: its later failures are real errors and surface as such — only a
 *    first-use failure downgrades the build to literal SQL. A MANY binding
 *    (an `IN` list whose length is part of the statement) is always run as
 *    literal SQL rather than churning the statement LRU;
 *  - a result LRU keyed `(hop identity, projection, key tuple)` — hovering
 *    anywhere inside one object hits it without touching DuckDB. Parquet
 *    contents changing deliberately does NOT invalidate (per the plan
 *    contract; a version-bumped edge changes the key instead);
 *  - all queries serialized on an internal chain, with staleness checks both
 *    before and after the connection/secret legs so a superseded hover never
 *    issues SQL;
 *  - `warm(plan)` pre-pays a plan's fixed costs (connection, secret,
 *    prepared statement) without querying, so the first hover pays only the
 *    row read.
 *
 * Dependency-injected (no imports from React, Apollo, or duckdb-wasm) so unit
 * tests drive it with a fake connection.
 */

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

export type LookupOptions = {
  /** Attribute names to select (a projection); null/empty = every declared one. */
  columns?: readonly string[] | null;
};

export type LookupEngineDeps = {
  /** Open a connection on the shared DuckDB with httpfs already loaded. */
  connect: () => Promise<DuckConnectionLike>;
  requestGrant: (storeId: string) => Promise<ParquetGrantLike>;
  requestRegion: () => Promise<string>;
  /** Datalayer S3 endpoint (resolveDuckDbEndpoint shape); null = AWS default. */
  endpoint?: { endpoint: string; useSsl: boolean } | null;
};

const RESULT_LRU_SIZE = 256;
const STATEMENT_LRU_SIZE = 32;
const GRANT_EXPIRY_SKEW_MS = 60_000;

const secretName = (storeId: string) =>
  `attr_store_${storeId.replaceAll(/[^a-zA-Z0-9_]/g, "_")}`;

/**
 * The queried URL comes from the GRANT, never from the store's declared
 * bucket/key: the secret is scoped to the grant's `s3://bucket/key`, and a
 * URL built from anything else can silently miss that scope — DuckDB then
 * falls back to its default AWS endpoint (the classic
 * `https://<bucket>.s3.amazonaws.com` CORS failure). One source, no mismatch.
 */
const grantUrl = (grant: ParquetGrantLike) => `s3://${grant.bucket}/${grant.key}`;

/** Unambiguous result-LRU key: strings are quoted so values never collide. */
const resultKey = (statementKey: string, keyValues: readonly BindParam[]): string =>
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

const rowToRecord = (row: unknown): AttributeRow => {
  if (
    row &&
    typeof row === "object" &&
    "toJSON" in row &&
    typeof (row as { toJSON: unknown }).toJSON === "function"
  ) {
    return normalizeValue((row as { toJSON: () => unknown }).toJSON()) as AttributeRow;
  }
  return normalizeValue((row ?? {}) as Record<string, unknown>) as AttributeRow;
};

type StoredGrant = ParquetGrantLike & { expiresAt: number };

type StatementEntry = {
  statement: PreparedStatementLike;
  /** A query has succeeded on it — later failures are real, not capability gaps. */
  proven: boolean;
};

export class AttributeLookupEngine {
  private connectionPromise: Promise<DuckConnectionLike> | null = null;
  private chain: Promise<unknown> = Promise.resolve();
  private regionPromise: Promise<string> | null = null;
  private region: string | null = null;
  /** Store id → freshest settled grant (network result, chain-free). */
  private grants = new Map<string, StoredGrant>();
  /** Store id → inflight grant fetch, so concurrent misses share one request. */
  private grantFetches = new Map<string, Promise<StoredGrant>>();
  /** Store id → the grant whose scoped secret is INSTALLED on the connection. */
  private installedSecrets = new Map<string, StoredGrant>();
  private statements = new LruMap<StatementEntry>(STATEMENT_LRU_SIZE, (entry) => {
    void entry.statement.close().catch(() => undefined);
  });
  private results = new LruMap<readonly AttributeRow[]>(RESULT_LRU_SIZE);
  private inflight = new Map<string, Promise<readonly AttributeRow[] | null>>();
  /** Flipped when this build cannot prepare the plan SQL; probed at runtime. */
  private preferLiteral = false;
  private disposed = false;

  constructor(private readonly deps: LookupEngineDeps) {}

  /**
   * Run one TABLE hop's lookup for the held values. Returns the normalized
   * rows (plural — 0..n is the contract), or null when `isStale` cut it
   * short. Throws when a key axis is missing from `held` (a contract
   * violation the caller surfaces as unreachable, never queries around).
   *
   * `columns` narrows the select list to a subset of the hop's declared
   * attributes (the user's projection); unknown names are dropped, and an
   * empty or complete set means the declared list.
   */
  lookup(
    plan: AttributePlanLike,
    hop: TableHopLike,
    held: HeldMap,
    isStale: () => boolean = () => false,
    options: LookupOptions = {},
  ): Promise<readonly AttributeRow[] | null> {
    const bound = buildKeyValues(hop, held);
    if (bound === null) {
      return Promise.reject(
        new Error("held values do not cover the hop's key columns"),
      );
    }
    const statement = tableHopSql(hop, { columns: options.columns, many: bound.many });
    const statementKey = `${hopKey(plan, hop)}${statement.shapeKey}`;
    return this.cachedQuery(
      statementKey,
      statement.sql,
      bound.params,
      hop.lookup.store,
      isStale,
      // An `IN` list's length is part of the statement: preparing one per
      // distinct count would churn the statement LRU for nothing.
      bound.many !== null,
    );
  }

  /**
   * Synchronous result-LRU lookup: the rows for `(hop, held)` if this
   * session already ran that lookup — no connection, no query, no promise.
   * Powers the tracker's instant repeat-hover path (re-hovering an object
   * whose key tuple was already answered must not wait out the debounce).
   * Null on a miss OR when `held` does not cover the key columns.
   */
  peek(
    plan: AttributePlanLike,
    hop: TableHopLike,
    held: HeldMap,
    options: LookupOptions = {},
  ): readonly AttributeRow[] | null {
    const bound = buildKeyValues(hop, held);
    if (bound === null) return null;
    const statement = tableHopSql(hop, { columns: options.columns, many: bound.many });
    return this.results.get(resultKey(`${hopKey(plan, hop)}${statement.shapeKey}`, bound.params)) ?? null;
  }

  /**
   * Pre-pay a hop's fixed costs — connection, scoped secret, prepared
   * statement — without running a query, so the first real lookup pays only
   * the row read. Cheap to call repeatedly: a fully-warm hop returns
   * synchronously, and failures are silent (the lookup path re-attempts and
   * surfaces them properly). The statement prepared is the ONE, full-width
   * one; a projected statement is prepared on first use.
   */
  warm(plan: AttributePlanLike, hop: TableHopLike): void {
    if (this.disposed) return;
    const store = hop.lookup.store;
    const statementKey = hopKey(plan, hop);
    const grant = this.grants.get(store.id);
    const secretFresh =
      grant !== undefined &&
      this.installedSecrets.get(store.id) === grant &&
      grant.expiresAt > Date.now() + GRANT_EXPIRY_SKEW_MS;
    const statementReady =
      this.preferLiteral || this.statements.get(statementKey) !== undefined;
    if (secretFresh && statementReady) return;

    const grantReady = this.grantFor(store);
    grantReady.catch(() => undefined);
    void this.enqueue(async () => {
      if (this.disposed) return;
      const connection = await this.ensureConnection();
      await this.installSecret(connection, store, await grantReady);
      if (!this.preferLiteral) {
        await this.ensureStatement(
          connection,
          statementKey,
          tableHopSql(hop).sql,
        ).catch(() => undefined);
      }
    }).catch(() => undefined);
  }

  /**
   * The one-hop foreign-key follow: look a returned value up in the table the
   * column `references`. Never on the hover path — the UI calls this on
   * expand. The target is keyed by its single INDEX coordinate column.
   */
  followReference(
    column: AttributeColumnLike,
    value: HeldValue,
  ): Promise<readonly AttributeRow[] | null> {
    let ref: ReturnType<AttributeLookupEngine["referenceLookup"]>;
    try {
      ref = this.referenceLookup(column);
    } catch (error) {
      return Promise.reject(error);
    }
    return this.cachedQuery(ref.key, ref.sql, [value], ref.store, () => false, false);
  }

  /**
   * Synchronous result-LRU peek of an already-followed reference — re-opening
   * an expand the session has answered before costs nothing.
   */
  peekReference(
    column: AttributeColumnLike,
    value: HeldValue,
  ): readonly AttributeRow[] | null {
    const target = column.references;
    if (!target) return null;
    return this.results.get(resultKey(`ref:${target.id}`, [value])) ?? null;
  }

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
    stores: readonly ParquetStoreLike[],
    buildSql: (urlOf: (storeId: string) => string) => string,
  ): Promise<readonly AttributeRow[]> {
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
    stores: readonly ParquetStoreLike[],
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

  private cachedQuery(
    statementKey: string,
    sql: string,
    keyValues: readonly BindParam[],
    store: ParquetStoreLike,
    isStale: () => boolean,
    /** Run as escaped-literal SQL regardless of the prepare probe. */
    literal: boolean,
  ): Promise<readonly AttributeRow[] | null> {
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
  private enqueue<T>(task: () => Promise<T>): Promise<T> {
    const result = this.chain.then(task, task);
    this.chain = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  }

  private ensureConnection(): Promise<DuckConnectionLike> {
    if (!this.connectionPromise) {
      this.connectionPromise = this.deps.connect().catch((error) => {
        this.connectionPromise = null;
        throw error;
      });
    }
    return this.connectionPromise;
  }

  /**
   * The store's access grant — network only, deduped, never on the query
   * chain. Region and grant are requested in PARALLEL (the region is the
   * same for every store and memoized after the first resolve). A grant
   * within the expiry skew of running out is refetched.
   */
  private grantFor(store: ParquetStoreLike): Promise<StoredGrant> {
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
  private async installSecret(
    connection: DuckConnectionLike,
    store: ParquetStoreLike,
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
      `CREATE OR REPLACE SECRET "${secretName(store.id)}" (${options.join(", ")})`,
    );
    this.installedSecrets.set(store.id, grant);
  }

  private async runQuery(
    connection: DuckConnectionLike,
    statementKey: string,
    sql: string,
    params: readonly BindParam[],
    literal = false,
  ): Promise<readonly AttributeRow[]> {
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

  private async ensureStatement(
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

  /** The SQL, statement key, and store for a column's declared reference. */
  private referenceLookup(column: AttributeColumnLike): {
    key: string;
    sql: string;
    store: ParquetStoreLike;
  } {
    const target = column.references;
    if (!target) {
      throw new Error(`column ${column.name} references nothing`);
    }
    const keyColumn = target.columns.find(
      (candidate) =>
        candidate.role === "COORDINATE" && candidate.axisType === "INDEX",
    );
    if (!keyColumn) {
      throw new Error(`referenced table ${target.name} has no INDEX key column`);
    }
    const attributes = target.columns.filter(
      (candidate) => candidate.role !== "COORDINATE",
    );
    const selectList = attributes.length
      ? attributes.map((attr) => escapeSqlIdentifier(attr.name)).join(", ")
      : "*";
    return {
      key: `ref:${target.id}`,
      sql: `SELECT ${selectList} FROM read_parquet(?) WHERE ${escapeSqlIdentifier(keyColumn.name)} = ?`,
      store: target.store,
    };
  }
}
