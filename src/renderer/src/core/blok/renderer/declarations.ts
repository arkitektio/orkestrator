import {resolveBlokScope} from '../bsx/infer';
import {emptyBlokScope, type BlokScopeLocal} from '../bsx/references';
import {defaultBlokView} from '../spec/catalogs';
import {LOCAL_ANY_KIND} from '../spec/vocabulary';
import type {BlokLocal, BlokLocalChoice, BlokLocalPort} from './persist';
import {
  idleTaskRecord,
  normalizeBlokArgument,
  pendingReads,
  type BlokActionArgument,
  type BlokComponentNode,
  type BlokQuery,
  type BlokQueryRecord,
  type BlokSourceStatus,
  type BlokSubscription,
  type BlokSubscriptionRecord,
  type BlokTaskRecord,
} from './runtime';

/**
 * What a v2 blok declares beside its tree, as a host gets it from the server
 * (`Blok`/`BlokRevision`: `vocab`, `resolvedLocals`, `demo`, `queries`,
 * `subscriptions`), and the data model a renderer starts from.
 *
 * The roots a blok reads (vocabulary `roots.data`) are laid out as:
 *
 *     {
 *       deps: {<key>: {<state>: ..., tasks: {<action>: TaskRecord}, assets: {...}, id, name}},
 *       args: {...}, task: TaskRecord, viewer: {...}, then: null | "...",
 *       queries: {<name>: {status, value, error, refetching, fetching_more}},
 *       subscriptions: {<name>: {status, value, error}},
 *       <local>: value, <into name>: TaskRecord,
 *     }
 *
 * `self` reads `deps.self`.
 */

/**
 * A local as its tree resolves it (`resolvedLocals`): an arg port (`ArgPort`
 * fields) plus `persist`, its kind always said (inferred where the blok left
 * it out, ANY when nothing tells). A renderer never types a local with the
 * as-written `locals`, whose kind may be missing.
 */
export type BlokDeclaredLocal = {
  key: string;
  kind: string;
  identifier?: string | null;
  nullable?: boolean | null;
  default?: unknown;
  children?: readonly BlokDeclaredLocalPort[] | null;
  choices?: readonly BlokLocalChoice[] | null;
  label?: string | null;
  description?: string | null;
  persist?: boolean | null;
};

/** A child port of a local (a list's item, a dict's or model's fields). */
export type BlokDeclaredLocalPort = Omit<BlokDeclaredLocal, 'persist'>;

export type BlokDeclaredRead = {
  key: string;
  service: string;
  document: string;
  /** Stored call arguments, as the wire carries them (camelCase or snake_case). */
  variables?: unknown;
  poll?: number | null;
  /** A query's list field that `fetch_more` appends to (a dotted path). */
  more?: string | null;
  keep?: number | null;
  history?: string | null;
};

