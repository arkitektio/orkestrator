import {baseCatalog, standardCatalog, STANDARD_CATALOGS, type StandardCatalog} from '../spec/catalogs';
import {loadVocabulary} from '../spec/vocabulary';
import type {BlokCatalog} from './runtime';

/**
 * What this renderer implements of the spec (blok language v2): base@2, every
 * standard catalog whose every component it draws (`ui@1`, `scene@1`, ...),
 * and its own extras, registered as the `orkestrator` module (the server's
 * `Module`, `registerModule`) with those catalogs as `Module.catalogs`.
 */

/** The standard catalogs a renderer implements whole, as `name@version`. */
export const implementedCatalogs = (catalog: BlokCatalog): string[] =>
  STANDARD_CATALOGS.filter((name: StandardCatalog) =>
    standardCatalog(name).components.every(component => catalog.components.has(component.name)),
  ).map(name => `${name}@${loadVocabulary().catalogs[name]}`);

/** The standard catalogs a renderer leaves components of undrawn, with those components: what keeps it from claiming them. */
export const missingCatalogComponents = (catalog: BlokCatalog): Record<string, string[]> =>
  Object.fromEntries(
    STANDARD_CATALOGS.map((name): [string, string[]] => [
      `${name}@${loadVocabulary().catalogs[name]}`,
      standardCatalog(name)
        .components.filter(component => !catalog.components.has(component.name))
        .map(component => component.name),
    ]).filter(([, missing]) => missing.length > 0),
  );

const moduleShadows = new WeakMap<BlokCatalog, Set<string>>();

/** Per catalog, the standard component names a module drew over (`addBlokComponents`): those the module's own definition renders. */
export const moduleShadowsOf = (catalog: BlokCatalog): Set<string> => {
  const found = moduleShadows.get(catalog);
  if (found) return found;
  const created = new Set<string>();
  moduleShadows.set(catalog, created);
  return created;
};

/**
 * The components the spec owns (base and the standard catalogs): never part
 * of the `orkestrator` module, except a standard one a module drew over in
 * `catalog`, which the module registers as its own (it shadows the standard
 * one, `catalog.shadow`).
 */
export const specOwnedComponents = (catalog?: BlokCatalog): ReadonlySet<string> => {
  const shadowed = catalog ? moduleShadowsOf(catalog) : new Set<string>();
  return new Set(
    [
      ...baseCatalog().components.map(component => component.name),
      ...STANDARD_CATALOGS.flatMap(name => standardCatalog(name).components.map(component => component.name)),
    ].filter(name => !shadowed.has(name)),
  );
};
