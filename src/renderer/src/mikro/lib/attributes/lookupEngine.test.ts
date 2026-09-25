import { describe, expect, it } from "vitest";
import type { AttributeColumnLike, AttributePlanLike, TableHopLike } from "./attributeTypes";
import type {
  DuckConnectionLike,
  LookupEngineDeps,
  PreparedStatementLike,
} from "./lookupEngine";
import { AttributeLookupEngine } from "./lookupEngine";
import type { HeldMap } from "./planExec";
import { namesHop, sparsePlan, tableHop, tablePlan } from "./__fixtures__/plans";

const plan = (edgeId = "e1"): AttributePlanLike =>
  tablePlan({
    edge: { id: edgeId, version: 1 },
    sample: {
      system: { id: "sys", axes: [{ name: "y", order: 0 }, { name: "x", order: 1 }] },
      store: { id: "z1", bucket: "zb", key: "zk" },
      consumes: ["y", "x"],
      produces: ["i"],
      passthrough: ["t"],
    },
  });
const hop = (p: AttributePlanLike = plan()): TableHopLike => p.hops[0] as TableHopLike;

/** `engine.lookup` over the fixture plan's landing. */
const lookup = (
  engine: AttributeLookupEngine,
  held: HeldMap,
  isStale?: () => boolean,
  options?: { columns?: readonly string[] | null },
) => engine.lookup(plan(), hop(), held, isStale, options);

type FakeLog = {
  queries: string[];
  prepared: string[];
  statementCalls: unknown[][];
  closedStatements: number;
  regionRequests: number;
  grantRequests: string[];
};

const makeFake = (options?: {
  failPrepare?: boolean;
  rows?: unknown[];
  grant?: { bucket: string; key: string };
  /** Reject CREATE SECRET queries this many times before succeeding. */
  failSecretTimes?: number;
  /** statement.query call indices (0-based, across all statements) that reject. */
  failStatementCalls?: readonly number[];
}): { deps: LookupEngineDeps; log: FakeLog } => {
  const log: FakeLog = {
    queries: [],
    prepared: [],
    statementCalls: [],
    closedStatements: 0,
    regionRequests: 0,
    grantRequests: [],
  };
  const rows = options?.rows ?? [{ area: 12.5 }];
  let secretFailuresLeft = options?.failSecretTimes ?? 0;
  let statementCallIndex = 0;
  const connection: DuckConnectionLike = {
    query: async (sql) => {
      if (sql.includes("CREATE OR REPLACE SECRET") && secretFailuresLeft > 0) {
        secretFailuresLeft--;
        throw new Error("CREATE SECRET failed");
      }
      log.queries.push(sql);
      return { toArray: () => rows };
    },
    prepare: async (sql) => {
      if (options?.failPrepare) throw new Error("cannot prepare read_parquet(?)");
      log.prepared.push(sql);
      const statement: PreparedStatementLike = {
        query: async (...params) => {
          const index = statementCallIndex++;
          if (options?.failStatementCalls?.includes(index)) {
            throw new Error("transient statement failure");
          }
          log.statementCalls.push(params);
          return { toArray: () => rows };
        },
        close: async () => {
          log.closedStatements++;
        },
      };
      return statement;
    },
    close: async () => {},
  };
  const deps: LookupEngineDeps = {
    connect: async () => connection,
    requestGrant: async (storeId) => {
      log.grantRequests.push(storeId);
      return {
        accessKey: `ak-${storeId}`,
        secretKey: "sk",
        sessionToken: "st",
        bucket: options?.grant?.bucket ?? "b",
        // Per-store default so reference lookups (their own store) get their
        // own grant, as the real backend does.
        key:
          options?.grant?.key ?? (storeId === "pq2" ? "tracks.parquet" : "morph.parquet"),
        expiresIn: 3600,
      };
    },
    requestRegion: async () => {
      log.regionRequests++;
      return "us-east-1";
    },
    endpoint: { endpoint: "minio.local:9000", useSsl: false },
  };
  return { deps, log };
};

