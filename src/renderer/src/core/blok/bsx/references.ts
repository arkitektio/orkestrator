import type {
  BlokActionArgument,
  BlokAgentCall,
  BlokComponentNode,
  BlokComponentProp,
  BlokUtilCall,
} from '../renderer/runtime/types';
import {defaultBlokView, type BlokView, type SpecComponent} from '../spec/catalogs';
import {valueFitsPort} from '../spec/locals';
import {LOCAL_ANY, resolveBlokScope} from './infer';
import {
  argFits,
  finding,
  loadVocabulary,
  type BlokFinding,
  type BlokKind,
  type BlokVocabulary,
  type DiagnosticFields,
  type VocabRecordField,
} from '../spec/vocabulary';

/**
 * The v2 validator: a blok's tree against what it declares, its kind, and the
 * catalogs that draw it. The port of arkitekt-spec's
 * `declare/blok/validate.py` (with `walk.py`), held to the `checked` cases of
 * the corpus (`core/blok/spec/bsx_v2.json`). The server runs the same rules on
 * save; here they mark the source while the author types.
 *
 * Every rule is a row of the vocabulary's diagnostic table, driven by its
 * data: the one reserved list, the per-kind root matrix, the record shapes,
 * the function signatures and the theme.
 */

/* -------------------------------------------------------------------------- */
/* The scope: the corpus' `scope` shape                                       */
/* -------------------------------------------------------------------------- */

/** A port match, as the server's `PortMatchInput` spells it (snake_case, nulls allowed). */
export type BlokPortMatch = {
  key?: string | null;
  kind?: string | null;
  identifier?: string | null;
  nullable?: boolean | null;
  children?: readonly BlokPortMatch[] | null;
};

export type BlokScopeActionDependency = {
  key: string;
  demand?: {arg_matches?: readonly BlokPortMatch[] | null; return_matches?: readonly BlokPortMatch[] | null} | null;
};

export type BlokScopeStateDependency = {
  key: string;
  demand?: {matches?: readonly BlokPortMatch[] | null} | null;
};

/** A dependency of the blok; `self` types `self`. No `*_dependencies` (null) means any. */
export type BlokScopeDependency = {
  key: string;
  action_dependencies?: readonly BlokScopeActionDependency[] | null;
  state_dependencies?: readonly BlokScopeStateDependency[] | null;
};

/** A choice a local's port offers. */
export type BlokScopeLocalChoice = {value: unknown; label?: string | null; description?: string | null};

/** A local's port (an `ArgPortInput`): what it holds, its fields for a dict or model, its item for a list. */
export type BlokScopeLocalPort = {
  key: string;
  kind: string;
  identifier?: string | null;
  nullable?: boolean | null;
  default?: unknown;
  children?: readonly BlokScopeLocalPort[] | null;
  choices?: readonly BlokScopeLocalChoice[] | null;
  label?: string | null;
  description?: string | null;
};

/**
 * A local (vocabulary `locals`): an arg port plus `persist`. Its kind is a
 * port kind or `ANY`; left out (absent or null), it is inferred from the tree
 * (`resolveBlokScope`), and a given kind, `ANY` included, is kept.
 */
export type BlokScopeLocal = Omit<BlokScopeLocalPort, 'kind'> & {kind?: string | null; persist?: boolean | null};

/** A local after inference: its kind always said. */
export type ResolvedBlokLocal = BlokScopeLocalPort & {persist?: boolean | null};

export type BlokScopeQuery = {
  key: string;
  service?: string | null;
  document?: string | null;
  /** The variables, as stored arguments (`parseBsxArgument`). */
  variables?: readonly BlokActionArgument[] | null;
  poll?: number | null;
  /** The list field `fetch_more` appends to; a query without it cannot fetch more. */
  more?: string | null;
};

export type BlokScopeSubscription = {
  key: string;
  service?: string | null;
  document?: string | null;
  variables?: readonly BlokActionArgument[] | null;
  keep?: number | null;
  history?: string | null;
};

/** What a blok declares beside its tree; the corpus' `scope` verbatim. */
export type BlokCheckScope = {
  kind: BlokKind;
  /** `HTML`, `SCENE`, `OVERLAY`, `LOGO`, or `ACTION_LOGO` (drawn as a logo). */
  context: string;
  dependencies: readonly BlokScopeDependency[];
  locals: readonly BlokScopeLocal[];
  queries: readonly BlokScopeQuery[];
  subscriptions: readonly BlokScopeSubscription[];
  /** The keys `args.<key>` may read; null reads any. */
  args: readonly string[] | null;
  /** The standard catalogs the blok declares (`ui@1`); none declared checks none. */
  catalogs: readonly string[];
  /** The module (an app's own extras) the blok names, if any. */
  module?: string | null;
  /** Per declared query, the shape of its value when its service's schema is known. */
  query_values?: Readonly<Record<string, BlokPortMatch>>;
  /** The assets `self.assets.<name>` may name; null (or absent) names any. */
  assets?: readonly string[] | null;
  /** Preview data, for the logo's foreach limit. */
  demo?: {deps?: unknown; args?: unknown; task?: unknown} | null;
};

/** A scope after inference: every local kinded (dependencies are never inferred). */
export type ResolvedBlokScope = Omit<BlokCheckScope, 'locals'> & {locals: readonly ResolvedBlokLocal[]};

export const emptyBlokScope = (kind: BlokKind = 'agent', context = 'HTML'): BlokCheckScope => ({
  kind,
  context,
  dependencies: [],
  locals: [],
  queries: [],
  subscriptions: [],
  args: null,
  catalogs: [],
});

const ACTION_LOGO = 'ACTION_LOGO';
const LOGO = 'LOGO';
const SCENE = 'SCENE';

/** The context a scope's components are drawn in: an action logo's is a logo's. */
export const drawnIn = (scope: BlokCheckScope): string => (scope.context === ACTION_LOGO ? LOGO : scope.context);

/** The root component a blok of ``context`` starts with (`HTML` → `Html`): a blok's root names its context. */
export const blokRootOf = (context: string): string | null =>
  Object.entries(loadVocabulary().blokRoots).find(([, named]) => named === context)?.[0] ?? null;

/** The blok context a root component names (`Overlay` → `OVERLAY`), or null when it names none. */
export const blokContextOf = (component: string): string | null => loadVocabulary().blokRoots[component] ?? null;

/* -------------------------------------------------------------------------- */
/* Matches                                                                    */
/* -------------------------------------------------------------------------- */

