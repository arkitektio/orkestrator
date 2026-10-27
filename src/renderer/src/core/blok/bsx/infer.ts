import type {BlokActionArgument, BlokAgentCall, BlokComponentNode, BlokComponentProp} from '../renderer/runtime/types';
import type {BlokView} from '../spec/catalogs';
import {LOCAL_ANY_KIND} from '../spec/vocabulary';
import type {
  BlokCheckScope,
  BlokPortMatch,
  BlokScopeDependency,
  BlokScopeLocal,
  BlokScopeLocalPort,
  ResolvedBlokLocal,
  ResolvedBlokScope,
} from './references';

/**
 * Resolve what a blok leaves to its tree: the kinds of its locals. The port
 * of arkitekt-spec's
 * `declare/blok/infer.py` (`resolve_scope`); the server and takt resolve the
 * same way on save, so a source blok sent without kinds is stored the same
 * everywhere.
 *
 * **A local's kind**, when it is left out (a given kind, `ANY` included, is
 * kept), is the first of:
 * 1. its default: a bool BOOL, an integer INT, any other number FLOAT, a
 *    string STRING, a non-empty list (object) of one scalar kind a LIST (DICT)
 *    of it, its item port keyed `...`;
 * 2. the port of the task argument it is passed to whole, at the first call
 *    in tree order whose arg match has a kind (recursively) and makes a valid local;
 * 3. the bind kind of the first control bound to it whole, when that is
 *    STRING, INT, FLOAT or BOOL;
 * 4. else ANY: an untyped value, never an error.
 *
 * Every field the local sets wins over the inferred type, which only fills
 * what it leaves out; a candidate that makes no valid port is skipped.
 *
 * Nothing else is inferred: every `deps.<key>` a blok reads, whatever its
 * kind, must be declared (`deps.unknown` otherwise, its hint naming the
 * declaration to add).
 */

export const LOCAL_ANY = LOCAL_ANY_KIND;
const ITEM_KEY = '...';
const BIND_PROP = 'bind';
const FOREACH = 'foreach';
const FOREACH_LET = 'let';
const FOREACH_ITEMS = 'items';
/** The bind kinds a local takes from its control; a LIST, DICT or ANY control tells too little. */
const BIND_INFERRED: ReadonlySet<string> = new Set(['STRING', 'INT', 'FLOAT', 'BOOL']);

/** A type a rule infers: a port's kind and what goes with it, without the local's own fields. */
export type InferredType = {
  kind: string;
  identifier?: string | null;
  nullable?: boolean;
  children?: readonly InferredPort[];
};
type InferredPort = InferredType & {key: string};

/** Whether `local` says its kind (`ANY` included), rather than leaving it to the tree. */
export const kindGiven = (local: BlokScopeLocal): boolean => local.kind !== undefined && local.kind !== null;

const scalarKind = (value: unknown): string | null => {
  if (typeof value === 'boolean') return 'BOOL';
  if (typeof value === 'number') return Number.isInteger(value) ? 'INT' : 'FLOAT';
  if (typeof value === 'string') return 'STRING';
  return null;
};

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);

/** The type a default implies (rule 1), or null when it says nothing (null, `[]`, `{}`, mixed items). */
export const defaultType = (value: unknown): InferredType | null => {
  const scalar = scalarKind(value);
  if (scalar !== null) return {kind: scalar};
  const items: readonly unknown[] = Array.isArray(value) ? value : isRecord(value) ? Object.values(value) : [];
  const kinds = new Set(items.map(scalarKind));
  if (kinds.size !== 1 || kinds.has(null)) return null;
  const [itemKind] = [...kinds];
  if (itemKind === null) return null;
  return {kind: Array.isArray(value) ? 'LIST' : 'DICT', children: [{key: ITEM_KEY, kind: itemKind}]};
};

/** The type an arg match says (a kind, recursively for its children), or null when it says too little. */
export const matchType = (match: BlokPortMatch): InferredType | null => {
  if (match.kind == null) return null;
  const typed: InferredType = {kind: match.kind, identifier: match.identifier ?? null, nullable: match.nullable === true};
  if (match.children?.length) {
    const children: InferredPort[] = [];
    for (const child of match.children) {
      const childType = matchType(child);
      if (childType === null || child.key == null) return null;
      children.push({...childType, key: child.key});
    }
    typed.children = children;
  }
  return typed;
};

type PortShape = {
  kind?: string | null;
  identifier?: string | null;
  reference_unit?: string | null;
  children?: readonly PortShape[] | null;
  key?: string | null;
};

