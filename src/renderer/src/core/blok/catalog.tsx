import {threeScene} from '@arkitektio/bsx/scene';
import {shadcnExtras, shadcnHtml, shadcnLogo, shadcnUi} from '@arkitektio/bsx/shadcn';
import {blokCatalogSpec, declareBlokUi, type BlokCatalog, type BlokComponentDefinition, type SpecCatalogJson} from '@arkitektio/bsx/runtime';
import {addBlokComponents as addToCatalog} from '@arkitektio/bsx/web';
import {ORKESTRATOR_CATALOG_ID, parseSpecCatalog, setAppBlokCatalog} from '@arkitektio/bsx/spec/catalogs';
import {hostedStructure} from '@arkitektio/bsx/ports/structure/index';

/**
 * The Orkestrator's catalog: what it draws beyond the base catalog. A blok
 * written for it names it by `UI_CATALOG_ID`, the address it is published at;
 * `UI_CATALOG_NAME` is what it is registered under on the rekuest server
 * (`registerModule`, upsert by name). Its version only ever gains: a
 * component added later says the minor that added it.
 */
export const UI_CATALOG_ID = ORKESTRATOR_CATALOG_ID;
export const UI_CATALOG_NAME = 'orkestrator';
export const UI_CATALOG_VERSION = 1;
export const UI_CATALOG_DESCRIPTION =
  "What the Orkestrator draws beyond the base catalog: the components of the services it has modules for (mikro's scene and tables). A blok written for it names it as its catalog.";

/**
 * Orkestrator's UI: the base catalog whole, drawn with the package's shadcn
 * and three implementations and its structure parts through the port host
 * (`portHost.tsx`). Its modules add their bloks to the catalog at install
 * (`addBlokComponents`): those are its own catalog.
 */
export const orkestratorUi = declareBlokUi({
  name: UI_CATALOG_NAME,
  description: UI_CATALOG_DESCRIPTION,
  implements: [shadcnUi, shadcnHtml, shadcnLogo, shadcnExtras, threeScene, hostedStructure],
});

export const defaultBlokCatalog: BlokCatalog = orkestratorUi.catalog;

/** The Orkestrator's catalog as the spec writes one: what is published at `UI_CATALOG_ID`. */
export const orkestratorCatalogSpec = (catalog: BlokCatalog = defaultBlokCatalog): SpecCatalogJson =>
  blokCatalogSpec({id: UI_CATALOG_ID, name: UI_CATALOG_NAME, version: UI_CATALOG_VERSION, description: UI_CATALOG_DESCRIPTION}, catalog);

/** The app's own view learns what the modules drew: its parser, checks and editor know their components. */
const registerModuleView = (catalog: BlokCatalog) =>
  setAppBlokCatalog(parseSpecCatalog(orkestratorCatalogSpec(catalog), UI_CATALOG_NAME));

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