const OPEN_IDENTIFIER = '*';
const ITEM = '...';
const TOAST_COMPONENT = 'Toast';
const TOAST_TASK_PROP = 'task';
const CLASS_NAME = 'className';
const FOREACH = 'foreach';
const FOREACH_LET = 'let';
const FOREACH_ITEMS = 'items';
const FOREACH_KEY = 'key';
/** An item of these kinds is no scalar: a foreach over it without key is keyed by position (`foreach.position_key`). */
const COMPOUND_KINDS: ReadonlySet<string> = new Set(['DICT', 'MODEL', 'LIST', 'UNION']);
const RETURNS_FIELD = 'returns';
const UNNAMED_RETURN = /^return[0-9]+$/;
const SUSPENSE = 'suspense';
const ERROR_SLOT = 'error';
const WHEN_PROP = 'when';
const BIND_PROP = 'bind';
const CALLBACK_KIND = 'CALLBACK';
const ASSET_KIND = 'ASSET';
const REFETCH_FUNCTION = 'query.refetch';
const FETCH_MORE_FUNCTION = 'query.fetch_more';
/** Per query effect, the method BSX writes it as. */
const VERBS: Readonly<Record<string, string>> = {[REFETCH_FUNCTION]: 'refetch', [FETCH_MORE_FUNCTION]: 'fetch_more'};
/** Port kinds whose fields the port does not declare: a path below such a local is taken as written. */
const OPAQUE_KINDS: ReadonlySet<string> = new Set(['STRUCTURE', 'MEMORY_STRUCTURE', 'INTERFACE', 'UNION']);
const LITERAL_KINDS: readonly string[] = ['BOOL', 'INT', 'FLOAT'];

type Match = BlokPortMatch | null;

const openMatch = (key: string | null): BlokPortMatch => ({key, identifier: OPEN_IDENTIFIER});
const isOpen = (match: Match): boolean => match !== null && match.identifier === OPEN_IDENTIFIER;

const recordMatch = (
  key: string,
  fields: readonly VocabRecordField[],
  overrides?: Readonly<Record<string, BlokPortMatch>>,
): BlokPortMatch => ({
  key,
  kind: 'DICT',
  children: fields.map(field => {
    const override = overrides?.[field.key];
    if (override) return {...override, key: field.key};
    if (field.children) return {...recordMatch(field.key, field.children), nullable: field.nullable || null};
    if (field.kind === 'DICT' || field.kind === 'ANY' || field.kind === 'LIST') return openMatch(field.key);
    return {key: field.key, kind: field.kind, nullable: field.nullable || null};
  }),
});

const taskRecordMatch = (key: string, returns?: readonly BlokPortMatch[] | null): BlokPortMatch =>
  recordMatch(
    key,
    loadVocabulary().records.task.fields,
    returns && returns.length ? {returns: {key: 'returns', kind: 'DICT', children: returns}} : undefined,
  );

/* -------------------------------------------------------------------------- */
/* Walking                                                                    */
/* -------------------------------------------------------------------------- */

/** Where a value sits: the node, the prop, and which scoped roots are in force there. */
type Where = {node: BlokComponentNode; key: string; callback: boolean; inError: boolean};

const whereText = (where: Where): string => `${where.key} of <${where.node.component}> (${where.node.id})`;
const nodeContext = (node: BlokComponentNode): string => `<${node.component}> (${node.id})`;
const actionKeyFor = (call: BlokAgentCall): string => call.operation.split('.').pop() ?? call.operation;

const isEffect = (call: BlokUtilCall): boolean => loadVocabulary().functions.get(call.operation)?.effect === true;

/** Whether a prop holds a callback's one thing: a task call or an effect (`query.refetch` too). */
export const isCallbackValue = (prop: BlokComponentProp): boolean =>
  prop.agent_call != null || (prop.util_call != null && isEffect(prop.util_call));

/** A local's port as a match: its kind, identifier and fields. */
const portMatch = (port: BlokScopeLocalPort): BlokPortMatch => ({
  key: port.key,
  kind: port.kind,
  identifier: port.identifier ?? null,
  nullable: port.nullable ?? null,
  children: port.children?.length ? port.children.map(portMatch) : null,
});

/** Every name a task call writes its record to (`... into move`), with each call site. */
export const intoSites = (node: BlokComponentNode): Map<string, Array<{call: BlokAgentCall; site: string}>> => {
  const found = new Map<string, Array<{call: BlokAgentCall; site: string}>>();
  const visit = (current: BlokComponentNode) => {
    for (const prop of current.props ?? []) {
      if (prop.agent_call && prop.declares_value) {
        const sites = found.get(prop.declares_value) ?? [];
        sites.push({call: prop.agent_call, site: `${prop.key} of ${nodeContext(current)}`});
        found.set(prop.declares_value, sites);
      }
    }
    current.children?.forEach(visit);
  };
  visit(node);
  return found;
};

/** The loop variable a `foreach` declares. */
export const foreachLet = (node: BlokComponentNode): string | null => {
  if (node.component !== FOREACH) return null;
  return node.props?.find(prop => prop.key === FOREACH_LET && prop.declares_value)?.declares_value ?? null;
};

const iterNodes = (node: BlokComponentNode): BlokComponentNode[] => [node, ...(node.children ?? []).flatMap(iterNodes)];

/** Every path a list of arguments reads (a query's variables), depth first. */
const argumentPaths = (args: readonly BlokActionArgument[]): string[] => {
  const paths: string[] = [];
  const visit = (argument: BlokActionArgument) => {
    if (argument.value_path != null) paths.push(argument.value_path);
    for (const call of [argument.util_call, argument.agent_call]) call?.arguments?.forEach(visit);
    [...(argument.value_list ?? []), ...(argument.value_dict ?? [])].forEach(visit);
  };
  args.forEach(visit);
  return paths;
};

type Scope = ReadonlyMap<string, Match>;

/* -------------------------------------------------------------------------- */
/* The checker                                                                */
/* -------------------------------------------------------------------------- */

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const colourPattern = (vocabulary: BlokVocabulary): RegExp => {
  const utilities = [...vocabulary.theme.colourUtilities].sort((a, b) => b.length - a.length).map(escapeRegExp).join('|');
  const colours = vocabulary.theme.paletteColours.join('|');
  return new RegExp(`^(?<utility>${utilities})-(?<colour>${colours})(?:-(?<shade>\\d{2,3}))?(?:/\\d+)?$`);
};