/**
 * Whether `port` is a valid port by the spec's `PortRules`: a STRUCTURE names
 * its identifier, a QUANTITY its reference unit, a LIST has exactly one child,
 * a DICT has children, either one keyed `...` or named ones. Recursively.
 */
export const portIsValid = (port: PortShape): boolean => {
  const {kind} = port;
  const children = port.children ?? null;
  if (kind === 'STRUCTURE' && port.identifier == null) return false;
  if (kind === 'QUANTITY' && !port.reference_unit) return false;
  if (kind === 'LIST' && (children === null || children.length !== 1)) return false;
  if (kind === 'DICT') {
    if (!children?.length) return false;
    if (children.length > 1 && children.some(child => child.key === ITEM_KEY)) return false;
  }
  return (children ?? []).every(portIsValid);
};

/** `local`'s own fields: what it sets, never its (left-out) kind. */
const ownFields = (local: BlokScopeLocal): Omit<BlokScopeLocal, 'kind'> => {
  const own: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(local)) if (key !== 'kind' && value !== undefined && value !== null) own[key] = value;
  return own as Omit<BlokScopeLocal, 'kind'>;
};

/** `local` with `typed` filling what it does not say, or null when that makes no valid port. */
export const typedLocal = (local: BlokScopeLocal, typed: InferredType): ResolvedBlokLocal | null => {
  const children: readonly BlokScopeLocalPort[] | undefined = typed.children?.map(toLocalPort);
  const resolved: ResolvedBlokLocal = {
    ...(typed.identifier != null ? {identifier: typed.identifier} : {}),
    ...(typed.nullable !== undefined ? {nullable: typed.nullable} : {}),
    ...(children ? {children} : {}),
    ...ownFields(local),
    kind: typed.kind,
  };
  return portIsValid(resolved) ? resolved : null;
};

const toLocalPort = (port: InferredPort): BlokScopeLocalPort => ({
  key: port.key,
  kind: port.kind,
  ...(port.identifier != null ? {identifier: port.identifier} : {}),
  ...(port.nullable !== undefined ? {nullable: port.nullable} : {}),
  ...(port.children ? {children: port.children.map(toLocalPort)} : {}),
});

/** `local` resolved to ANY. */
export const anyLocal = (local: BlokScopeLocal): ResolvedBlokLocal => ({...ownFields(local), kind: LOCAL_ANY});

/** `local` with its kind resolved by the rules above (a given kind is kept). */
export const resolveLocal = (local: BlokScopeLocal, args: readonly InferredType[], binds: readonly string[]): ResolvedBlokLocal => {
  if (kindGiven(local)) return {...local, kind: local.kind ?? LOCAL_ANY};
  const candidates: InferredType[] = [];
  const fromDefault = defaultType(local.default);
  if (fromDefault !== null) candidates.push(fromDefault);
  candidates.push(...args);
  for (const kind of binds) if (BIND_INFERRED.has(kind)) candidates.push({kind});
  for (const candidate of candidates) {
    const resolved = typedLocal(local, candidate);
    if (resolved !== null) return resolved;
  }
  return anyLocal(local);
};

/* -------------------------------------------------------------------------- */
/* Where a tree uses its locals whole, and which deps it reads (at runtime)   */
/* -------------------------------------------------------------------------- */

const actionKeyFor = (call: BlokAgentCall): string => call.operation.split('.').pop() ?? call.operation;

class Uses {
  readonly args = new Map<string, InferredType[]>();
  readonly binds = new Map<string, string[]>();
  readonly deps = new Set<string>();

  constructor(
    private readonly locals: ReadonlySet<string>,
    private readonly dependencies: ReadonlyMap<string, BlokScopeDependency>,
    private readonly view: BlokView | null,
  ) {}

  read(path: string): void {
    const parts = path.split('.');
    if (parts[0] === 'deps' && parts.length > 1) this.deps.add(parts[1]);
  }

  walk(tree: BlokComponentNode): void {
    const scope = new Set<string>();
    const intoNames = (node: BlokComponentNode): void => {
      for (const prop of node.props ?? []) if (prop.agent_call && prop.declares_value) scope.add(prop.declares_value);
      node.children?.forEach(intoNames);
    };
    intoNames(tree);
    this.node(tree, scope);
  }

