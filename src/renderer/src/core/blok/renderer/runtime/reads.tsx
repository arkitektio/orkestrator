import * as React from 'react';
import {parse, type OperationDefinitionNode} from 'graphql';
import {describeError} from '@/core/notify';
import {useBlokRuntimeStoreApi} from './context';
import {useResolvedArguments} from './hooks';
import type {BlokSourceStatus} from './status';
import type {BlokActionArgument} from './types';

/**
 * The read side of a blok (CQRS): its declared `queries` and `subscriptions`
 * (vocabulary `records.query` / `records.subscription`), run here and written
 * into the data model as records the tree reads:
 *
 * - `queries.<name>`: `{status, value, error, refetching, fetching_more}`;
 * - `subscriptions.<name>`: `{status, value, error}`, `value` the latest
 *   payload or the last `keep` payloads.
 *
 * Their values carry their status (`queries.<name>.value` is pending until the
 * first answer, failed on an error); the record's own fields never suspend.
 * Variables are reactive: a change in what they read re-runs the query, or
 * re-subscribes the subscription. A refetch (`query.refetch`) keeps showing
 * the last answer (stale-while-revalidate) with `refetching` set; a
 * `query.fetch_more` reads the next page, its variables overridden, and
 * appends the page's list at the query's `more` path, `fetching_more` set.
 *
 * Reads only: a query document must hold one `query`, a subscription's one
 * `subscription`; anything else (above all a mutation) fails without being sent.
 *
 * While the blok shows the past (`then` set), a query reads the moment only
 * through its declared variables (`variables={at: then}`); one whose
 * variables do not read `then` shows current data, stale. A subscription
 * pauses: it shows its `history` query (which reads `then` itself) when it
 * names one, else what it showed at travel start, stale.
 */

export type BlokQuery = {
  key: string;
  service: string;
  document: string;
  variables?: readonly BlokActionArgument[] | null;
  poll?: number | null;
  /** The list field (a dotted path into the data) `query.fetch_more` appends new pages to. */
  more?: string | null;
};

export type BlokSubscription = {
  key: string;
  service: string;
  document: string;
  variables?: readonly BlokActionArgument[] | null;
  keep?: number | null;
  history?: string | null;
};

export type BlokReadSink = {
  next: (data: Record<string, unknown>) => void;
  error: (error: unknown) => void;
  complete: () => void;
};

/** How a host runs a declared read on a service. */
export type BlokReadExecutor = {
  query: (
    service: string,
    document: string,
    variables: Record<string, unknown>,
    signal: AbortSignal,
  ) => Promise<Record<string, unknown>>;
  subscribe: (service: string, document: string, variables: Record<string, unknown>, sink: BlokReadSink) => () => void;
};

export type BlokQueryRecord = {
  status: BlokSourceStatus['status'];
  value: unknown;
  error: string | null;
  refetching: boolean;
  /** True while `query.fetch_more` runs; the pages already shown stay. */
  fetching_more: boolean;
};

export type BlokSubscriptionRecord = {
  status: BlokSourceStatus['status'];
  value: unknown;
  error: string | null;
};

export const QUERIES_ROOT = 'queries';
export const SUBSCRIPTIONS_ROOT = 'subscriptions';

const operationProblem = (document: string, kind: 'query' | 'subscription'): string | null => {
  let operations: OperationDefinitionNode[];
  try {
    operations = parse(document).definitions.filter(
      (definition): definition is OperationDefinitionNode => definition.kind === 'OperationDefinition',
    );
  } catch {
    return 'The document is not valid GraphQL.';
  }
  if (operations.some(operation => operation.operation === 'mutation')) {
    return 'A blok reads, it never runs a mutation: a change goes through a task.';
  }
  if (operations.length !== 1 || operations[0].operation !== kind) return `The document must hold exactly one ${kind}.`;
  return null;
};

/** Why a declared query cannot run, or null: it must be one `query`. */
export const queryProblem = (document: string): string | null => operationProblem(document, 'query');
/** Why a declared subscription cannot run, or null: it must be one `subscription`. */
export const subscriptionProblem = (document: string): string | null => operationProblem(document, 'subscription');

/** A value as a variable: a structure reference is known to its service by its id. */
const asVariable = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(asVariable);
  if (value !== null && typeof value === 'object' && 'object' in value && typeof (value as {object: unknown}).object === 'string') {
    return (value as {object: string}).object;
  }
  return value ?? null;
};

