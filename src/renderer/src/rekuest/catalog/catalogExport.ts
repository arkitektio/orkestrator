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
 * There is no server to ask at build time, so what the base catalog holds is
 * taken from this client's own (`baseBlokCatalog`, which mirrors the server's
 * `base@1`): the published file is what this app adds to it, as the registrar
 * sends it.
 */
export const buildCatalogExport = () => ({
  catalog: buildRegisterUiCatalogInput(
    defaultBlokCatalog,
    {name: UI_CATALOG_NAME, description: UI_CATALOG_DESCRIPTION},
    {
      reservedOperations: new Set(defaultBlokCatalog.base?.functions.keys()),
      reservedComponents: new Set(defaultBlokCatalog.base?.components.keys()),
    },
  ),
  manifest: describeBlokCatalog(defaultBlokCatalog),
});
