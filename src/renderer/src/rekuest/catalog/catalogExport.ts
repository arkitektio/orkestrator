import {buildRegisterUiCatalogInput} from '@/rekuest/catalog/uiCatalogInput';
import {defaultBlokCatalog, UI_CATALOG_DESCRIPTION, UI_CATALOG_NAME} from '@/core/blok/renderer/catalog';
import {describeBlokCatalog} from '@/core/blok/renderer/runtime';

/**
 * The two JSON documents this client publishes for its blok catalog:
 *
 * - `catalog` — the full `registerUiCatalog` payload, i.e. exactly what the app
 *   would send a rekuest server (every component and prop with its description
 *   and `CatalogValueKind`).
 * - `manifest` — the lightweight `describeBlokCatalog` shape (names, prop keys,
 *   function signatures), the document the catalog id URL is meant to serve.
 *
 * Kept free of `fs` so it stays testable; `scripts/export-blok-catalog.mjs`
 * does the writing.
 *
 * Unlike `UiCatalogRegistrar`, this passes no `reservedOperations` — there is
 * no server to ask at build time. The published file is therefore the client's
 * complete offer, and an importing server still applies its own reserved-name
 * rules to it.
 */
export const buildCatalogExport = () => ({
  catalog: buildRegisterUiCatalogInput(defaultBlokCatalog, {
    name: UI_CATALOG_NAME,
    description: UI_CATALOG_DESCRIPTION,
  }),
  manifest: describeBlokCatalog(defaultBlokCatalog),
});
