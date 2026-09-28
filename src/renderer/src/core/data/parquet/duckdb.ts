import * as duckdb from "@duckdb/duckdb-wasm";
import duckdbEhWasm from "@duckdb/duckdb-wasm/dist/duckdb-eh.wasm?url";
import duckdbEhWorker from "@duckdb/duckdb-wasm/dist/duckdb-browser-eh.worker.js?url";

/**
 * The renderer's ONE DuckDB-WASM instance, shared by every parquet consumer:
 * the tables UI and the attribute lookup engine. (The scene's mesh collections
 * left this path: fabriks addresses Parquet by row group, which SQL cannot do —
 * see `scene/render/fabriks/README.md`.) Deliberate app-lifetime singletons — the
 * WASM VM and its Web Worker are created once and never terminated (consumers
 * mount/unmount frequently and re-instantiating WASM each time is expensive);
 * per-query connections are opened and closed by callers.
 */

/**
 * The `eh` (exception-handling) bundle, used unconditionally.
 *
 * This used to register `mvp` alongside it and call `duckdb.selectBundle`,
 * which feature-detects WASM exception handling and SIMD and picks the best
 * bundle the browser supports. But this renderer is Electron-only and Electron
 * pins its Chromium: exception handling shipped in Chromium 95 and SIMD in 91,
 * both far behind the version this app ships. So `eh` was ALWAYS the one
 * selected, and the `mvp` pair — a 40 MB `.wasm` plus its 0.8 MB worker — was
 * bundled into every installer without ever being loaded.
 *
 * Naming it directly is what makes that saving real: `selectBundle` reads
 * BOTH entries, so keeping the call would keep the assets. `DuckDBBundles`
 * types `mvp` as required, which is why this is a plain bundle rather than a
 * one-key `DuckDBBundles` — and pointing `mvp` at the `eh` assets to satisfy
 * the type would hand a non-eh runtime a binary it cannot execute, trading a
 * clear failure for a cryptic one.
 *
 * The same reasoning as the renderer's WebGPU gate (`SceneViewport.tsx`): a
 * platform that cannot run this fails loudly at instantiation rather than
 * silently degrading to a path we no longer carry.
 */
const EH_BUNDLE: duckdb.DuckDBBundle = {
  mainModule: duckdbEhWasm,
  mainWorker: duckdbEhWorker,
  // No pthread worker: this build is single-threaded, which is what
  // `selectBundle` also produced for `eh` (it only ever set this for the
  // `coi` bundle, which was never registered here).
  pthreadWorker: null,
};

let duckDbPromise: Promise<duckdb.AsyncDuckDB> | null = null;
let httpfsReadyPromise: Promise<void> | null = null;

export const getDuckDb = async () => {
  if (!duckDbPromise) {
    duckDbPromise = (async () => {
      const bundle = EH_BUNDLE;
      const worker = new Worker(bundle.mainWorker!);
      const logger = new duckdb.ConsoleLogger(duckdb.LogLevel.WARNING);
      const db = new duckdb.AsyncDuckDB(logger, worker);

      await db.instantiate(bundle.mainModule, bundle.pthreadWorker);
      await db.open({
        query: {
          castBigIntToDouble: true,
          castDecimalToDouble: true,
          castTimestampToDate: true,
        },
      });

      return db;
    })();
  }

  return duckDbPromise;
};

export const ensureHttpfs = async (connection: duckdb.AsyncDuckDBConnection) => {
  if (!httpfsReadyPromise) {
    httpfsReadyPromise = (async () => {
      await connection.query("INSTALL httpfs");
      await connection.query("LOAD httpfs");
    })().catch((error) => {
      httpfsReadyPromise = null;
      throw error;
    });
  }

  await httpfsReadyPromise;
};

/** The S3 endpoint options DuckDB secrets need, from the datalayer URL. */
export const resolveDuckDbEndpoint = (datalayerEndpoint?: string) => {
  if (!datalayerEndpoint) {
    return null;
  }

  const parsedEndpoint = new URL(datalayerEndpoint);
  const path = parsedEndpoint.pathname.replace(/\/+$/, "");

  return {
    endpoint: `${parsedEndpoint.host}${path === "/" ? "" : path}`,
    useSsl: parsedEndpoint.protocol === "https:",
  };
};
