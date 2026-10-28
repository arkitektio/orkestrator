import {buildRegisterModuleInput} from '@/rekuest/catalog/uiCatalogInput';
import {orkestratorUi, UI_CATALOG_DESCRIPTION, UI_CATALOG_NAME} from '@/core/blok/catalog';
import {blokModuleSpec} from '@arkitektio/bsx/runtime';

/**
 * The documents this client publishes for its blok module:
 *
 * - `catalog` — the full `registerModule` payload, i.e. exactly what the app
 *   would send a rekuest server (every component and prop with its description
 *   and `CatalogValueKind`, and the global catalogs it claims).
 * - `module` — the same components as the spec writes a catalog
 *   (`modules/orkestrator.json` in arkitekt-spec): what `arkitekt check` knows
 *   of the components only this app draws.
 *
 * Kept free of `fs` so it stays testable; `scripts/export-blok-catalog.mjs`
 * does the writing.
 */
export const buildCatalogExport = () => ({
  catalog: buildRegisterModuleInput(orkestratorUi),
  module: blokModuleSpec(UI_CATALOG_NAME, UI_CATALOG_DESCRIPTION, orkestratorUi.catalog),
  /** The global catalogs this app implements whole, as `name@version`. */
  catalogs: [...orkestratorUi.claims],
});