export type BlokDeclarations = {
  vocab?: number | null;
  /** The locals as the tree resolves them: what the renderer types them with. */
  resolvedLocals: readonly BlokDeclaredLocal[];
  demo?: unknown;
  queries?: readonly BlokDeclaredRead[] | null;
  subscriptions?: readonly BlokDeclaredRead[] | null;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const variablesOf = (raw: unknown): BlokActionArgument[] =>
  (Array.isArray(raw) ? raw : []).map(argument => normalizeBlokArgument(argument) as BlokActionArgument);

const localPort = (port: BlokDeclaredLocalPort): BlokLocalPort => ({
  key: port.key,
  kind: port.kind,
  identifier: port.identifier ?? null,
  nullable: port.nullable ?? false,
  default: port.default ?? null,
  children: port.children ? port.children.map(localPort) : null,
  choices: port.choices ?? null,
  label: port.label ?? null,
  description: port.description ?? null,
});

export const declaredLocals = (declarations: BlokDeclarations): BlokLocal[] =>
  declarations.resolvedLocals.map(local => ({...localPort(local), persist: local.persist === true}));

export const declaredQueries = (declarations: BlokDeclarations): BlokQuery[] =>
  (declarations.queries ?? []).map(query => ({
    key: query.key,
    service: query.service,
    document: query.document,
    variables: variablesOf(query.variables),
    poll: query.poll ?? null,
    more: query.more ?? null,
  }));

export const declaredSubscriptions = (declarations: BlokDeclarations): BlokSubscription[] =>
  (declarations.subscriptions ?? []).map(subscription => ({
    key: subscription.key,
    service: subscription.service,
    document: subscription.document,
    variables: variablesOf(subscription.variables),
    keep: subscription.keep ?? null,
    history: subscription.history ?? null,
  }));

/** Each declared local at its default. */
export const localsModel = (locals: readonly BlokLocal[]): Record<string, unknown> =>
  Object.fromEntries(locals.map(local => [local.key, local.default ?? null]));

/** The names `into` gives a task call's record, in the tree. */
export const intoNames = (roots: ReadonlyArray<unknown>): string[] => {
  const names = new Set<string>();
  const visit = (node: unknown) => {
    if (!isRecord(node)) return;
    const typed = node as Partial<BlokComponentNode>;
    for (const prop of typed.props ?? []) {
      if (prop.agent_call && prop.declares_value) names.add(prop.declares_value);
    }
    (typed.children ?? []).forEach(visit);
  };
  roots.forEach(visit);
  return [...names];
};

/** Every `into` record before its call ran: idle. */
export const intoModel = (roots: ReadonlyArray<unknown>): Record<string, BlokTaskRecord> =>
  Object.fromEntries(intoNames(roots).map(name => [name, idleTaskRecord()]));

/** What a renderer shows live before anything synced: locals, idle `into` records, pending reads. */
export const liveModel = (
  roots: ReadonlyArray<unknown>,
  declarations: BlokDeclarations,
): {data: Record<string, unknown>; statuses: Record<string, BlokSourceStatus>} => {
  const reads = pendingReads(declaredQueries(declarations), declaredSubscriptions(declarations));
  return {
    data: {...localsModel(declaredLocals(declarations)), ...intoModel(roots), ...reads.data},
    statuses: reads.statuses,
  };
};

/**
 * What a preview renders: the blok's `demo`, mirroring the roots
 * (`{deps, args, task, queries, subscriptions}`), with every declared read
 * answered by its demo value. Nothing is pending in a preview.
 */
export const demoModel = (roots: ReadonlyArray<unknown>, declarations: BlokDeclarations): Record<string, unknown> => {
  const demo = isRecord(declarations.demo) ? declarations.demo : {};
  const demoQueries = isRecord(demo.queries) ? demo.queries : {};
  const demoSubscriptions = isRecord(demo.subscriptions) ? demo.subscriptions : {};
  const queries = Object.fromEntries(
    declaredQueries(declarations).map(query => [
      query.key,
      {status: 'ready', value: demoQueries[query.key] ?? null, error: null, refetching: false, fetching_more: false} satisfies BlokQueryRecord,
    ]),
  );
  const subscriptions = Object.fromEntries(
    declaredSubscriptions(declarations).map(subscription => [
      subscription.key,
      {status: 'ready', value: demoSubscriptions[subscription.key] ?? null, error: null} satisfies BlokSubscriptionRecord,
    ]),
  );
  const task = isRecord(demo.task) ? {...idleTaskRecord(), ...demo.task} : undefined;
  return {
    ...localsModel(declaredLocals(declarations)),
    ...intoModel(roots),
    deps: isRecord(demo.deps) ? demo.deps : {},
    args: isRecord(demo.args) ? demo.args : {},
    ...(task ? {task} : {}),
    ...(Object.keys(queries).length ? {queries} : {}),
    ...(Object.keys(subscriptions).length ? {subscriptions} : {}),
  };
};

/**
 * What a service serves of a blok's declarations as JSON (kabinet's `locals`,
 * `queries`, ...: snake_case values). Its `locals` are as the app wrote them
 * (a kind may be left out), so they are resolved here against its tree.
 */
export type BlokDeclarationsJson = {
  vocab?: number | null;
  componentTree?: unknown;
  locals?: unknown;
  demo?: unknown;
  queries?: unknown;
  subscriptions?: unknown;
};

const optionalNumber = (value: unknown): number | null => (typeof value === 'number' ? value : null);
const optionalString = (value: unknown): string | null => (typeof value === 'string' ? value : null);

const jsonChoices = (raw: unknown): BlokLocalChoice[] | null =>
  Array.isArray(raw)
    ? raw.filter(isRecord).map(choice => ({value: choice.value ?? null, label: optionalString(choice.label), description: optionalString(choice.description)}))
    : null;

/** A port from JSON; a child without a key or kind is dropped. */
const jsonLocalPort = (port: Record<string, unknown>): BlokDeclaredLocalPort | null =>
  typeof port.kind === 'string' ? jsonLocalWritten(port, port.kind) : null;

/** A port from JSON with `kind` as given; null without a key. */
const jsonLocalWritten = <Kind extends string | null>(port: Record<string, unknown>, kind: Kind): (Omit<BlokDeclaredLocalPort, 'kind'> & {kind: Kind}) | null =>
  typeof port.key === 'string'
    ? {
        key: port.key,
        kind,
        identifier: optionalString(port.identifier),
        nullable: port.nullable === true,
        default: port.default ?? null,
        children: Array.isArray(port.children)
          ? port.children.filter(isRecord).flatMap(child => {
              const parsed = jsonLocalPort(child);
              return parsed ? [parsed] : [];
            })
          : null,
        choices: jsonChoices(port.choices),
        label: optionalString(port.label),
        description: optionalString(port.description),
      }
    : null;

/** Locals from JSON as written (snake_case port fields plus `persist`, a kind maybe left out); one without a key is dropped. */
const jsonLocals = (raw: unknown): BlokScopeLocal[] =>
  (Array.isArray(raw) ? raw : []).filter(isRecord).flatMap(local => {
    const port = jsonLocalWritten(local, typeof local.kind === 'string' ? local.kind : null);
    return port ? [{...port, persist: local.persist === true}] : [];
  });

const jsonRoots = (raw: unknown): BlokComponentNode[] =>
  (Array.isArray(raw) ? raw : [raw]).filter((node): node is BlokComponentNode => isRecord(node) && typeof node.component === 'string');

/**
 * Locals as written, resolved against the tree the way the spec and the
 * server resolve them (`resolveBlokScope`: default, task argument, bind, else
 * ANY); a given kind is kept.
 */
export const resolveWrittenLocals = (roots: readonly BlokComponentNode[], locals: readonly BlokScopeLocal[]): BlokDeclaredLocal[] => {
  if (!locals.length) return [];
  const [root] = roots;
  if (!root || roots.length !== 1) return locals.map(local => ({...local, kind: local.kind ?? LOCAL_ANY_KIND}));
  return resolveBlokScope(root, {...emptyBlokScope(), locals}, defaultBlokView()).locals.map(local => ({...local}));
};

const jsonReads = (raw: unknown): BlokDeclaredRead[] =>
  (Array.isArray(raw) ? raw : []).filter(isRecord).flatMap(read =>
    typeof read.key === 'string' && typeof read.service === 'string' && typeof read.document === 'string'
      ? [
          {
            key: read.key,
            service: read.service,
            document: read.document,
            variables: read.variables,
            poll: optionalNumber(read.poll),
            more: optionalString(read.more),
            keep: optionalNumber(read.keep),
            history: optionalString(read.history),
          },
        ]
      : [],
  );

/** A blok's declarations from JSON a service serves, keeping only well-formed entries. */
export const parseBlokDeclarations = (raw: BlokDeclarationsJson): BlokDeclarations => ({
  vocab: raw.vocab ?? null,
  resolvedLocals: resolveWrittenLocals(jsonRoots(raw.componentTree), jsonLocals(raw.locals)),
  demo: raw.demo ?? null,
  queries: jsonReads(raw.queries),
  subscriptions: jsonReads(raw.subscriptions),
});
