import baseCatalogJson from './catalogs/base@2.json';
import htmlCatalogJson from './catalogs/html@1.json';
import logoCatalogJson from './catalogs/logo@1.json';
import sceneCatalogJson from './catalogs/scene@1.json';
import structureCatalogJson from './catalogs/structure@1.json';
import uiCatalogJson from './catalogs/ui@1.json';
import orkestratorModuleJson from './modules/orkestrator.json';
import {loadVocabulary, type BlokContextName, type VocabFunction} from './vocabulary';

/**
 * What a v2 blok renders with, as the spec owns it. *Catalogs* are the
 * spec-owned, versioned sets: base@2 (the language) and the standard catalogs
 * (`ui@1`, `scene@1`, `logo@1`, `structure@1`, `html@1`), files under
 * `catalogs/`. A *module* is an app's own unversioned extras: the
 * `orkestrator` module (`modules/orkestrator.json`) is what only Orkestrator
 * draws, registered as its server `Module`. The port of arkitekt-spec's
 * `blok/catalogs` (`BlokView`, `default_view`).
 */

export const BASE_NAME = 'base';
export const ORKESTRATOR_MODULE = 'orkestrator';
export const STANDARD_CATALOGS = ['ui', 'scene', 'logo', 'structure', 'html'] as const;
export type StandardCatalog = (typeof STANDARD_CATALOGS)[number];

export type SpecEventField = {key: string; kind: string; description: string | null};

export type SpecProp = {
  key: string;
  /** `STRING INT FLOAT BOOL LIST DICT ANY CALLBACK ASSET ...` */
  kind: string;
  required: boolean;
  description: string | null;
  /** For a `CALLBACK`, the payload it is called with (`[]` when none); null otherwise. */
  event: readonly SpecEventField[] | null;
  /** For a `STRING`, the closed set of literals the component draws; null: any string. */
  values: readonly string[] | null;
};

export type SpecComponent = {
  name: string;
  description: string | null;
  context: BlokContextName;
  childrenContext: BlokContextName | null;
  inheritsContext: boolean;
  acceptsChildren: boolean;
  downstreamOf: readonly string[];
  notDownstreamOf: readonly string[];
  /** The prop text children fill (`<Button>Grip</Button>` sets `label`); null: it takes no text. */
  textProp: string | null;
  props: readonly SpecProp[];
  /** The catalog it is from, `name@version` (`ui@1`), or the module's name (`orkestrator`). */
  catalog: string;
};

export type SpecCatalog = {
  name: string;
  version: number | null;
  description: string | null;
  components: readonly SpecComponent[];
};

type Raw = Record<string, unknown>;

const isRaw = (value: unknown): value is Raw => typeof value === 'object' && value !== null && !Array.isArray(value);
const rawList = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);
const text = (value: unknown): string | null => (typeof value === 'string' ? value : null);
const texts = (value: unknown): string[] => rawList(value).filter((item): item is string => typeof item === 'string');

const contextOf = (value: unknown): BlokContextName | null =>
  value === 'HTML' || value === 'SCENE' || value === 'OVERLAY' || value === 'LOGO' ? value : null;

export const parseSpecCatalog = (raw: unknown, file: string): SpecCatalog => {
  if (!isRaw(raw) || typeof raw.name !== 'string') throw new Error(`${file} is not a catalog`);
  const version = typeof raw.version === 'number' ? raw.version : null;
  const catalog = version === null ? raw.name : `${raw.name}@${version}`;
  const components = rawList(raw.components).filter(isRaw).map((entry): SpecComponent => ({
    name: String(entry.name),
    description: text(entry.description),
    context: contextOf(entry.context) ?? 'HTML',
    childrenContext: contextOf(entry.children_context),
    inheritsContext: entry.inherits_context === true,
    acceptsChildren: entry.accepts_children === true,
    downstreamOf: texts(entry.downstream_of),
    notDownstreamOf: texts(entry.not_downstream_of),
    textProp: text(entry.text_prop) || null,
    props: rawList(entry.props).filter(isRaw).map((prop): SpecProp => ({
      key: String(prop.key),
      kind: String(prop.kind),
      required: prop.required === true,
      description: text(prop.description),
      event: Array.isArray(prop.event)
        ? prop.event.filter(isRaw).map(field => ({key: String(field.key), kind: String(field.kind), description: text(field.description)}))
        : null,
      values: Array.isArray(prop.values) ? prop.values.map(String) : null,
    })),
    catalog,
  }));
  return {name: raw.name, version, description: text(raw.description), components};
};

let parsed: {base: SpecCatalog; standard: Record<StandardCatalog, SpecCatalog>; orkestrator: SpecCatalog} | null = null;

