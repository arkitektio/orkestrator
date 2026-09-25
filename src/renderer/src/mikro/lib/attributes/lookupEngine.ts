import type {
  AttributeColumnLike,
  AttributePlanLike,
  AttributeRow,
  ParquetStoreLike,
  TableHopLike,
} from "./attributeTypes";
import { hopKey } from "./attributeTypes";
import type { HeldMap, HeldValue } from "./planExec";
import { buildKeyValues } from "./planExec";
import { tableHopSql } from "./planSql";
import { escapeSqlIdentifier } from "./sqlBind";
import {
  GRANT_EXPIRY_SKEW_MS,
  ParquetQueryEngine,
  resultKey,
  type ParquetEngineDeps,
} from "@/core/data/parquet/parquetEngine";

/**
 * The DuckDB half of attribute-plan execution — the attribute-plan reads, on top
 * of the shared `ParquetQueryEngine` (`@/lib/parquet/parquetEngine`), which owns
 * the connection, grants, secrets and generic reads described below. Owns exactly what
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

export type {
  DuckConnectionLike,
  ParquetGrantLike,
  PreparedStatementLike,
  QueryResultLike,
} from "@/core/data/parquet/parquetEngine";

/** The deps a lookup engine is built with — the shared engine's. */
export type LookupEngineDeps = ParquetEngineDeps;

export type LookupOptions = {
  /** Attribute names to select (a projection); null/empty = every declared one. */
  columns?: readonly string[] | null;
};

export class AttributeLookupEngine extends ParquetQueryEngine {
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
