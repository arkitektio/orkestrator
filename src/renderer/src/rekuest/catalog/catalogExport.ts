import {buildRegisterModuleInput} from '@/rekuest/catalog/uiCatalogInput';
import {defaultBlokCatalog, UI_CATALOG_DESCRIPTION, UI_CATALOG_NAME} from '@/core/blok/renderer/catalog';
import {describeBlokCatalog} from '@/core/blok/renderer/runtime';
import {implementedCatalogs, specOwnedComponents} from '@/core/blok/renderer/modules';

/**
 * The two JSON documents this client publishes for its blok module:
 *
 * - `catalog` — the full `registerModule` payload, i.e. exactly what the app
 *   would send a rekuest server (every component and prop with its description
 *   and `CatalogValueKind`).
 * - `manifest` — the lightweight `describeBlokCatalog` shape (names, prop keys,
 *   function signatures), the document the catalog id URL is meant to serve.
 *
 * Kept free of `fs` so it stays testable; `scripts/export-blok-catalog.mjs`
 * does the writing.
 *
 * There is no server to ask at build time, so what the base catalog holds is
 * taken from this client's own (`baseBlokCatalog`): the published file is what
 * this app adds to base and the spec's standard catalogs (the `orkestrator`
 * module), with the catalogs it implements named, as the registrar sends it.
 */
export const buildCatalogExport = () => {
  const catalogs = implementedCatalogs(defaultBlokCatalog);
  return {
    catalog: buildRegisterModuleInput(
      defaultBlokCatalog,
      {name: UI_CATALOG_NAME, description: UI_CATALOG_DESCRIPTION},
      {
        reservedOperations: new Set(defaultBlokCatalog.base?.functions.keys()),
        reservedComponents: new Set([...defaultBlokCatalog.base?.components.keys() ?? [], ...specOwnedComponents(defaultBlokCatalog)]),
        catalogs,
      },
    ),
    manifest: describeBlokCatalog(defaultBlokCatalog),
    /** The spec's standard catalogs this app implements whole, as `name@version`. */
    catalogs,
  };
};