const asVariables = (values: Record<string, unknown>): Record<string, unknown> =>
  Object.fromEntries(Object.entries(values).map(([key, value]) => [key, asVariable(value)]));

const valuePath = (root: string, key: string) => `${root}.${key}.value`;

const THEN = 'then';

/** Whether a stored argument reads `then` anywhere (a path under it, or inside a call's arguments). */
const argumentReadsThen = (argument: BlokActionArgument): boolean => {
  const path = argument.value_path;
  if (typeof path === 'string' && (path === THEN || path.startsWith(`${THEN}.`))) return true;
  const nested = [
    ...(argument.util_call?.arguments ?? []),
    ...(argument.agent_call?.arguments ?? []),
    ...(argument.value_list ?? []),
    ...(argument.value_dict ?? []),
  ];
  return nested.some(argumentReadsThen);
};

/** Whether a declared read passes `then` through its variables: only then can it ask for the past. */
export const readsThen = (variables: readonly BlokActionArgument[] | null | undefined): boolean =>
  (variables ?? []).some(argumentReadsThen);

const isPlainRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const valueAt = (data: unknown, path: readonly string[]): unknown =>
  path.reduce<unknown>((current, segment) => (isPlainRecord(current) ? current[segment] : undefined), data);

const withValueAt = (data: Record<string, unknown>, path: readonly string[], value: unknown): Record<string, unknown> => {
  const [head, ...rest] = path;
  if (head === undefined) return data;
  const child = data[head];
  return {...data, [head]: rest.length === 0 ? value : withValueAt(isPlainRecord(child) ? child : {}, rest, value)};
};

/**
 * The shown answer with a new page merged in: the page's list at `more` (a
 * dotted path into the data) appended to the shown one; everything else of
 * the page (a cursor, a total) replaces the shown fields. Null when the page
 * holds no list there.
 */
export const mergePage = (shown: unknown, page: Record<string, unknown>, more: string): Record<string, unknown> | null => {
  const path = more.split('.').filter(Boolean);
  const added = valueAt(page, path);
  if (!Array.isArray(added)) return null;
  const before = valueAt(shown, path);
  const base = isPlainRecord(shown) ? {...shown, ...page} : {...page};
  return withValueAt(base, path, [...(Array.isArray(before) ? before : []), ...added]);
};

/** What the read runner takes from a callback: `query.refetch` and `query.fetch_more`. */
export type BlokQueryControls = {
  refetch: () => void;
  fetchMore: (variables: Record<string, unknown>) => void;
};

/* -------------------------------------------------------------------------- */
/* Queries                                                                    */
/* -------------------------------------------------------------------------- */

const IDLE_QUERY: BlokQueryRecord = {status: 'pending', value: null, error: null, refetching: false, fetching_more: false};

