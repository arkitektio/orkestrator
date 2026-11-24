import {buildRegisterModuleInput} from '@/rekuest/catalog/uiCatalogInput';
import {orkestratorCatalogSpec, orkestratorUi} from '@/core/blok/catalog';

/**
 * The documents this client publishes for its blok catalog:
 *
 * - `catalog` — the full `registerModule` payload, i.e. exactly what the app
 *   would send a rekuest server (every component and prop with its description
 *   and port, and the catalogs it speaks).
 * - `published` — the Orkestrator's catalog as the spec writes one: what is
 *   served at `https://arkitekt.live/catalogs/orkestrator/v1`, and what
 *   arkitekt-spec ships a snapshot of (`catalogs/orkestrator@1.json`), so
 *   `arkitekt check` knows the components only this app draws.
 *
 * Kept free of `fs` so it stays testable; `scripts/export-blok-catalog.mjs`
 * does the writing.
 */
export const buildCatalogExport = () => ({
  catalog: buildRegisterModuleInput(orkestratorUi),
  published: orkestratorCatalogSpec(orkestratorUi.catalog),
  /** The catalogs this app speaks (`base@4`), and the contexts in which it draws the base whole. */
  catalogs: [...orkestratorUi.claims],
  contexts: [...orkestratorUi.contexts],
});
