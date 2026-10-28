import {threeScene} from '@arkitektio/bsx/scene';
import {shadcnExtras, shadcnHtml, shadcnLogo, shadcnUi} from '@arkitektio/bsx/shadcn';
import {blokModuleSpec, declareBlokUi, type BlokCatalog, type BlokComponentDefinition} from '@arkitektio/bsx/runtime';
import {addBlokComponents as addToCatalog} from '@arkitektio/bsx/web';
import {parseSpecCatalog, registerBlokModules} from '@arkitektio/bsx/spec/catalogs';
import {orkestratorStructure} from './structure';

/**
 * The name this client registers its module under on the rekuest server
 * (`registerModule`, upsert by name): what it draws beyond the global
 * catalogs it claims.
 */
export const UI_CATALOG_NAME = 'orkestrator';
export const UI_CATALOG_DESCRIPTION = 'Components rendered by the Orkestrator desktop app';

/**
 * Orkestrator's UI: the global catalogs it implements, drawn with the package's
 * shadcn and three implementations, and structure@1 with its own smart system.
 * Its modules add their bloks to the catalog at install (`addBlokComponents`):
 * those, the `orkestrator` module, are what it registers as its own.
 */
export const orkestratorUi = declareBlokUi({
  name: UI_CATALOG_NAME,
  description: UI_CATALOG_DESCRIPTION,
  implements: [shadcnUi, shadcnHtml, shadcnLogo, shadcnExtras, threeScene, orkestratorStructure],
});

export const defaultBlokCatalog: BlokCatalog = orkestratorUi.catalog;

/** The language's default view learns what the modules drew: the parser and the checks know their components. */
const registerModuleView = (catalog: BlokCatalog) =>
  registerBlokModules([parseSpecCatalog(blokModuleSpec(UI_CATALOG_NAME, UI_CATALOG_DESCRIPTION, catalog), UI_CATALOG_NAME)]);

/**
 * Adds components a module brings (`ModuleBuiltins.bloks`) to the catalog, so
 * everything that reads `defaultBlokCatalog` (the renderer, the registrar, the
 * export, the language) offers them. Called once, by the composition root that
 * installs the modules; core never imports a module. Returns the undo (a dev
 * hot reload installs the modules again). See `addBlokComponents` in `@arkitektio/bsx/web`.
 */
export const addBlokComponents = (
  components: readonly BlokComponentDefinition[],
  catalog: BlokCatalog = defaultBlokCatalog,
): (() => void) => {
  const undo = addToCatalog(components, catalog);
  registerModuleView(catalog);
  return () => {
    undo();
    registerModuleView(catalog);
  };
};