const QueryRunner = ({
  query,
  executor,
  register,
}: {
  query: BlokQuery;
  executor: BlokReadExecutor;
  register: (key: string, controls: BlokQueryControls | null) => void;
}) => {
  const store = useBlokRuntimeStoreApi();
  const resolved = useResolvedArguments(query.variables ?? null);
  const travelling = React.useSyncExternalStore(
    store.subscribe,
    () => store.getState().travelAt !== null,
    () => store.getState().travelAt !== null,
  );
  const [tick, setTick] = React.useState(0);
  const recordRef = React.useRef<BlokQueryRecord>(IDLE_QUERY);
  // Bumped by every full (re)run: a page fetched for older variables is dropped.
  const generationRef = React.useRef(0);

  const variablesReady = resolved.status.status !== 'pending' && resolved.status.status !== 'failed';
  const variables = React.useMemo(() => asVariables(resolved.values), [resolved.values]);
  const variablesKey = JSON.stringify(variables);
  // A query whose variables do not read `then` cannot ask for the past: it shows current data, stale.
  const currentOnly = travelling && !readsThen(query.variables);

  const write = React.useCallback(
    (record: BlokQueryRecord) => {
      recordRef.current = record;
      const state = store.getState();
      state.setRuntimeValue(`${QUERIES_ROOT}.${query.key}`, record);
      state.setStatus(valuePath(QUERIES_ROOT, query.key), {status: record.status, error: record.error});
    },
    [query.key, store],
  );

  const fetchMore = React.useCallback(
    (overrides: Record<string, unknown>) => {
      const more = query.more;
      const shown = recordRef.current;
      if (!more) {
        console.warn(`query ${query.key} declares no more, so it cannot fetch more`);
        return;
      }
      if (shown.fetching_more || (shown.status !== 'ready' && shown.status !== 'stale')) return;
      const generation = generationRef.current;
      write({...shown, fetching_more: true});
      const pageVariables = {...(JSON.parse(variablesKey) as Record<string, unknown>), ...asVariables(overrides)};
      const controller = new AbortController();
      executor.query(query.service, query.document, pageVariables, controller.signal).then(
        page => {
          if (generation !== generationRef.current) return;
          const current = recordRef.current;
          const merged = mergePage(current.value, page, more);
          if (merged === null) {
            write({...current, fetching_more: false, error: `The page holds no list at ${more}.`});
            return;
          }
          write({...current, value: merged, error: null, fetching_more: false});
        },
        (error: unknown) => {
          if (generation !== generationRef.current) return;
          // The pages already shown stay.
          write({...recordRef.current, fetching_more: false, error: describeError(error).message});
        },
      );
    },
    [executor, query.document, query.key, query.more, query.service, variablesKey, write],
  );

  React.useEffect(() => {
    register(query.key, {refetch: () => setTick(value => value + 1), fetchMore});
    return () => register(query.key, null);
  }, [fetchMore, query.key, register]);

  React.useEffect(() => {
    generationRef.current += 1;
    const problem = queryProblem(query.document);
    if (problem) {
      write({...IDLE_QUERY, status: 'failed', error: problem});
      return;
    }
    if (resolved.status.status === 'failed') {
      write({...IDLE_QUERY, status: 'failed', error: resolved.status.error ?? 'A variable cannot be known.'});
      return;
    }
    if (!variablesReady) {
      write({...recordRef.current, status: recordRef.current.value === null ? 'pending' : recordRef.current.status});
      return;
    }
    const controller = new AbortController();
    const previous = recordRef.current;
    const hasAnswer = previous.status === 'ready' || previous.status === 'stale';
    // A refetch, or new variables over an answer, never suspends: the last answer shows meanwhile.
    write(hasAnswer ? {...previous, refetching: true, fetching_more: false} : IDLE_QUERY);
    executor.query(query.service, query.document, JSON.parse(variablesKey) as Record<string, unknown>, controller.signal).then(
      data => {
        if (controller.signal.aborted) return;
        write({status: currentOnly ? 'stale' : 'ready', value: data, error: null, refetching: false, fetching_more: false});
      },
      (error: unknown) => {
        if (controller.signal.aborted) return;
        write({...IDLE_QUERY, status: 'failed', error: describeError(error).message});
      },
    );
    return () => controller.abort();
  }, [currentOnly, executor, query.document, query.service, resolved.status, tick, variablesKey, variablesReady, write]);

  React.useEffect(() => {
    if (!query.poll || query.poll <= 0) return;
    const timer = setInterval(() => setTick(value => value + 1), query.poll * 1000);
    return () => clearInterval(timer);
  }, [query.poll]);

  return null;
};

/* -------------------------------------------------------------------------- */
/* Subscriptions                                                              */
/* -------------------------------------------------------------------------- */

const RESUBSCRIBE_MS = 3000;

