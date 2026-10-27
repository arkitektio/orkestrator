import {RawInspector} from './bloks/inspector/Inspector';
import {logoBlokComponents} from './bloks/logo';
import {runBlokComponents} from './bloks/run';
import {sceneBlokComponents} from './bloks/scene';
import {structureBlokComponents} from './bloks/structure';
import {shadcnComposableComponents} from './bloks';
import {baseBlokCatalog} from './baseCatalog';
import {effectFunctions, variadicBlokFunctions} from './functions';
import {baseCatalog, standardCatalogs} from '../spec/catalogs';
import {moduleShadowsOf} from './modules';
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
    ...runBlokComponents,
    ...logoBlokComponents,
    RawInspector,
  ],
  [...variadicBlokFunctions, ...effectFunctions],
);

/** The names a standard catalog (`ui@1`, `scene@1`, ...) defines and base does not: what a module may draw over. */
const shadowableNames = (): ReadonlySet<string> => {
  const base = new Set(baseCatalog().components.map(component => component.name));
  return new Set(standardCatalogs().flatMap(catalog => catalog.components.map(component => component.name)).filter(name => !base.has(name)));
};

/**
 * Adds components a module brings (`ModuleBuiltins.bloks`) to the catalog, so
 * everything that reads `defaultBlokCatalog` (the renderer, the registrar, the
 * export) offers them. Called once, by the composition root that installs the
 * modules; core never imports a module.
 *
 * A module may draw over a standard catalog's component (its own `Slider`):
 * the module's is rendered, as the spec's `blok_view` says, and the validator
 * warns `catalog.shadow` where a blok uses it. Any other name the catalog
 * already holds (base's, the app's own, another module's) is refused, whoever
 * brought it. Returns the undo, which puts a drawn-over component back (a dev
 * hot reload installs the modules again).
 */
export const addBlokComponents = (
  components: readonly BlokComponentDefinition[],
  catalog: BlokCatalog = defaultBlokCatalog,
): (() => void) => {
  const shadowable = shadowableNames();
  const shadows = moduleShadowsOf(catalog);
  const taken = components.filter(
    component => catalog.components.has(component.name) && (!shadowable.has(component.name) || shadows.has(component.name)),
  );
  if (taken.length > 0) {
    throw new Error(`Blok components already in the catalog: ${taken.map(component => component.name).join(', ')}`);
  }
  const previous = new Map<string, BlokComponentDefinition>();
  for (const component of components) {
    const drawnOver = catalog.components.get(component.name);
    if (drawnOver) {
      previous.set(component.name, drawnOver);
      shadows.add(component.name);
    }
    catalog.components.set(component.name, component);
  }
  return () => {
    for (const component of components) {
      if (catalog.components.get(component.name) !== component) continue;
      const restored = previous.get(component.name);
      if (restored) {
        catalog.components.set(component.name, restored);
        shadows.delete(component.name);
      } else catalog.components.delete(component.name);
    }
  };
};
