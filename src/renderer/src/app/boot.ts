import { ensureHttpfs, getDuckDb } from "@/core/data/parquet/duckdb";
import { assertWebGPUSupported } from "@/core/data/scene/gpu/webgpuSupport";
import { modulePages } from "@/core/modules/registries";
import { preloadAll } from "@/core/util/preloadable";
import { windowRole } from "@/core/util/windowRole";

/**
 * Load every split chunk before the window's first render.
 *
 * In a built app each chunk is read from local disk: loading them all here
 * costs a few milliseconds of IO plus their compile (code-cached after the
 * first launch), and in exchange no page, viewer or blok render ever flashes
 * its loading fallback on first use.
 *
 * The main window only. The quick bar renders only the palette and forwards
 * navigation to the main window; a popout shows the few pages it was opened
 * for. Each window is its own renderer, so preloading there would compile the
 * whole app again for pages it never shows: they load on first use instead.
 */
export const preloadWindow = async (): Promise<void> => {
  if (windowRole() !== "app") return;
  // Declares each module's page as preloadable; the rest declared themselves
  // when their files were imported.
  modulePages();
  await preloadAll();
};

/**
 * Start the engines most sessions reach for, once the window is idle after its
 * first paint: DuckDB (worker + a 35 MB WASM compile, then the httpfs
 * extension every parquet read needs) and the WebGPU adapter the scene gates
 * on. Both are memoized app-lifetime singletons, so the first table or scene
 * finds them ready instead of waiting on them. Failures are left for the real
 * use to report: DuckDB's and httpfs's retry there, the WebGPU probe's is
 * memoized by design and rendered by the scene.
 *
 * The main window only: DuckDB is a worker and a WASM heap per renderer, and a
 * popout or the quick bar that never opens a table would carry it for nothing.
 */
export const warmEngines = (): void => {
  if (windowRole() !== "app") return;
  const idle = window.requestIdleCallback ?? ((callback: () => void) => window.setTimeout(callback, 200));
  idle(() => {
    assertWebGPUSupported().catch(() => {});
    void (async () => {
      const db = await getDuckDb();
      const connection = await db.connect();
      try {
        await ensureHttpfs(connection);
      } finally {
        await connection.close();
      }
    })().catch((error: unknown) => console.warn("[boot] warming DuckDB failed; the first table will retry:", error));
  });
};
