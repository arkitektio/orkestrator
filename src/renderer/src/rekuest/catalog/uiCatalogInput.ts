import { blokCatalogSpec, type BlokUi, type SpecComponentJson } from "@arkitektio/bsx/runtime";
import { UI_CATALOG_ID, UI_CATALOG_VERSION } from "@/core/blok/catalog";
import {
  ComponentContext,
  type CatalogComponentInput,
  type CatalogOperationInput,
  type CatalogPortInput,
  type RegisterModuleInput,
  type ModuleFragment,
} from "@/rekuest/api/graphql";

/**
 * The renderer's declared UI (`orkestratorUi`) as rekuest's `RegisterModuleInput`: the
 * components it draws beyond the base catalog, each prop typed by the port bsx publishes for
 * it (`blokCatalogSpec`), the same document the catalog export writes.
 *
 * Lives under rekuest because it emits rekuest input types.
 */

const CONTEXT: Record<SpecComponentJson["context"], ComponentContext> = {
  PANEL: ComponentContext.Panel,
  SCENE: ComponentContext.Scene,
  LOGO: ComponentContext.Logo,
};

const camel = (snake: string): string => snake.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase());

type Raw = Record<string, unknown>;

/** A port as the catalog spec writes it (snake case) as rekuest's input (camel case). */
export const portInput = (raw: Raw | null | undefined): CatalogPortInput | null => {
  if (!raw) return null;
  const out: Raw = {};
  for (const [key, value] of Object.entries(raw)) {
    if (key === "children" && Array.isArray(value)) {
      out.children = (value as Raw[]).map(({ key: childKey, description, ...port }) => ({
        ...portInput(port),
        key: childKey,
        description: description ?? null,
      }));
    } else {
      out[camel(key)] = value;
    }
  }
  return out as CatalogPortInput;
};

/**
 * `RegisterModuleInput` marks the lists optional (server defaults to `[]`);
 * the builder always fills them, and consumers rely on that.
 */
export type BuiltModuleInput = RegisterModuleInput & {
  components: CatalogComponentInput[];
  operations: CatalogOperationInput[];
  catalogs: string[];
};

const sortBy = <T,>(items: T[], key: (item: T) => string): T[] =>
  [...items].sort((left, right) => key(left).localeCompare(key(right)));

export const componentInput = (component: SpecComponentJson): CatalogComponentInput => ({
  name: component.name,
  description: component.description,
  acceptsChildren: component.accepts_children,
  context: CONTEXT[component.context],
  childrenContext: component.children_context ? CONTEXT[component.children_context] : null,
  inheritsContext: component.inherits_context,
  downstreamOf: [...component.downstream_of].sort(),
  notDownstreamOf: [...component.not_downstream_of].sort(),
  textProp: component.text_prop,
  props: sortBy(component.props, (prop) => prop.key).map((prop) => ({
    key: prop.key,
    port: portInput(prop.port),
    required: prop.required,
    description: prop.description,
  })),
});

/**
 * What this UI registers (`registerModule`): the components it draws beyond the base
 * catalog and `catalogs`, the ones it speaks (`ui.claims`). The base catalog's components are
 * the spec's and never sent.
 */
export const buildRegisterModuleInput = (
  ui: Pick<BlokUi, "name" | "description" | "catalog" | "claims">,
): BuiltModuleInput => ({
  name: ui.name,
  description: ui.description,
  components: sortBy(
    blokCatalogSpec(
      { id: UI_CATALOG_ID, name: ui.name, version: UI_CATALOG_VERSION, description: ui.description ?? "" },
      ui.catalog,
    ).components,
    (component) => component.name,
  ).map(componentInput),
  // A module adds components only: what a blok may call is the language's (the spec's vocabulary).
  operations: [],
  catalogs: [...ui.claims].sort(),
  // The client's per-PortKind fallbacks are built-in React widgets, not catalog components.
  widgetDefaults: [],
});

// --- Comparison against the server copy ---------------------------------------

/**
 * A port as the server's `tree` writes it: camel case, and nothing empty (no null, no
 * `nullable: false`, no empty list). Keys sorted, so two writings compare as strings.
 */
const canonicalPort = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(canonicalPort);
  if (value === null || typeof value !== "object") return value;
  const out: Raw = {};
  for (const key of Object.keys(value as Raw).sort()) {
    const field = (value as Raw)[key];
    if (key === "__typename" || field === null || field === undefined) continue;
    if (key === "nullable" && field === false) continue;
    if (Array.isArray(field) && field.length === 0) continue;
    out[key] = canonicalPort(field);
  }
  return out;
};

type RemoteProp = { key: string; required?: boolean | null; description?: string | null; port?: { tree?: unknown } | null };
type LocalProp = { key: string; required?: boolean | null; description?: string | null; port?: CatalogPortInput | null };

const canonicalProps = (props: ReadonlyArray<RemoteProp | LocalProp> | null | undefined) =>
  sortBy([...(props ?? [])], (prop) => prop.key).map((prop) => ({
    key: prop.key,
    required: prop.required ?? false,
    description: prop.description ?? null,
    port: canonicalPort(
      prop.port && "tree" in prop.port ? (prop.port as { tree?: unknown }).tree : (prop.port ?? null),
    ),
  }));

const canonicalize = (catalog: Pick<BuiltModuleInput, "components"> | ModuleFragment) =>
  sortBy([...catalog.components], (component) => component.name).map((component) => ({
    name: component.name,
    description: component.description ?? null,
    acceptsChildren: component.acceptsChildren ?? true,
    context: component.context ?? ComponentContext.Panel,
    childrenContext: component.childrenContext ?? null,
    downstreamOf: [...(component.downstreamOf ?? [])].sort(),
    notDownstreamOf: [...(component.notDownstreamOf ?? [])].sort(),
    props: canonicalProps(component.props as ReadonlyArray<RemoteProp | LocalProp>),
  }));

/**
 * True when the server's copy already carries exactly what we would register, so the
 * startup registrar can skip the mutation. A module the server emptied (a catalog stored
 * before props were ports) differs, and is registered again.
 */
export const moduleMatches = (remote: ModuleFragment | null | undefined, input: BuiltModuleInput): boolean => {
  if (!remote || !remote.isRegistered || remote.name !== input.name) return false;
  if ((remote.description ?? null) !== (input.description ?? null)) return false;
  if (JSON.stringify([...remote.catalogs].sort()) !== JSON.stringify([...input.catalogs].sort())) return false;
  // A copy registered when modules still carried operations is out of date: it is sent again.
  if ((remote.operations ?? []).length !== input.operations.length) return false;
  return JSON.stringify(canonicalize(remote)) === JSON.stringify(canonicalize(input));
};