const ARBITRARY_COLOUR = /^(?<utility>bg|text|border|ring|fill|stroke|from|via|to|outline|decoration|shadow)-\[(#|rgb|hsl|oklch|color)/;
const DIGITS = /^[0-9]+$/;

/**
 * What a blok of `kind` that reads an undeclared `deps.<key>` does about it
 * (the spec's `dependency_hint`):
 * - a custom or task blok declares it, to copy as it is: `dependencies=[AgentDependencyInput(key="laser")]`;
 * - an action blok's dependencies are its action's: ``add a dependency parameter `laser` to the action``;
 * - an agent blok has none: ``agent bloks read only `self` ``.
 */
export const dependencyHint = (key: string, kind: BlokKind): string => {
  if (kind === 'action' || kind === 'action_logo') return `add a dependency parameter \`${key}\` to the action`;
  if (kind === 'agent') return 'agent bloks read only `self`';
  return `dependencies=[AgentDependencyInput(key="${key}")]`;
};

/** How a string on a typed prop is written as the literal it meant (`fullWidth={true}`): the spec's `literal_hint`. */
export const literalHint = (key: string, value: string, kind: string): string => {
  const written = value.trim();
  let literal: string;
  if (kind === 'BOOL') {
    const lower = written.toLowerCase();
    literal = lower === 'true' || lower === 'false' ? lower : 'true';
  } else {
    const parsed = written === '' ? Number.NaN : Number(written);
    const number = Number.isFinite(parsed) ? parsed : 0;
    if (kind === 'INT') literal = String(Math.trunc(number));
    else literal = Number.isInteger(number) && !written.includes('.') ? String(Math.trunc(number)) : pythonFloat(number);
  }
  return `${key}={${literal}}`;
};

/** A float as Python's `repr` writes it (`1.0`, `0.5`, `1e+20`). */
const pythonFloat = (value: number): string => {
  if (Number.isInteger(value) && Math.abs(value) < 1e16) return `${value}.0`;
  return String(value);
};

const article = (kind: string): string => ('aeiou'.includes(kind[0] ?? '') ? 'n' : '');

const pythonRepr = (value: unknown): string => {
  if (typeof value === 'string') return `'${value}'`;
  if (value === null || value === undefined) return 'None';
  if (value === true) return 'True';
  if (value === false) return 'False';
  return JSON.stringify(value);
};

const what = (prop: BlokComponentProp): string => {
  if (prop.agent_call) return 'a task call';
  if (prop.util_call) return prop.util_call.operation;
  if (prop.dynamic_value) return `the path ${prop.dynamic_value.path ?? ''}`;
  return `the value ${pythonRepr(prop.static_value)}`;
};

/** Every literal string of a `str.classes` call: list entries, object keys, branches. */
const classLiterals = (call: BlokUtilCall): string[] => {
  const literals: string[] = [];
  const visit = (args: readonly BlokActionArgument[]) => {
    for (const argument of args) {
      if (typeof argument.value_literal === 'string') literals.push(argument.value_literal);
      for (const nested of argument.value_dict ?? []) if (nested.key) literals.push(nested.key);
      if (argument.util_call) visit(argument.util_call.arguments ?? []);
      visit(argument.value_list ?? []);
    }
  };
  visit(call.arguments ?? []);
  return literals;
};

const stateMatch = (state: BlokScopeStateDependency): BlokPortMatch => ({
  key: state.key,
  kind: 'DICT',
  children: state.demand?.matches ?? null,
});

const argumentWhat = (argument: BlokActionArgument): string => {
  if (argument.value_path != null) return `the path ${argument.value_path}`;
  if (argument.util_call) return `a call of ${argument.util_call.operation}`;
  if (argument.value_list != null || argument.value_dict != null) return 'a list or object';
  return `the value ${pythonRepr(argument.value_literal)}`;
};

class Checker {
  readonly findings: BlokFinding[] = [];
  private readonly vocabulary = loadVocabulary();
  private readonly kind;
  private readonly dependencies: Map<string, BlokScopeDependency>;
  private readonly locals: Map<string, ResolvedBlokLocal>;
  private readonly queries: Map<string, BlokScopeQuery>;
  private readonly subscriptions: Map<string, BlokScopeSubscription>;
  private readonly boundLocals = new Set<string>();
  private readonly into = new Set<string>();
  private readonly shadowed = new Set<string>();
  private readonly colour: RegExp;

  constructor(
    readonly scope: ResolvedBlokScope,
    readonly view: BlokView | null,
  ) {
    this.kind = this.vocabulary.kinds[scope.kind];
    this.dependencies = new Map(scope.dependencies.map(dependency => [dependency.key, dependency]));
    this.locals = new Map(scope.locals.map(local => [local.key, local]));
    this.queries = new Map(scope.queries.map(query => [query.key, query]));
    this.subscriptions = new Map(scope.subscriptions.map(subscription => [subscription.key, subscription]));
    this.colour = colourPattern(this.vocabulary);
  }

  add(code: string, nodeId: string | null, fields: DiagnosticFields = {}, propKey?: string): void {
    this.findings.push(finding(code, fields, {...(nodeId !== null ? {nodeId} : {}), ...(propKey !== undefined ? {propKey} : {})}));
  }

  private rootsText(): string {
    return [...this.kind.roots].sort().join(', ');
  }

  private notInKind(nodeId: string | null, path: string, root: string, propKey?: string): void {
    this.add('roots.not_in_kind', nodeId, {path, n: article(this.scope.kind), kind: this.scope.kind, root, roots: this.rootsText()}, propKey);
  }

  /* -- declarations -- */

  checkDeclarations(tree: BlokComponentNode): void {
    const {vocabulary, scope} = this;
    const drawn = drawnIn(scope);
    const wrongLogo = (scope.context === ACTION_LOGO) !== (scope.kind === 'action_logo');
    if (wrongLogo || !(this.kind.contexts as readonly string[]).includes(drawn)) {
      this.add('context.kind', null, {n: article(scope.kind), kind: scope.kind, contexts: this.kind.contexts.join(', '), context: scope.context});
    }
    const root = blokRootOf(scope.context);
    if (root && tree.component !== root) {
      this.add('context.root', tree.id, {context: scope.context.toLowerCase(), root, component: tree.component});
    }
    if (scope.locals.length && !this.kind.locals) this.notInKind(null, 'locals', 'locals');
    for (const local of scope.locals) {
      if (vocabulary.reserved.has(local.key)) this.add('roots.reserved', `locals.${local.key}`, {name: local.key});
      this.checkLocalDefault(local);
    }
    for (const [name, sites] of intoSites(tree)) {
      this.into.add(name);
      if (vocabulary.reserved.has(name)) this.add('roots.reserved', sites[0].site, {name});
      if (this.locals.has(name)) this.add('roots.shadow', sites[0].site, {name, first: 'a local', second: `the record of ${sites[0].site}`});
      if (sites.length > 1) this.add('into.twice', sites[1].site, {name, first: sites[0].site, second: sites[1].site});
    }
    for (const node of iterNodes(tree)) {
      const declared = foreachLet(node);
      if (declared === null) continue;
      if (vocabulary.reserved.has(declared)) this.add('roots.reserved', node.id, {name: declared});
      else if (this.locals.has(declared) || this.into.has(declared)) {
        this.add('roots.shadow', node.id, {
          name: declared,
          first: this.locals.has(declared) ? 'a local' : "a call's record",
          second: `the let of <foreach> (${node.id})`,
        });
      }
    }
    for (const query of scope.queries) {
      for (const path of argumentPaths(query.variables ?? [])) this.resolve(path, null, new Map(), `query ${query.key}`);
    }
    for (const subscription of scope.subscriptions) {
      for (const path of argumentPaths(subscription.variables ?? [])) this.resolve(path, null, new Map(), `subscription ${subscription.key}`);
      if (subscription.history != null && !this.queries.has(subscription.history)) {
        this.add('query.history', `subscriptions.${subscription.key}`, {name: subscription.key, history: subscription.history});
      }
    }
  }

  /** A local's default fits its port: a number for a number, a list for a list, one of its choices. */
  private checkLocalDefault(local: ResolvedBlokLocal): void {
    if (local.kind === LOCAL_ANY) return;
    if (!valueFitsPort(local.default, local)) {
      this.add('local.default', `locals.${local.key}`, {name: local.key, default: local.default, kind: local.kind});
    }
  }

  /** The port a path into a local names (the local, or a field of it), or null when its shape does not say (an ANY local). */
  private localPort(path: string): BlokScopeLocalPort | null {
    const [root, ...rest] = path.split('.');
    const local = this.locals.get(root) ?? null;
    let port: BlokScopeLocalPort | null = local !== null && local.kind !== LOCAL_ANY ? local : null;
    for (const part of rest) {
      if (port === null) return null;
      const children: readonly BlokScopeLocalPort[] = port.children ?? [];
      let child = children.find(candidate => candidate.key === part) ?? null;
      if (!child && children.length === 1 && children[0].key === ITEM) child = children[0];
      port = child;
    }
    return port;
  }

  finish(): void {
    for (const local of this.scope.locals) {
      if (local.persist && !this.boundLocals.has(local.key)) this.add('local.unused_persist', `locals.${local.key}`, {name: local.key});
    }
  }

  /* -- the walk -- */

  walk(tree: BlokComponentNode): void {
    const scope = new Map<string, Match>();
    for (const [name, sites] of intoSites(tree)) scope.set(name, this.bindInto(sites[0].call));
    this.walkNode(tree, scope, [], false);
  }

  private walkNode(node: BlokComponentNode, scope: Scope, ancestors: readonly BlokComponentNode[], inError: boolean): void {
    this.visitComponent(node, ancestors);
    const inner = new Map(scope);
    const declared = foreachLet(node);
    if (declared !== null) {
      const items = node.props?.find(prop => prop.key === FOREACH_ITEMS) ?? null;
      inner.set(declared, this.bindLet(declared, items, {node, key: FOREACH_ITEMS, callback: false, inError}, scope));
    }
    for (const prop of node.props ?? []) {
      // A foreach reads its items outside the loop, its key inside it.
      const propScope = declared !== null && prop.key === FOREACH_ITEMS ? scope : inner;
      this.walkProp(node, prop, propScope, inError);
    }
    const inSlot = inError || (node.component === ERROR_SLOT && ancestors.length > 0 && ancestors[ancestors.length - 1].component === SUSPENSE);
    for (const child of node.children ?? []) this.walkNode(child, inner, [...ancestors, node], inSlot);
  }

  private walkProp(node: BlokComponentNode, prop: BlokComponentProp, scope: Scope, inError: boolean): void {
    const where: Where = {node, key: prop.key, callback: isCallbackValue(prop), inError};
    if (prop.dynamic_value?.path != null) this.resolve(prop.dynamic_value.path, where, scope, whereText(where));
    if (prop.agent_call) {
      this.visitAgentCall(prop.agent_call, where, scope);
      prop.agent_call.arguments?.forEach(argument => this.walkArgument(argument, scope, where));
    }
    if (prop.util_call) this.walkUtil(prop.util_call, scope, where, true);
  }

  private walkUtil(call: BlokUtilCall, scope: Scope, where: Where, top: boolean): void {
    this.visitUtilCall(call, where, top);
    call.arguments?.forEach(argument => this.walkArgument(argument, scope, where));
  }

  private walkArgument(argument: BlokActionArgument, scope: Scope, where: Where): void {
    if (argument.value_path != null) this.resolve(argument.value_path, where, scope, whereText(where));
    if (argument.agent_call) {
      this.visitAgentCall(argument.agent_call, where, scope);
      argument.agent_call.arguments?.forEach(nested => this.walkArgument(nested, scope, where));
    }
    if (argument.util_call) this.walkUtil(argument.util_call, scope, where, false);
    [...(argument.value_list ?? []), ...(argument.value_dict ?? [])].forEach(nested => this.walkArgument(nested, scope, where));
  }

  /* -- components and props -- */

  private visitComponent(node: BlokComponentNode, ancestors: readonly BlokComponentNode[]): void {
    const spec = this.view?.components.get(node.component);
    if (this.view && !spec && this.view.complete) {
      this.add('catalog.unknown_component', node.id, {component: node.component, catalogs: this.view.label});
    }
    if (spec) this.checkCatalog(node, spec, ancestors);
    const shadow = this.view?.shadows.get(node.component);
    if (shadow && !this.shadowed.has(node.component)) {
      this.shadowed.add(node.component);
      this.add('catalog.shadow', node.id, {component: node.component, catalog: shadow.catalog, module: shadow.module, winner: shadow.winner});
    }
    for (const prop of node.props ?? []) this.checkProp(node, prop, spec);
  }

  private checkCatalog(node: BlokComponentNode, spec: SpecComponent, ancestors: readonly BlokComponentNode[]): void {
    const view = this.view;
    if (!view) return;
    if (node.children?.length && !spec.acceptsChildren) this.add('catalog.children', node.id, {component: node.component});
    const present = new Set((node.props ?? []).map(prop => prop.key));
    const known = new Set([...spec.props.map(prop => prop.key), WHEN_PROP]);
    const unknown = [...present].filter(key => !known.has(key)).sort();
    if (unknown.length) this.add('catalog.props', node.id, {component: node.component, detail: `has no props [${unknown.map(pythonRepr).join(', ')}]`});
    const missing = spec.props.filter(prop => prop.required && !present.has(prop.key)).map(prop => prop.key).sort();
    if (missing.length) this.add('catalog.props', node.id, {component: node.component, detail: `requires props [${missing.map(pythonRepr).join(', ')}]`});
    let context = 'HTML';
    for (const ancestor of ancestors) {
      const above = view.components.get(ancestor.component);
      if (above && !above.inheritsContext) context = above.childrenContext ?? above.context;
    }
    if (!spec.inheritsContext && spec.context !== context) {
      this.add('catalog.placement', node.id, {
        component: node.component,
        detail: `is a ${spec.context.toLowerCase()} component, not one of the ${context.toLowerCase()} context`,
      });
    }
    const names = new Set(ancestors.map(ancestor => ancestor.component));
    if (spec.downstreamOf.length && !spec.downstreamOf.some(name => names.has(name))) {
      this.add('catalog.placement', node.id, {component: node.component, detail: `must be inside one of [${[...spec.downstreamOf].sort().map(pythonRepr).join(', ')}]`});
    }
    const forbidden = spec.notDownstreamOf.filter(name => names.has(name)).sort();
    if (forbidden.length) {
      this.add('catalog.placement', node.id, {component: node.component, detail: `must not be inside [${forbidden.map(pythonRepr).join(', ')}]`});
    }
    // Only the versioned standard catalogs are declared; a module (the Orkestrator's, an app's) is what the blok's `module` names.
    const catalog = spec.catalog;
    const standard = catalog.includes('@') && catalog.split('@')[0] in this.vocabulary.catalogs;
    if (this.scope.catalogs.length && standard && !this.scope.catalogs.includes(catalog)) {
      this.add('catalog.undeclared', node.id, {component: node.component, catalog});
    }
  }

  private checkProp(node: BlokComponentNode, prop: BlokComponentProp, spec: SpecComponent | undefined): void {
    const {vocabulary} = this;
    const propSpec = spec?.props.find(candidate => candidate.key === prop.key);
    const holds = isCallbackValue(prop);
    const hasValue =
      prop.static_value != null || prop.dynamic_value != null || prop.util_call != null || prop.agent_call != null;
    if (propSpec) {
      if (propSpec.kind === CALLBACK_KIND && hasValue && !holds) {
        this.add('callback.unbound', node.id, {key: prop.key, component: node.component}, prop.key);
      } else if (propSpec.kind !== CALLBACK_KIND && holds) {
        this.add('callback.not_callback', node.id, {key: prop.key, component: node.component, what: what(prop)}, prop.key);
      }
      if (LITERAL_KINDS.includes(propSpec.kind) && typeof prop.static_value === 'string' && prop.key !== BIND_PROP) {
        this.add(
          'props.literal_type',
          node.id,
          {component: node.component, key: prop.key, value: prop.static_value, kind: propSpec.kind, hint: literalHint(prop.key, prop.static_value, propSpec.kind)},
          prop.key,
        );
      }
      if (propSpec.kind === ASSET_KIND) {
        const parts = (prop.dynamic_value?.path ?? '').split('.');
        const agent = parts[0] === 'self' ? parts.slice(1) : parts[0] === 'deps' ? parts.slice(2) : [];
        if (agent.length !== 2 || agent[0] !== vocabulary.agentSegments.assets) {
          this.add('catalog.asset', node.id, {key: prop.key, component: node.component}, prop.key);
        }
      }
    }
    if (prop.util_call?.operation === 'task.answer' && !this.kind.roots.includes('task')) {
      this.notInKind(node.id, 'task.answer', 'task', prop.key);
    }
    if (prop.key === BIND_PROP) {
      const path = prop.dynamic_value?.path ?? null;
      if (path === null) {
        this.add('local.bind', node.id, {what: what(prop)}, prop.key);
      } else {
        const root = path.split('.')[0];
        if (!this.locals.has(root)) this.add('local.unknown', node.id, {path, root}, prop.key);
        else {
          this.boundLocals.add(root);
          if (propSpec) this.checkBindKind(node, propSpec.kind, path);
        }
      }
    }
    if (node.component === TOAST_COMPONENT && prop.key === TOAST_TASK_PROP) {
      const path = prop.dynamic_value?.path ?? null;
      if (path === null || (path !== 'task' && !this.into.has(path))) this.add('toast.task', node.id, {what: path ?? what(prop)}, prop.key);
    }
    if (typeof prop.static_value === 'string') {
      if (prop.key === CLASS_NAME) this.checkClasses(prop.static_value, node.id, prop.key);
      if (drawnIn(this.scope) === LOGO && vocabulary.theme.logoPaintProps.includes(prop.key)) this.checkPaint(node, prop.key, prop.static_value);
      if (spec?.context === SCENE && vocabulary.theme.scenePaintProps.includes(prop.key)) this.checkSceneColour(node, prop.key, prop.static_value);
    }
    if (prop.key === CLASS_NAME && prop.util_call) {
      for (const literal of classLiterals(prop.util_call)) this.checkClasses(literal, node.id, prop.key);
    }
  }

  /** The local a control writes is of a kind the control writes (`Slider`: FLOAT or INT). */
  private checkBindKind(node: BlokComponentNode, propKind: string, path: string): void {
    const allowed = this.vocabulary.locals.bindKinds[propKind];
    const port = this.localPort(path);
    if (!allowed || port === null) return;
    if (!allowed.includes(port.kind)) {
      this.add(
        'local.bind_kind',
        node.id,
        {key: BIND_PROP, component: node.component, prop_kind: propKind, path, kind: port.kind, kinds: [...allowed].sort().join(', ')},
        BIND_PROP,
      );
    }
  }

  private checkClasses(classes: string, owner: string, propKey: string): void {
    const hints = this.vocabulary.theme.paletteRoleHints;
    for (const token of classes.split(/\s+/).filter(Boolean)) {
      const base = (token.split(':').pop() ?? token).replace(/^!+/, '');
      const match = this.colour.exec(base);
      if (match?.groups) {
        const role = hints[match.groups.colour] ?? 'primary';
        this.add('palette.raw_colour', owner, {token, suggestion: `${match.groups.utility}-${role}`}, propKey);
        continue;
      }
      const arbitrary = ARBITRARY_COLOUR.exec(base);
      if (arbitrary?.groups) {
        this.add(
          'palette.raw_colour',
          owner,
          {token, suggestion: `${arbitrary.groups.utility}-<role> (${this.vocabulary.theme.colourRoles.slice(0, 6).join(', ')}, ...)`},
          propKey,
        );
      }
    }
  }

  private checkPaint(node: BlokComponentNode, key: string, value: string): void {
    const paint = value.trim();
    if (this.vocabulary.theme.logoPens.includes(paint) || (paint.startsWith('url(#') && paint.endsWith(')'))) return;
    this.add('palette.logo_paint', node.id, {component: node.component, prop: key, value, pens: this.vocabulary.theme.logoPens.join('|')}, key);
  }

  /** A scene paints with the theme's colour roles, resolved by the renderer against the viewer's brand. */
  private checkSceneColour(node: BlokComponentNode, key: string, value: string): void {
    const roles = this.vocabulary.theme.colourRoles;
    if (roles.includes(value.trim())) return;
    this.add('palette.scene_colour', node.id, {component: node.component, prop: key, value, roles: roles.join(', ')}, key);
  }

  /* -- calls -- */

  private visitAgentCall(call: BlokAgentCall, where: Where, scope: Scope): void {
    const owner = whereText(where);
    const action = actionKeyFor(call);
    if (call.dependency === 'self') {
      if (!this.kind.roots.includes('self')) {
        this.notInKind(where.node.id, `self.${action}(...)`, 'self', where.key);
        return;
      }
    } else if (!this.kind.roots.includes('deps')) {
      this.notInKind(where.node.id, `deps.${call.dependency}.${action}(...)`, 'deps', where.key);
      return;
    }
    const dependency = this.dependencies.get(call.dependency);
    if (!dependency) {
      if (call.dependency !== 'self') {
        this.add(
          'deps.unknown',
          where.node.id,
          {path: owner, key: call.dependency, keys: [...this.dependencies.keys()].sort().join(', ') || 'none', hint: dependencyHint(call.dependency, this.scope.kind)},
          where.key,
        );
      }
      return;
    }
    const actions = dependency.action_dependencies;
    if (actions != null && !actions.some(demand => demand.key === action)) {
      this.add(
        'deps.unknown_action',
        where.node.id,
        {path: owner, key: call.dependency, action, actions: actions.map(demand => demand.key).sort().join(', ') || 'none'},
        where.key,
      );
      return;
    }
    const demand = (actions ?? []).find(each => each.key === action)?.demand;
    if (demand?.arg_matches?.length) this.checkArgKinds(call, demand.arg_matches, where, scope);
  }

  /** A local passed whole to a task call fits the action's arg port (`arg_kinds`). */
  private checkArgKinds(call: BlokAgentCall, matches: readonly BlokPortMatch[], where: Where, scope: Scope): void {
    const ports = new Map(matches.flatMap(match => (match.key != null ? [[match.key, match] as const] : [])));
    const name = call.dependency === 'self' ? `self.${call.operation}` : `deps.${call.dependency}.${call.operation}`;
    for (const argument of call.arguments ?? []) {
      const path = argument.value_path;
      const match = ports.get(argument.key ?? '');
      if (path == null || !match || match.kind == null) continue;
      const root = path.split('.')[0];
      if (scope.has(root) || !this.locals.has(root)) continue;
      const port = this.localPort(path);
      if (port === null) continue;
      const target = {kind: match.kind, identifier: match.identifier ?? null};
      if (!argFits(port, target)) {
        const otherStructure = port.kind === 'STRUCTURE' && match.kind === 'STRUCTURE';
        this.add(
          'local.arg_kind',
          where.node.id,
          {
            call: name,
            argument: argument.key,
            port_kind: otherStructure ? `${match.kind} ${match.identifier ?? ''}` : match.kind,
            path,
            kind: otherStructure ? `${port.kind} ${port.identifier ?? ''}` : port.kind,
          },
          where.key,
        );
      }
    }
  }

  private visitUtilCall(call: BlokUtilCall, where: Where, top: boolean): void {
    const functions = this.view?.functions ?? this.vocabulary.functions;
    const fn = functions.get(call.operation);
    if (!fn) {
      if (!this.vocabulary.functionNamespaces.includes(call.operation.split('.')[0]) || !call.operation.includes('.')) {
        this.add('expr.unknown_callee', where.node.id, {callee: call.operation}, where.key);
      } else if (this.view) {
        this.add('expr.unknown_function', where.node.id, {function: call.operation}, where.key);
      }
      return;
    }
    if (fn.effect && !top) this.add('callback.nested', where.node.id, {what: call.operation}, where.key);
    if (call.operation in VERBS && top) this.checkQueryEffect(call, where);
    const keys = new Set((call.arguments ?? []).map(argument => argument.key).filter((key): key is string => key != null));
    const unknown = [...keys].filter(key => !fn.keys.includes(key) && !DIGITS.test(key)).sort();
    if (unknown.length) {
      this.add('expr.arguments', where.node.id, {function: call.operation, detail: `has no argument '${unknown[0]}' (${fn.keys.join(', ')})`}, where.key);
    }
    const missing = fn.requiredKeys.filter(key => !keys.has(key));
    if (missing.length) this.add('expr.arguments', where.node.id, {function: call.operation, detail: `needs ${missing.join(', ')}`}, where.key);
  }

  /** `query.refetch` / `query.fetch_more`: a declared query, named by a literal; fetch_more only of one that declares `more`. */
  private checkQueryEffect(call: BlokUtilCall, where: Where): void {
    const verb = VERBS[call.operation];
    const named = (call.arguments ?? []).find(argument => argument.key === 'query');
    if (!named) return; // expr.arguments says it is missing
    const name = named.value_literal;
    if (typeof name !== 'string' || named.value_path != null || named.util_call != null || named.value_list != null || named.value_dict != null) {
      this.add('query.effect_target', where.node.id, {function: call.operation, verb, what: argumentWhat(named)}, where.key);
      return;
    }
    const path = `queries.${name}.${verb}()`;
    if (!this.kind.roots.includes('queries')) {
      this.notInKind(where.node.id, path, 'queries', where.key);
      return;
    }
    const query = this.queries.get(name);
    if (!query) {
      this.add('query.unknown', where.node.id, {path, name, names: [...this.queries.keys()].sort().join(', ') || 'none'}, where.key);
      return;
    }
    if (call.operation === FETCH_MORE_FUNCTION && query.more == null) this.add('query.fetch_more', where.node.id, {path, name}, where.key);
  }

  private bindLet(name: string, items: BlokComponentProp | null, where: Where, scope: Scope): Match {
    const keyed = (where.node.props ?? []).some(prop => prop.key === FOREACH_KEY);
    const literal = items?.static_value;
    if (!keyed && Array.isArray(literal) && literal.some(item => typeof item === 'object' && item !== null)) {
      this.add('foreach.position_key', where.node.id, {let: name});
    }
    const path = items?.dynamic_value?.path;
    if (path == null) return openMatch(name);
    const resolved = this.resolve(path, null, scope, whereText(where), where);
    if (resolved === null || isOpen(resolved)) return openMatch(name);
    const children = resolved.children ?? [];
    if (children.length === 1 && children[0].key === ITEM) {
      const item = children[0];
      if (!keyed && (item.children?.length || (item.kind != null && COMPOUND_KINDS.has(item.kind)))) {
        this.add('foreach.position_key', where.node.id, {let: name});
      }
      return {...item, key: name};
    }
    if (resolved.kind == null || resolved.kind === 'LIST') return openMatch(name);
    this.add('path.unknown', where.node.id, {path, detail: `${FOREACH_ITEMS} of a foreach reads a list, not this ${resolved.kind.toLowerCase()}`}, FOREACH_ITEMS);
    return openMatch(name);
  }

  private bindInto(call: BlokAgentCall): Match {
    const dependency = this.dependencies.get(call.dependency);
    const action = actionKeyFor(call);
    let returns: readonly BlokPortMatch[] | null = null;
    for (const demand of dependency?.action_dependencies ?? []) {
      if (demand.key === action && demand.demand) returns = demand.demand.return_matches ?? null;
    }
    return taskRecordMatch('record', returns);
  }

  /* -- paths -- */

  /**
   * What `path` holds, recording a finding (and returning null) when it holds
   * nothing. `where` is null for a query's variables and a foreach's items
   * (no callback, no error slot); `at` then names the node for the finding.
   */
  resolve(path: string, where: Where | null, scope: Scope, owner: string, at?: Where): Match {
    const {vocabulary} = this;
    const place = where ?? at ?? null;
    const nodeId = place ? place.node.id : owner;
    const propKey = place?.key;
    const parts = path.split('.');
    const [root, ...rest] = parts;
    const report = (code: string, fields: DiagnosticFields) => this.add(code, nodeId, fields, propKey);
    if (scope.has(root)) {
      if (this.into.has(root)) this.checkReturns(path, rest, nodeId, propKey);
      return this.descend(scope.get(root) ?? null, rest, path, nodeId, propKey);
    }
    const local = this.locals.get(root);
    if (local) {
      if (local.kind === LOCAL_ANY || OPAQUE_KINDS.has(local.kind)) return openMatch(root);
      return this.descend({...portMatch(local), key: root}, rest, path, nodeId, propKey);
    }
    if (root === 'event') {
      if (!where || !where.callback) {
        report('roots.event_outside_callback', {path});
        return null;
      }
      return this.eventField(rest, where);
    }
    if (root === 'error') {
      if (!where || !where.inError) {
        report('roots.error_outside_boundary', {path});
        return null;
      }
      return this.descend(recordMatch('error', vocabulary.records.error.fields), rest, path, nodeId, propKey);
    }
    if (!(root in vocabulary.dataRoots)) {
      const namespace = vocabulary.functionNamespaces.includes(root);
      report('roots.unknown', {path, root: namespace ? `${root} (a function namespace)` : root});
      return null;
    }
    if (!this.kind.roots.includes(root)) {
      this.notInKind(nodeId, path, root, propKey);
      return null;
    }
    switch (root) {
      case 'then':
        if (rest.length) report('path.unknown', {path, detail: 'then is a moment (null while live), it has no fields'});
        return {key: 'then', kind: 'STRING', nullable: true};
      case 'self':
        return this.agent(this.dependencies.get('self') ?? null, 'self', rest, path, nodeId, propKey);
      case 'deps': {
        if (!rest.length) {
          report('roots.whole', {path, root: 'deps'});
          return null;
        }
        const dependency = this.dependencies.get(rest[0]);
        if (!dependency) {
          report('deps.unknown', {path, key: rest[0], keys: [...this.dependencies.keys()].sort().join(', ') || 'none', hint: dependencyHint(rest[0], this.scope.kind)});
          return null;
        }
        return this.agent(dependency, rest[0], rest.slice(1), path, nodeId, propKey);
      }
      case 'args':
        if (!rest.length) {
          report('roots.whole', {path, root: 'args'});
          return null;
        }
        if (this.scope.args !== null && !this.scope.args.includes(rest[0])) {
          report('args.unknown', {path, key: rest[0], keys: this.scope.args.join(', ') || 'none'});
          return null;
        }
        return openMatch(path);
      case 'task':
        this.checkReturns(path, rest, nodeId, propKey);
        return this.descend(taskRecordMatch('task'), rest, path, nodeId, propKey);
      case 'viewer':
        return this.descend(recordMatch('viewer', vocabulary.records.viewer.fields), rest, path, nodeId, propKey);
      case 'queries': {
        if (!rest.length) {
          report('roots.whole', {path, root: 'queries'});
          return null;
        }
        if (!this.queries.has(rest[0])) {
          report('query.unknown', {path, name: rest[0], names: [...this.queries.keys()].sort().join(', ') || 'none'});
          return null;
        }
        const value = this.scope.query_values?.[rest[0]];
        const match = recordMatch(rest[0], vocabulary.records.query.fields, value ? {value} : undefined);
        return this.descend(match, rest.slice(1), path, nodeId, propKey);
      }
      case 'subscriptions':
        if (!rest.length) {
          report('roots.whole', {path, root: 'subscriptions'});
          return null;
        }
        if (!this.subscriptions.has(rest[0])) {
          report('subscription.unknown', {path, name: rest[0], names: [...this.subscriptions.keys()].sort().join(', ') || 'none'});
          return null;
        }
        return this.descend(recordMatch(rest[0], vocabulary.records.subscription.fields), rest.slice(1), path, nodeId, propKey);
      default:
        return openMatch(path);
    }
  }

  /** `<record>.returns.return0`: a return the action left unnamed (a warning). */
  private checkReturns(path: string, rest: readonly string[], nodeId: string, propKey: string | undefined): void {
    if (rest.length > 1 && rest[0] === RETURNS_FIELD && UNNAMED_RETURN.test(rest[1])) {
      this.add('returns.unnamed', nodeId, {path, port: rest[1]}, propKey);
    }
  }

  private eventField(rest: readonly string[], where: Where): Match {
    const prop = this.view?.components.get(where.node.component)?.props.find(candidate => candidate.key === where.key);
    if (!prop || prop.event === null || !rest.length) return openMatch('event');
    const fields = prop.event.map(field => field.key);
    if (!fields.includes(rest[0])) {
      this.add(
        'callback.event_field',
        where.node.id,
        {field: rest[0], key: where.key, component: where.node.component, fields: fields.join(', ') || 'none'},
        where.key,
      );
      return null;
    }
    return openMatch(rest[0]);
  }

  /** What a path below an agent (`self`, `deps.<key>`) holds. */
  private agent(
    dependency: BlokScopeDependency | null,
    key: string,
    rest: readonly string[],
    path: string,
    nodeId: string,
    propKey: string | undefined,
  ): Match {
    const {agentSegments} = this.vocabulary;
    if (!rest.length) return openMatch(key);
    const [head, ...tail] = rest;
    const report = (code: string, fields: DiagnosticFields) => this.add(code, nodeId, fields, propKey);
    if (head in agentSegments.fields) {
      if (tail.length) report('path.unknown', {path, detail: `${head} of an agent has no fields`});
      return {key: head, kind: 'STRING'};
    }
    if (head === agentSegments.tasks) {
      if (!tail.length) {
        report('roots.whole', {path, root: `${key}.tasks`});
        return null;
      }
      const action = tail[0];
      let returns: readonly BlokPortMatch[] | null = null;
      if (dependency?.action_dependencies != null) {
        const demand = dependency.action_dependencies.find(candidate => candidate.key === action);
        if (!demand) {
          report('deps.unknown_action', {
            path,
            key,
            action,
            actions: dependency.action_dependencies.map(candidate => candidate.key).sort().join(', ') || 'none',
          });
          return null;
        }
        returns = demand.demand?.return_matches ?? null;
      }
      this.checkReturns(path, tail.slice(1), nodeId, propKey);
      return this.descend(taskRecordMatch(action, returns), tail.slice(1), path, nodeId, propKey);
    }
    if (head === agentSegments.assets) {
      if (tail.length !== 1 || (key === 'self' && this.scope.assets != null && !this.scope.assets.includes(tail[0]))) {
        report('deps.asset', {path});
        return null;
      }
      return {key: tail[0], kind: 'STRING'};
    }
    if (!dependency || dependency.state_dependencies == null) return openMatch(path);
    const state = dependency.state_dependencies.find(candidate => candidate.key === head);
    if (!state) {
      report('deps.unknown_state', {
        path,
        key,
        state: head,
        states: dependency.state_dependencies.map(candidate => candidate.key).sort().join(', ') || 'none',
      });
      return null;
    }
    return this.descend(stateMatch(state), tail, path, nodeId, propKey);
  }

  /** Follow `rest` down `match`'s children. */
  private descend(match: Match, rest: readonly string[], path: string, nodeId: string, propKey: string | undefined): Match {
    let current = match;
    for (let index = 0; index < rest.length; index += 1) {
      const part = rest[index];
      if (current === null || isOpen(current)) return current;
      const children = current.children ?? [];
      let child = children.find(candidate => candidate.key === part) ?? null;
      if (!child && children.length === 1 && children[0].key === ITEM) child = children[0];
      if (!child) {
        const available = children.map(candidate => candidate.key).filter((key): key is string => key != null && key !== ITEM).sort();
        const whereText = rest.slice(0, index).join('.') || current.key || 'it';
        const detail = `'${part}' does not exist in ${whereText}${available.length ? ` (it has: ${available.join(', ')})` : ' (it has no fields)'}`;
        this.add('path.unknown', nodeId, {path, detail}, propKey);
        return null;
      }
      current = child;
    }
    return current;
  }
}

/* -------------------------------------------------------------------------- */
/* Logos                                                                      */
/* -------------------------------------------------------------------------- */

const demoItems = (prop: BlokComponentProp, demo: BlokCheckScope['demo']): number => {
  if (Array.isArray(prop.static_value)) return prop.static_value.length;
  const path = prop.dynamic_value?.path;
  if (path == null || !demo) return 0;
  const parts = path.split('.');
  const record = (value: unknown): Record<string, unknown> | null =>
    typeof value === 'object' && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
  let value: unknown;
  let rest: string[];
  if (parts[0] === 'self') {
    value = record(demo.deps)?.self;
    rest = parts.slice(1);
  } else if (parts[0] === 'deps') {
    value = demo.deps;
    rest = parts.slice(1);
  } else {
    value = parts[0] === 'task' ? demo.task : parts[0] === 'args' ? demo.args : undefined;
    rest = parts.slice(1);
  }
  for (const part of rest) {
    const container = record(value);
    if (!container || !(part in container)) return 0;
    value = container[part];
  }
  return Array.isArray(value) ? value.length : 0;
};

/** A logo is an icon: few nodes, shallow, little path data, and loops over few items. */
export const checkLogo = (tree: BlokComponentNode, demo?: BlokCheckScope['demo']): BlokFinding[] => {
  const {limits} = loadVocabulary();
  const findings: BlokFinding[] = [];
  let nodes = 0;
  let pathData = 0;
  const visit = (current: BlokComponentNode, depth: number) => {
    nodes += 1;
    if (depth > limits.logoMaxDepth) {
      findings.push(finding('logo.complexity', {detail: `a logo nests at most ${limits.logoMaxDepth} deep`}, {nodeId: current.id}));
    }
    for (const prop of current.props ?? []) {
      if (limits.logoPathDataProps.includes(prop.key) && typeof prop.static_value === 'string') pathData += prop.static_value.length;
      if (current.component === FOREACH && prop.key === FOREACH_ITEMS) {
        const items = demoItems(prop, demo);
        if (items > limits.logoMaxForeachItems) {
          findings.push(
            finding(
              'logo.complexity',
              {detail: `a foreach in a logo draws at most ${limits.logoMaxForeachItems} items, its demo has ${items}`},
              {nodeId: current.id},
            ),
          );
        }
      }
    }
    current.children?.forEach(child => visit(child, depth + 1));
  };
  visit(tree, 1);
  if (nodes > limits.logoMaxNodes) {
    findings.push(finding('logo.complexity', {detail: `a logo has at most ${limits.logoMaxNodes} components, this one ${nodes}`}, {nodeId: tree.id}));
  }
  if (pathData > limits.logoMaxPathData) {
    findings.push(
      finding('logo.complexity', {detail: `a logo holds at most ${limits.logoMaxPathData} characters of path data, this one ${pathData}`}, {nodeId: tree.id}),
    );
  }
  return findings;
};

/**
 * Every finding of `tree` against `scope` and `view`: errors and warnings, in
 * tree order. `view` defaults to the Orkestrator's (base, the standard catalogs
 * and its module); `null` skips every catalog rule.
 */
export const checkBlokTree = (tree: BlokComponentNode, scope: BlokCheckScope, view: BlokView | null = defaultBlokView()): BlokFinding[] => {
  const checker = new Checker(resolveBlokScope(tree, scope, view), view);
  checker.checkDeclarations(tree);
  checker.walk(tree);
  if (drawnIn(scope) === LOGO) checker.findings.push(...checkLogo(tree, scope.demo));
  checker.finish();
  return checker.findings;
};
