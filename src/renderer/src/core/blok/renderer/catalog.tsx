import {RawInspector} from './bloks/inspector/Inspector';
import {logoBlokComponents} from './bloks/logo';
import {sceneBlokComponents} from './bloks/scene';
import {structureBlokComponents} from './bloks/structure';
import {shadcnComposableComponents} from './bloks';
import {baseBlokCatalog} from './baseCatalog';
import {effectFunctions, variadicBlokFunctions} from './functions';
import {extendBlokCatalog, type BlokCatalog, type BlokComponentDefinition} from './runtime';

/**
 * The catalog a blok payload is validated and rendered against: which
 * components exist, which functions a `utilCall` may name. Orkestrator's UI
 * catalog, extending the base one (`./baseCatalog.ts`) with what this app draws.
 *
 * The backend does not enumerate either — `ComponentNode.component` and
 * `UtilCall.operation` are free-form strings — so this module is the authority,
 * and `describeBlokCatalog` turns it into the published manifest.
 */
/**
 * The name this client registers `defaultBlokCatalog` under on the rekuest
 * server (`registerUiCatalog`, upsert by name). Bloks reference catalogs by
 * this name; the URL below stays the client-side catalog id.
 */
export const UI_CATALOG_NAME = 'orkestrator';
export const UI_CATALOG_DESCRIPTION =
  'Components and functions rendered by the Orkestrator desktop app';

export const defaultBlokCatalog: BlokCatalog = extendBlokCatalog(
  baseBlokCatalog,
  'https://arkitekt.live/catalogs/v1.json',
  [
    ...shadcnComposableComponents,
    ...structureBlokComponents,
    ...sceneBlokComponents,
    ...logoBlokComponents,
    RawInspector,
  ],
  [...variadicBlokFunctions, ...effectFunctions],
);

/**
 * Adds components a module brings (`ModuleBuiltins.bloks`) to the catalog, so
 * everything that reads `defaultBlokCatalog` (the renderer, the registrar, the
 * export) offers them. Called once, by the composition root that installs the
 * modules; core never imports a module.
 *
 * A name is one component: one the catalog already holds is refused, whoever
 * brought it. Returns the undo (a dev hot reload installs the modules again).
 */
export const addBlokComponents = (
  components: readonly BlokComponentDefinition[],
  catalog: BlokCatalog = defaultBlokCatalog,
): (() => void) => {
  const taken = components.filter(component => catalog.components.has(component.name));
  if (taken.length > 0) {
    throw new Error(`Blok components already in the catalog: ${taken.map(component => component.name).join(', ')}`);
  }
  for (const component of components) catalog.components.set(component.name, component);
  return () => {
    for (const component of components) {
      if (catalog.components.get(component.name) === component) catalog.components.delete(component.name);
    }
  };
};