const SubscriptionRunner = ({subscription, executor}: {subscription: BlokSubscription; executor: BlokReadExecutor}) => {
  const store = useBlokRuntimeStoreApi();
  const resolved = useResolvedArguments(subscription.variables ?? null);
  const travelAt = React.useSyncExternalStore(
    store.subscribe,
    () => store.getState().travelAt,
    () => store.getState().travelAt,
  );
  const history = React.useSyncExternalStore(
    store.subscribe,
    () => (subscription.history ? (store.getState().dataModel as Record<string, Record<string, unknown> | undefined> | null)?.[QUERIES_ROOT]?.[subscription.history] : undefined),
    () => undefined,
  );
  const [attempt, setAttempt] = React.useState(0);
  const recordRef = React.useRef<BlokSubscriptionRecord>({status: 'pending', value: null, error: null});
  const variablesKey = JSON.stringify(asVariables(resolved.values));
  const variablesReady = resolved.status.status !== 'pending' && resolved.status.status !== 'failed';

  const write = React.useCallback(
    (record: BlokSubscriptionRecord) => {
      recordRef.current = record;
      const state = store.getState();
      state.setRuntimeValue(`${SUBSCRIPTIONS_ROOT}.${subscription.key}`, record);
      state.setStatus(valuePath(SUBSCRIPTIONS_ROOT, subscription.key), {status: record.status, error: record.error});
    },
    [store, subscription.key],
  );

  React.useEffect(() => {
    if (travelAt === null) return;
    // No live stream in the past: replayed from its history query, else what it showed, stale.
    if (subscription.history && history && typeof history === 'object') {
      const replay = history as Partial<BlokQueryRecord>;
      write({status: replay.status ?? 'pending', value: replay.value ?? null, error: replay.error ?? null});
      return;
    }
    write({...recordRef.current, status: recordRef.current.status === 'pending' ? 'pending' : 'stale'});
  }, [history, subscription.history, travelAt, write]);

  React.useEffect(() => {
    if (travelAt !== null) return;
    const problem = subscriptionProblem(subscription.document);
    if (problem) {
      write({status: 'failed', value: null, error: problem});
      return;
    }
    if (!variablesReady) return;
    const keep = subscription.keep && subscription.keep > 0 ? subscription.keep : null;
    let live = true;
    let retry: ReturnType<typeof setTimeout> | undefined;
    const dropped = (error: string | null) => {
      if (!live) return;
      const last = recordRef.current;
      // The stream dropped: the last payload stays, stale, and it is resumed.
      write(last.status === 'pending' ? {status: error ? 'failed' : 'pending', value: null, error} : {...last, status: 'stale', error});
      retry = setTimeout(() => setAttempt(value => value + 1), RESUBSCRIBE_MS);
    };
    const unsubscribe = executor.subscribe(subscription.service, subscription.document, JSON.parse(variablesKey) as Record<string, unknown>, {
      next: data => {
        if (!live) return;
        const previous = recordRef.current.value;
        const value = keep ? [...(Array.isArray(previous) ? previous : []), data].slice(-keep) : data;
        write({status: 'ready', value, error: null});
      },
      error: error => dropped(describeError(error).message),
      complete: () => dropped(null),
    });
    return () => {
      live = false;
      if (retry !== undefined) clearTimeout(retry);
      unsubscribe();
    };
  }, [attempt, executor, subscription.document, subscription.keep, subscription.service, travelAt, variablesKey, variablesReady, write]);

  return null;
};

/* -------------------------------------------------------------------------- */
/* The runner                                                                 */
/* -------------------------------------------------------------------------- */

/** The records a blok's reads start as, before anything ran: pending. */
export const pendingReads = (
  queries: readonly BlokQuery[],
  subscriptions: readonly BlokSubscription[],
): {data: Record<string, unknown>; statuses: Record<string, BlokSourceStatus>} => {
  const data: Record<string, unknown> = {};
  const statuses: Record<string, BlokSourceStatus> = {};
  if (queries.length) {
    data[QUERIES_ROOT] = Object.fromEntries(
      queries.map(query => [query.key, {...IDLE_QUERY} satisfies BlokQueryRecord]),
    );
    queries.forEach(query => (statuses[valuePath(QUERIES_ROOT, query.key)] = {status: 'pending'}));
  }
  if (subscriptions.length) {
    data[SUBSCRIPTIONS_ROOT] = Object.fromEntries(
      subscriptions.map(subscription => [subscription.key, {status: 'pending', value: null, error: null} satisfies BlokSubscriptionRecord]),
    );
    subscriptions.forEach(subscription => (statuses[valuePath(SUBSCRIPTIONS_ROOT, subscription.key)] = {status: 'pending'}));
  }
  return {data, statuses};
};

/** Runs a blok's declared queries and subscriptions inside its runtime, and takes `query.refetch` / `query.fetch_more`. */
export const BlokReads = ({
  queries,
  subscriptions,
  executor,
}: {
  queries: readonly BlokQuery[];
  subscriptions: readonly BlokSubscription[];
  executor: BlokReadExecutor;
}) => {
  const store = useBlokRuntimeStoreApi();
  const controls = React.useRef(new Map<string, BlokQueryControls>());
  const register = React.useCallback((key: string, control: BlokQueryControls | null) => {
    if (control) controls.current.set(key, control);
    else controls.current.delete(key);
  }, []);

  React.useEffect(() => {
    const state = store.getState();
    state.setRefetchQuery(name => controls.current.get(name)?.refetch());
    state.setFetchMoreQuery((name, variables) => controls.current.get(name)?.fetchMore(variables));
    return () => {
      store.getState().setRefetchQuery(undefined);
      store.getState().setFetchMoreQuery(undefined);
    };
  }, [store]);

  return (
    <>
      {queries.map(query => (
        <QueryRunner key={query.key} query={query} executor={executor} register={register} />
      ))}
      {subscriptions.map(subscription => (
        <SubscriptionRunner key={subscription.key} subscription={subscription} executor={executor} />
      ))}
    </>
  );
};