  private node(node: BlokComponentNode, scope: ReadonlySet<string>): void {
    this.component(node, scope);
    const declared =
      node.component === FOREACH ? node.props?.find(prop => prop.key === FOREACH_LET && prop.declares_value)?.declares_value ?? null : null;
    const inner = declared !== null ? new Set([...scope, declared]) : scope;
    for (const prop of node.props ?? []) this.prop(prop, declared !== null && prop.key === FOREACH_ITEMS ? scope : inner);
    for (const child of node.children ?? []) this.node(child, inner);
  }

  private component(node: BlokComponentNode, scope: ReadonlySet<string>): void {
    const bind = this.view?.components.get(node.component)?.props.find(prop => prop.key === BIND_PROP);
    if (!bind) return;
    for (const prop of node.props ?? []) {
      const path = prop.key === BIND_PROP ? prop.dynamic_value?.path ?? null : null;
      if (path !== null && this.locals.has(path) && !scope.has(path)) {
        const binds = this.binds.get(path) ?? [];
        binds.push(bind.kind);
        this.binds.set(path, binds);
      }
    }
  }

  private prop(prop: BlokComponentProp, scope: ReadonlySet<string>): void {
    const path = prop.dynamic_value?.path;
    if (path != null) this.path(path, scope);
    if (prop.agent_call) this.agentCall(prop.agent_call, scope);
    if (prop.util_call) prop.util_call.arguments?.forEach(argument => this.argument(argument, scope));
  }

  private path(path: string, scope: ReadonlySet<string>): void {
    if (!scope.has(path.split('.')[0])) this.read(path);
  }

  private argument(argument: BlokActionArgument, scope: ReadonlySet<string>): void {
    if (argument.value_path != null) this.path(argument.value_path, scope);
    if (argument.agent_call) this.agentCall(argument.agent_call, scope);
    if (argument.util_call) argument.util_call.arguments?.forEach(nested => this.argument(nested, scope));
    [...(argument.value_list ?? []), ...(argument.value_dict ?? [])].forEach(nested => this.argument(nested, scope));
  }

  private agentCall(call: BlokAgentCall, scope: ReadonlySet<string>): void {
    if (call.dependency !== 'self') this.deps.add(call.dependency);
    const action = actionKeyFor(call);
    const demand = this.dependencies.get(call.dependency)?.action_dependencies?.find(each => each.key === action)?.demand;
    const matches = new Map((demand?.arg_matches ?? []).flatMap(match => (match.key != null ? [[match.key, match] as const] : [])));
    for (const argument of call.arguments ?? []) {
      const path = argument.value_path;
      if (path != null && this.locals.has(path) && !scope.has(path) && argument.key != null) {
        const match = matches.get(argument.key);
        const typed = match ? matchType(match) : null;
        if (typed !== null) {
          const found = this.args.get(path) ?? [];
          found.push(typed);
          this.args.set(path, found);
        }
      }
      this.argument(argument, scope);
    }
  }
}

/** Every path a list of arguments reads (a query's variables). */
const argumentPaths = (args: readonly BlokActionArgument[]): string[] => {
  const paths: string[] = [];
  const visit = (argument: BlokActionArgument): void => {
    if (argument.value_path != null) paths.push(argument.value_path);
    for (const call of [argument.util_call, argument.agent_call]) call?.arguments?.forEach(visit);
    [...(argument.value_list ?? []), ...(argument.value_dict ?? [])].forEach(visit);
  };
  args.forEach(visit);
  return paths;
};

/**
 * Every dependency key a tree (and its reads' variables) reads or calls,
 * `self` aside, sorted: what a host checks against the agents it bound
 * (one it did not bind reads as failed, `deps.unbound`).
 */
export const dependencyKeysRead = (roots: readonly BlokComponentNode[], variables: readonly BlokActionArgument[] = []): string[] => {
  const uses = new Uses(new Set(), new Map(), null);
  roots.forEach(root => uses.walk(root));
  argumentPaths(variables).forEach(path => uses.read(path));
  return [...uses.deps].filter(key => key !== 'self').sort();
};

/**
 * `scope` with what `tree` tells: each local's kind (its dependencies stay as
 * declared). Resolving a resolved scope changes nothing.
 */
export const resolveBlokScope = (tree: BlokComponentNode, scope: BlokCheckScope, view: BlokView | null): ResolvedBlokScope => {
  const uses = new Uses(
    new Set(scope.locals.map(local => local.key)),
    new Map(scope.dependencies.map(dependency => [dependency.key, dependency])),
    view,
  );
  uses.walk(tree);
  const locals = scope.locals.map(local => resolveLocal(local, uses.args.get(local.key) ?? [], uses.binds.get(local.key) ?? []));
  return {...scope, locals};
};