const catalogs = () => {
  if (!parsed) {
    parsed = {
      base: parseSpecCatalog(baseCatalogJson, 'catalogs/base@2.json'),
      standard: {
        ui: parseSpecCatalog(uiCatalogJson, 'catalogs/ui@1.json'),
        scene: parseSpecCatalog(sceneCatalogJson, 'catalogs/scene@1.json'),
        logo: parseSpecCatalog(logoCatalogJson, 'catalogs/logo@1.json'),
        structure: parseSpecCatalog(structureCatalogJson, 'catalogs/structure@1.json'),
        html: parseSpecCatalog(htmlCatalogJson, 'catalogs/html@1.json'),
      },
      orkestrator: parseSpecCatalog(orkestratorModuleJson, 'modules/orkestrator.json'),
    };
  }
  return parsed;
};

/** base@2: the language components. */
export const baseCatalog = (): SpecCatalog => catalogs().base;
/** A standard catalog at the version the vocabulary names. */
export const standardCatalog = (name: StandardCatalog): SpecCatalog => catalogs().standard[name];
/** What only the Orkestrator draws: the `orkestrator` module it registers. */
export const orkestratorModule = (): SpecCatalog => catalogs().orkestrator;
export const standardCatalogs = (): SpecCatalog[] => STANDARD_CATALOGS.map(name => standardCatalog(name));

/**
 * A component name two sources define differently, and which definition is
 * drawn: a module's beats a standard catalog's (the app draws its own
 * `Slider`), base's is never shadowed, and between two standard catalogs the
 * first is kept. The validator warns `catalog.shadow` where a tree uses it.
 */
export type CatalogShadow = {
  component: string;
  /** The source that defines it first: base or a standard catalog (`ui@1`). */
  catalog: string;
  /** The source that defines it again: a module, or a later standard catalog. */
  module: string;
  /** Whose definition is used. */
  winner: string;
};

/** What a v2 blok is parsed and checked against. */
export type BlokView = {
  components: ReadonlyMap<string, SpecComponent>;
  functions: ReadonlyMap<string, VocabFunction>;
  label: string;
  /** Whether the components are every one the renderer draws, so an unknown one is a finding. */
  complete: boolean;
  /** The names two sources define differently, by name (`catalog.shadow`). */
  shadows: ReadonlyMap<string, CatalogShadow>;
};

const catalogLabel = (catalog: SpecCatalog): string => (catalog.version === null ? catalog.name : `${catalog.name}@${catalog.version}`);

/** Two definitions of a component are the same when everything but the catalog they come from is. */
export const sameComponent = (a: SpecComponent, b: SpecComponent): boolean => {
  const withoutCatalog = (component: SpecComponent): string =>
    JSON.stringify(component, (key, value: unknown) => (key === 'catalog' ? undefined : value));
  return withoutCatalog(a) === withoutCatalog(b);
};

/**
 * The view base, the standard catalogs and `extra` ones (modules: the
 * Orkestrator's, an app's) give; the port of the spec's `blok_view`.
 */
export const blokView = (extra: readonly SpecCatalog[] = [], options: {standard?: boolean; complete?: boolean} = {}): BlokView => {
  const base = baseCatalog();
  const sources = [base, ...(options.standard === false ? [] : standardCatalogs()), ...extra];
  const modules = new Set<SpecCatalog>(extra);
  const baseLabel = catalogLabel(base);
  const components = new Map<string, SpecComponent>();
  const shadows = new Map<string, CatalogShadow>();
  for (const catalog of sources) {
    for (const component of catalog.components) {
      const previous = components.get(component.name);
      if (!previous) {
        components.set(component.name, component);
        continue;
      }
      if (sameComponent(previous, component)) continue;
      const kept = previous.catalog;
      const other = component.catalog || catalog.name;
      const wins = modules.has(catalog) && kept !== baseLabel;
      if (wins) components.set(component.name, component);
      shadows.set(component.name, {component: component.name, catalog: kept, module: other, winner: wins ? other : kept});
    }
  }
  const label = sources.map(catalogLabel).join(' + ');
  return {components, functions: loadVocabulary().functions, label, complete: options.complete ?? true, shadows};
};

let defaultView: BlokView | null = null;

/** The Orkestrator's view: base, every standard catalog and its module. */
export const defaultBlokView = (): BlokView => {
  if (!defaultView) defaultView = blokView([orkestratorModule()]);
  return defaultView;
};

/** Whether a component is a language one that holds others in whatever context (`if`, `foreach`, `fragment`). */
export const isLanguageContainer = (component: SpecComponent | undefined): boolean =>
  component !== undefined && component.catalog.startsWith(`${BASE_NAME}@`) && component.inheritsContext && component.acceptsChildren;

/** The context a component's children are in, given the one it sits in. */
export const innerContext = (component: SpecComponent | undefined, context: BlokContextName): BlokContextName => {
  if (!component) return context;
  return component.inheritsContext ? context : component.childrenContext ?? component.context;
};