describe("AttributeLookupEngine", () => {
  it("creates the scoped secret once per store, then reuses it", async () => {
    const { deps, log } = makeFake();
    const engine = new AttributeLookupEngine(deps);
    await lookup(engine, { t: 1, i: 7 });
    await lookup(engine, { t: 1, i: 8 });
    const secretQueries = log.queries.filter((q) => q.includes("CREATE OR REPLACE SECRET"));
    expect(secretQueries).toHaveLength(1);
    expect(secretQueries[0]).toContain('"attr_store_pq1"');
    expect(secretQueries[0]).toContain("SCOPE 's3://b/morph.parquet'");
  });

  it("prepares each plan's SQL once and binds URL-first params", async () => {
    const { deps, log } = makeFake();
    const engine = new AttributeLookupEngine(deps);
    const rows = await lookup(engine, { t: 1, i: 7 });
    await lookup(engine, { t: 1, i: 8 });
    expect(rows).toEqual([{ area: 12.5 }]);
    expect(log.prepared).toHaveLength(1);
    expect(log.statementCalls).toEqual([
      ["s3://b/morph.parquet", 1, 7],
      ["s3://b/morph.parquet", 1, 8],
    ]);
  });

  it("queries the GRANT's URL, never the store's declared bucket/key", async () => {
    // The secret is scoped to the grant's s3://bucket/key; a URL built from
    // the store's own fields could miss that scope and fall back to the AWS
    // default endpoint (the parquet.s3.amazonaws.com CORS failure).
    const { deps, log } = makeFake({ grant: { bucket: "granted", key: "other/morph.parquet" } });
    const engine = new AttributeLookupEngine(deps);
    await lookup(engine, { t: 1, i: 7 });
    expect(log.statementCalls).toEqual([["s3://granted/other/morph.parquet", 1, 7]]);
    const secret = log.queries.find((q) => q.includes("CREATE OR REPLACE SECRET"));
    expect(secret).toContain("SCOPE 's3://granted/other/morph.parquet'");
  });

  it("serves repeat lookups for the same key tuple from the result LRU", async () => {
    const { deps, log } = makeFake();
    const engine = new AttributeLookupEngine(deps);
    await lookup(engine, { t: 1, i: 7 });
    await lookup(engine, { t: 1, i: 7 });
    await lookup(engine, { t: 1, i: 7 });
    expect(log.statementCalls).toHaveLength(1);
  });

  it("falls back to escaped-literal SQL when prepare fails, and remembers", async () => {
    const { deps, log } = makeFake({ failPrepare: true });
    const engine = new AttributeLookupEngine(deps);
    const rows = await lookup(engine, { t: 1, i: 7 });
    expect(rows).toEqual([{ area: 12.5 }]);
    const literal = log.queries.find((q) => q.includes("read_parquet('s3://b/morph.parquet')"));
    expect(literal).toContain('"t" = 1 AND "i" = 7');
    // Second lookup goes straight to literal without re-probing prepare.
    await lookup(engine, { t: 1, i: 8 });
    expect(log.prepared).toHaveLength(0);
  });

  it("peek answers a seen key tuple synchronously without any query", async () => {
    const { deps, log } = makeFake();
    const engine = new AttributeLookupEngine(deps);
    await lookup(engine, { t: 1, i: 7 });
    const queriesBefore = log.queries.length;
    const statementsBefore = log.statementCalls.length;
    expect(engine.peek(plan(), hop(), { t: 1, i: 7 })).toEqual([{ area: 12.5 }]);
    expect(log.queries.length).toBe(queriesBefore);
    expect(log.statementCalls.length).toBe(statementsBefore);
  });

  it("peek misses unseen tuples and uncovered keys without side effects", async () => {
    const { deps, log } = makeFake();
    const engine = new AttributeLookupEngine(deps);
    expect(engine.peek(plan(), hop(), { t: 1, i: 7 })).toBeNull(); // never looked up
    expect(engine.peek(plan(), hop(), { i: 7 })).toBeNull(); // key axis missing
    expect(log.queries).toHaveLength(0);
    expect(log.statementCalls).toHaveLength(0);
  });

  it("skips the query entirely when the request went stale", async () => {
    const { deps, log } = makeFake();
    const engine = new AttributeLookupEngine(deps);
    const rows = await lookup(engine, { t: 1, i: 7 }, () => true);
    expect(rows).toBeNull();
    expect(log.statementCalls).toHaveLength(0);
    expect(log.queries).toHaveLength(0);
  });

  it("rejects when held values do not cover the key columns", async () => {
    const { deps } = makeFake();
    const engine = new AttributeLookupEngine(deps);
    await expect(lookup(engine, { i: 7 })).rejects.toThrow();
  });

  it("normalizes bigint cells to safe numbers or strings", async () => {
    const { deps } = makeFake({
      rows: [{ area: 3n, big: 2n ** 60n }],
    });
    const engine = new AttributeLookupEngine(deps);
    const rows = await lookup(engine, { t: 1, i: 7 });
    expect(rows).toEqual([{ area: 3, big: (2n ** 60n).toString() }]);
  });

  it("follows a reference through the target's single INDEX key column", async () => {
    const { deps, log } = makeFake({ rows: [{ duration: 4.2 }] });
    const engine = new AttributeLookupEngine(deps);
    const column: AttributeColumnLike = {
      name: "instance_id",
      dtype: "BIGINT",
      references: {
        id: "tracks",
        name: "tracks",
        store: { id: "pq2", bucket: "b", key: "tracks.parquet" },
        columns: [
          { name: "instance_id", dtype: "BIGINT", role: "COORDINATE", axisType: "INDEX" },
          { name: "duration", dtype: "DOUBLE", role: "ATTRIBUTE" },
          { name: "mean_velocity", dtype: "DOUBLE", role: "ATTRIBUTE" },
        ],
      },
    };
    const rows = await engine.followReference(column, 42);
    expect(rows).toEqual([{ duration: 4.2 }]);
    expect(log.statementCalls).toEqual([["s3://b/tracks.parquet", 42]]);
    expect(log.prepared[0]).toBe(
      'SELECT "duration", "mean_velocity" FROM read_parquet(?) WHERE "instance_id" = ?',
    );
    // Its store got its own scoped secret.
    expect(
      log.queries.filter((q) => q.includes('"attr_store_pq2"')),
    ).toHaveLength(1);
  });

  it("rejects following a column that references nothing", async () => {
    const { deps } = makeFake();
    const engine = new AttributeLookupEngine(deps);
    await expect(
      engine.followReference({ name: "area", dtype: "DOUBLE" }, 1),
    ).rejects.toThrow();
  });

  it("surfaces a proven statement's failure instead of downgrading to literal", async () => {
    // Call 0 succeeds (statement becomes proven), call 1 fails transiently.
    const { deps, log } = makeFake({ failStatementCalls: [1] });
    const engine = new AttributeLookupEngine(deps);
    await lookup(engine, { t: 1, i: 7 });
    await expect(lookup(engine, { t: 1, i: 8 })).rejects.toThrow(
      "transient statement failure",
    );
    // No literal fallback ran for the failed lookup...
    expect(log.queries.filter((q) => q.includes("read_parquet('"))).toHaveLength(0);
    // ...and prepared statements are NOT permanently disabled: the next
    // lookup re-prepares and succeeds.
    const rows = await lookup(engine, { t: 1, i: 9 });
    expect(rows).toEqual([{ area: 12.5 }]);
    expect(log.prepared).toHaveLength(2);
  });

  it("retries CREATE SECRET on the next lookup after it fails", async () => {
    const { deps, log } = makeFake({ failSecretTimes: 1 });
    const engine = new AttributeLookupEngine(deps);
    await expect(lookup(engine, { t: 1, i: 7 })).rejects.toThrow(
      "CREATE SECRET failed",
    );
    // A failed CREATE must not leave a "secret exists" illusion behind.
    const rows = await lookup(engine, { t: 1, i: 7 });
    expect(rows).toEqual([{ area: 12.5 }]);
    expect(log.queries.filter((q) => q.includes("CREATE OR REPLACE SECRET"))).toHaveLength(1);
  });

  it("warm pre-creates secret and statement so the first lookup only queries", async () => {
    const { deps, log } = makeFake();
    const engine = new AttributeLookupEngine(deps);
    engine.warm(plan(), hop());
    // The lookup enqueues behind the warm task, so awaiting it proves warm ran.
    await lookup(engine, { t: 1, i: 7 });
    expect(log.prepared).toHaveLength(1);
    expect(
      log.queries.filter((q) => q.includes("CREATE OR REPLACE SECRET")),
    ).toHaveLength(1);
    expect(log.statementCalls).toHaveLength(1);
    // Re-warming a fully warm plan does nothing.
    engine.warm(plan(), hop());
    await lookup(engine, { t: 1, i: 8 });
    expect(log.prepared).toHaveLength(1);
    expect(
      log.queries.filter((q) => q.includes("CREATE OR REPLACE SECRET")),
    ).toHaveLength(1);
  });

  it("peekReference answers a followed reference synchronously, misses otherwise", async () => {
    const { deps, log } = makeFake({ rows: [{ duration: 4.2 }] });
    const engine = new AttributeLookupEngine(deps);
    const column: AttributeColumnLike = {
      name: "instance_id",
      dtype: "BIGINT",
      references: {
        id: "tracks",
        name: "tracks",
        store: { id: "pq2", bucket: "b", key: "tracks.parquet" },
        columns: [
          { name: "instance_id", dtype: "BIGINT", role: "COORDINATE", axisType: "INDEX" },
          { name: "duration", dtype: "DOUBLE", role: "ATTRIBUTE" },
        ],
      },
    };
    expect(engine.peekReference(column, 42)).toBeNull();
    expect(engine.peekReference({ name: "area", dtype: "DOUBLE" }, 42)).toBeNull();
    await engine.followReference(column, 42);
    const queriesBefore = log.queries.length;
    const statementsBefore = log.statementCalls.length;
    expect(engine.peekReference(column, 42)).toEqual([{ duration: 4.2 }]);
    expect(engine.peekReference(column, 43)).toBeNull();
    expect(log.queries.length).toBe(queriesBefore);
    expect(log.statementCalls.length).toBe(statementsBefore);
  });

  it("projects the statement to the user's columns and caches results per projection", async () => {
    const { deps, log } = makeFake();
    const engine = new AttributeLookupEngine(deps);
    const wide = tablePlan({
      hops: [
        tableHop({
          lookup: {
            ...hop().lookup,
            attributes: [
              { name: "area", dtype: "DOUBLE" },
              { name: "perimeter", dtype: "DOUBLE" },
            ],
          },
        }),
      ],
    });
    const wideHop = wide.hops[0] as TableHopLike;
    await engine.lookup(wide, wideHop, { t: 1, i: 7 }, undefined, { columns: ["perimeter"] });
    await engine.lookup(wide, wideHop, { t: 1, i: 7 });
    expect(log.prepared).toEqual([
      'SELECT "perimeter" FROM read_parquet(?) WHERE "t" = ? AND "i" = ?',
      'SELECT "area", "perimeter" FROM read_parquet(?) WHERE "t" = ? AND "i" = ?',
    ]);
    // Two statements, two result entries: the projected rows never stand in
    // for the full ones.
    expect(log.statementCalls).toHaveLength(2);
    expect(engine.peek(wide, wideHop, { t: 1, i: 7 }, { columns: ["perimeter"] })).not.toBeNull();
    expect(engine.peek(wide, wideHop, { t: 1, i: 7 })).not.toBeNull();
    // A projection naming every column is the plain statement.
    await engine.lookup(wide, wideHop, { t: 1, i: 7 }, undefined, { columns: ["area", "perimeter"] });
    expect(log.statementCalls).toHaveLength(2);
  });

  it("runs a MANY binding as literal SQL with an IN list, keys selected", async () => {
    const { deps, log } = makeFake({ rows: [{ gene: 4, symbol: "G4" }] });
    const engine = new AttributeLookupEngine(deps);
    const sparse = sparsePlan();
    const rows = await engine.lookup(sparse, namesHop(), { gene: [4, 2] });
    expect(rows).toEqual([{ gene: 4, symbol: "G4" }]);
    expect(log.prepared).toHaveLength(0);
    expect(log.queries.at(-1)).toBe(
      'SELECT "gene", "symbol" FROM read_parquet(\'s3://b/morph.parquet\') WHERE "gene" IN (4, 2)',
    );
    // A literal MANY run does not downgrade the build: the next ONE lookup prepares.
    await lookup(engine, { t: 1, i: 7 });
    expect(log.prepared).toHaveLength(1);
    // Same list again: the result LRU answers.
    expect(engine.peek(sparse, namesHop(), { gene: [4, 2] })).toEqual(rows);
    expect(engine.peek(sparse, namesHop(), { gene: [2, 4] })).toBeNull();
  });

  it("concurrent lookups on different stores share one region request", async () => {
    const { deps, log } = makeFake();
    const engine = new AttributeLookupEngine(deps);
    const column: AttributeColumnLike = {
      name: "instance_id",
      dtype: "BIGINT",
      references: {
        id: "tracks",
        name: "tracks",
        store: { id: "pq2", bucket: "b", key: "tracks.parquet" },
        columns: [
          { name: "instance_id", dtype: "BIGINT", role: "COORDINATE", axisType: "INDEX" },
          { name: "duration", dtype: "DOUBLE", role: "ATTRIBUTE" },
        ],
      },
    };
    await Promise.all([
      lookup(engine, { t: 1, i: 7 }),
      engine.followReference(column, 42),
    ]);
    expect(log.regionRequests).toBe(1);
    expect([...log.grantRequests].sort()).toEqual(["pq1", "pq2"]);
  });
});
